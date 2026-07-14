-- ============================================================
-- MIGRAZIONE 11 — Passaggio da "quota allievi" a "quota partite"
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Nuova colonna: numero massimo di PARTITE registrabili per il piano.
-- NULL = illimitato (piano Pro). athlete_quota resta in tabella (non la
-- usiamo più per bloccare nulla, ma non serve cancellarla: è innocua).
alter table coaches add column if not exists match_quota int;

-- Applica automaticamente le nuove soglie ai maestri già abbonati, in
-- base al loro plan_tier attuale (se hai già dei clienti reali, aggiorna
-- prima anche plan_tier con i nuovi id p01/p02/p03 — vedi nota sotto).
update coaches set match_quota = 10 where plan_tier = 'basic20';
update coaches set match_quota = 30 where plan_tier = 'plus50';
update coaches set match_quota = null where plan_tier = 'pro100';

-- Rinomina i vecchi ID di piano nei nuovi (solo se avevi già abbonati con
-- i vecchi nomi basic20/plus50/pro100 — altrimenti queste righe non
-- toccano nulla).
update coaches set plan_tier = 'base10' where plan_tier = 'basic20';
update coaches set plan_tier = 'plus30' where plan_tier = 'plus50';
update coaches set plan_tier = 'pro' where plan_tier = 'pro100';

-- ------------------------------------------------------------
-- Trigger di sicurezza: blocca l'inserimento di una nuova partita se il
-- maestro ha già raggiunto il limite del suo piano. Funziona SEMPRE,
-- indipendentemente da dove arriva la richiesta (browser, API, ecc.) —
-- è la vera barriera, non solo un controllo "gentile" nell'interfaccia.
-- ------------------------------------------------------------
create or replace function check_match_quota()
returns trigger as $$
declare
  quota int;
  current_count int;
begin
  select match_quota into quota from coaches where id = new.coach_id;
  if quota is not null then
    select count(*) into current_count from matches where coach_id = new.coach_id;
    if current_count >= quota then
      raise exception 'MATCH_QUOTA_EXCEEDED: limite di % partite del tuo pacchetto raggiunto', quota;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_check_match_quota on matches;
create trigger trg_check_match_quota
  before insert on matches
  for each row execute function check_match_quota();
