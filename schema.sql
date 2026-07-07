-- ============================================================
-- SCHEMA DATABASE — Match Tracker Tennis (Supabase / Postgres)
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- estensione per generare UUID
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- TABELLA: coaches (i maestri)
-- id = stesso id dell'utente in auth.users (Supabase Auth)
-- ------------------------------------------------------------
create table coaches (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_tier text default 'none',          -- 'none' | 'basic20' | 'plus50' | 'pro100'
  athlete_quota int default 0,             -- quanti allievi può registrare
  subscription_status text default 'inactive', -- 'active' | 'past_due' | 'canceled' | 'inactive'
  created_at timestamptz default now()
);

-- trigger: quando un utente si registra via Supabase Auth, crea automaticamente la riga coach
create function public.handle_new_coach()
returns trigger as $$
begin
  insert into public.coaches (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_coach();

-- ------------------------------------------------------------
-- TABELLA: athletes (gli allievi)
-- ------------------------------------------------------------
create table athletes (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  full_name text not null,
  birth_date date,
  notes text,
  pin_hash text not null,          -- hash bcrypt del PIN, MAI il PIN in chiaro
  active boolean default true,
  created_at timestamptz default now()
);

create index idx_athletes_coach on athletes(coach_id);

-- ------------------------------------------------------------
-- TABELLA: matches (le partite registrate)
-- meta/stats/log/match = gli stessi oggetti già usati dall'app attuale (JSON)
-- ------------------------------------------------------------
create table matches (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  meta jsonb not null,
  stats jsonb not null,
  log jsonb not null,
  match jsonb,
  created_at timestamptz default now()
);

create index idx_matches_coach on matches(coach_id);
create index idx_matches_athlete on matches(athlete_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Regola generale: tutte le query dal browser passano SOLO per Supabase
-- Auth (il maestro). Gli allievi NON hanno un utente Supabase Auth: il loro
-- accesso passa dal tuo backend (che usa la service_role key e filtra
-- manualmente per athlete_id — vedi FASE 3 della guida). Quindi qui
-- serve proteggere solo il lato "maestro".
-- ============================================================

alter table coaches enable row level security;
alter table athletes enable row level security;
alter table matches enable row level security;

-- COACHES: un maestro vede/modifica solo la propria riga
create policy "coach reads own row"
  on coaches for select
  using (id = auth.uid());

create policy "coach updates own row"
  on coaches for update
  using (id = auth.uid());

-- ATHLETES: un maestro vede/gestisce solo i propri allievi
create policy "coach manages own athletes"
  on athletes for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- MATCHES: un maestro vede/gestisce solo le proprie partite
create policy "coach manages own matches"
  on matches for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- NB: non creiamo nessuna policy che permetta il SELECT diretto dal
-- browser agli allievi: il loro accesso passa sempre dalle tue API
-- (che usano la service_role key, la quale bypassa RLS di proposito
-- e applica il filtro "where athlete_id = ..." nel codice).
