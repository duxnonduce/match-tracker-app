-- ============================================================
-- MIGRAZIONE 14 — Da "maestro singolo" ad "Academy con staff condiviso"
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- Solo dati di test: questa migrazione rinomina invece di duplicare,
-- così non serve scrivere uno script di conversione dei dati esistenti.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Rinomina la tabella e la colonna chiave ovunque compaia
-- ------------------------------------------------------------
alter table coaches rename to academies;

alter table athletes rename column coach_id to academy_id;
alter table matches rename column coach_id to academy_id;
alter table training_sessions rename column coach_id to academy_id;
alter table athlete_goals rename column coach_id to academy_id;

-- ------------------------------------------------------------
-- 2) Nuovi campi anagrafici/fatturazione per l'Academy
-- ------------------------------------------------------------
alter table academies add column if not exists ragione_sociale text;
alter table academies add column if not exists partita_iva text;
alter table academies add column if not exists codice_fiscale_azienda text;
alter table academies add column if not exists codice_sdi text;
alter table academies add column if not exists pec text;
alter table academies add column if not exists indirizzo text;
alter table academies add column if not exists comune text;
alter table academies add column if not exists cap text;
alter table academies add column if not exists provincia text;
alter table academies add column if not exists nazione text default 'Italia';
alter table academies add column if not exists email_amministrativa text;
alter table academies add column if not exists telefono_amministrativo text;

-- ------------------------------------------------------------
-- 3) Tabella STAFF — i singoli maestri dentro l'Academy, ciascuno
-- con un proprio PIN personale. Chi ha ruolo 'admin' è il Super
-- Operatore (di norma chi ha registrato l'Academy).
-- ------------------------------------------------------------
create table if not exists staff (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  full_name text not null,
  pin_hash text not null,       -- hash bcrypt, MAI il PIN in chiaro
  role text not null default 'staff' check (role in ('admin', 'staff')),
  active boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_staff_academy on staff(academy_id);

alter table staff enable row level security;
-- Nessuna policy diretta: come per gli allievi, l'accesso allo staff passa
-- sempre da API server-side con service_role key — mai dal client diretto,
-- perché tutti i membri dello staff condividono la STESSA sessione Supabase
-- (l'Academy), quindi la distinzione admin/staff va verificata lato server
-- tramite il PIN, non tramite le policy di Supabase.

-- ------------------------------------------------------------
-- 4) Attribuzione — quale membro dello staff ha registrato cosa
-- ------------------------------------------------------------
alter table matches add column if not exists staff_id uuid references staff(id) on delete set null;
alter table matches add column if not exists recorded_by_name text;
alter table training_sessions add column if not exists staff_id uuid references staff(id) on delete set null;
alter table training_sessions add column if not exists recorded_by_name text;
alter table athlete_goals add column if not exists staff_id uuid references staff(id) on delete set null;
alter table athlete_goals add column if not exists recorded_by_name text;

-- ------------------------------------------------------------
-- 5) Aggiorna il trigger del limite mensile partite (usava coach_id)
-- ------------------------------------------------------------
create or replace function check_match_quota()
returns trigger as $$
declare
  quota int;
  period_start timestamptz;
  current_count int;
begin
  select match_quota, current_period_start into quota, period_start
  from academies where id = new.academy_id;

  if quota is not null then
    if period_start is null then
      current_count := 0;
    else
      select count(*) into current_count from matches
      where academy_id = new.academy_id and created_at >= period_start;
    end if;
    if current_count >= quota then
      raise exception 'MATCH_QUOTA_EXCEEDED: limite di % partite del pacchetto raggiunto per questo mese', quota;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

-- ------------------------------------------------------------
-- 6) Aggiorna il trigger di creazione automatica riga Academy alla
-- registrazione (il nome interno della funzione resta invariato, ma
-- ora scrive nella tabella academies).
-- ------------------------------------------------------------
create or replace function public.handle_new_coach()
returns trigger as $$
begin
  insert into public.academies (
    id, email, academy_name, academy_city, academy_address, terms_accepted_at,
    ragione_sociale, partita_iva, codice_fiscale_azienda, codice_sdi, pec,
    indirizzo, comune, cap, provincia, nazione, email_amministrativa, telefono_amministrativo
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'academy_name',
    new.raw_user_meta_data->>'academy_city',
    new.raw_user_meta_data->>'academy_address',
    (new.raw_user_meta_data->>'terms_accepted_at')::timestamptz,
    new.raw_user_meta_data->>'ragione_sociale',
    new.raw_user_meta_data->>'partita_iva',
    new.raw_user_meta_data->>'codice_fiscale_azienda',
    new.raw_user_meta_data->>'codice_sdi',
    new.raw_user_meta_data->>'pec',
    new.raw_user_meta_data->>'indirizzo',
    new.raw_user_meta_data->>'comune',
    new.raw_user_meta_data->>'cap',
    new.raw_user_meta_data->>'provincia',
    coalesce(new.raw_user_meta_data->>'nazione', 'Italia'),
    new.raw_user_meta_data->>'email_amministrativa',
    new.raw_user_meta_data->>'telefono_amministrativo'
  );
  return new;
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------
-- 7) push_subscriptions: 'coach' diventa 'staff' (ogni notifica push va
-- al dispositivo del singolo membro dello staff che l'ha attivata, non
-- all'account condiviso dell'Academy). Cerchiamo dinamicamente il nome
-- del vincolo esistente invece di indovinarlo, per sicurezza.
-- ------------------------------------------------------------
do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'push_subscriptions' and con.contype = 'c' and pg_get_constraintdef(con.oid) like '%owner_type%';

  if constraint_name is not null then
    execute format('alter table push_subscriptions drop constraint %I', constraint_name);
  end if;
end $$;

update push_subscriptions set owner_type = 'staff' where owner_type = 'coach';

alter table push_subscriptions add constraint push_subscriptions_owner_type_check
  check (owner_type in ('staff', 'athlete'));
