-- ============================================================
-- MIGRAZIONE 12 — Quota mensile (non più a vita) + 4° piano "Oro"
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Serve per sapere da quando conta il "mese" corrente di ogni maestro,
-- così il limite di partite si azzera ad ogni rinnovo invece di
-- accumularsi per sempre.
alter table coaches add column if not exists current_period_start timestamptz;

-- Rinomina il vecchio piano "pro" (illimitato) in "oro": da ora "pro" è
-- il nuovo piano da 50 partite/mese. Se avevi già maestri abbonati al
-- vecchio "pro" illimitato, questa riga li sposta correttamente su "oro"
-- SENZA cambiare nulla sul loro abbonamento Stripe (serve comunque
-- aggiornare l'abbonamento Stripe stesso lato Dashboard/Price ID se vuoi
-- che il nome coincida anche lì — non obbligatorio per il funzionamento).
update coaches set plan_tier = 'oro' where plan_tier = 'pro' and match_quota is null;

-- Corregge il trigger: ora conta solo le partite registrate DA QUANDO è
-- iniziato il periodo di fatturazione corrente (current_period_start),
-- non più tutte quelle di sempre. Se current_period_start non è ancora
-- valorizzato per qualche maestro (account vecchio), il controllo non
-- blocca nulla per sicurezza, in attesa che venga sincronizzato.
create or replace function check_match_quota()
returns trigger as $$
declare
  quota int;
  period_start timestamptz;
  current_count int;
begin
  select match_quota, current_period_start into quota, period_start
  from coaches where id = new.coach_id;

  if quota is not null then
    if period_start is null then
      -- Non sappiamo ancora da quando parte il mese corrente: non blocchiamo,
      -- ma logicamente equivale a "conta zero" finché non si sincronizza.
      current_count := 0;
    else
      select count(*) into current_count from matches
      where coach_id = new.coach_id and created_at >= period_start;
    end if;

    if current_count >= quota then
      raise exception 'MATCH_QUOTA_EXCEEDED: limite di % partite del tuo pacchetto raggiunto per questo mese', quota;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

-- Il trigger esiste già (trg_check_match_quota): non va ricreato, la
-- CREATE OR REPLACE FUNCTION sopra ne aggiorna già il comportamento.
