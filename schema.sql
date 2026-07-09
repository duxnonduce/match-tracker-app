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
  first_name text,
  last_name text,
  phone text,
  academy_name text,
  academy_city text,
  academy_address text,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_tier text default 'none',          -- 'none' | 'basic20' | 'plus50' | 'pro100'
  athlete_quota int default 0,             -- quanti allievi può registrare
  subscription_status text default 'inactive', -- 'active' | 'past_due' | 'canceled' | 'inactive'
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  renewal_reminder_sent_at timestamptz,
  terms_accepted_at timestamptz,
  created_at timestamptz default now()
);

-- trigger: quando un utente si registra via Supabase Auth, crea automaticamente la riga coach,
-- leggendo i dati anagrafici extra passati come metadata dal form di registrazione.
create function public.handle_new_coach()
returns trigger as $$
begin
  insert into public.coaches (id, email, first_name, last_name, phone, academy_name, academy_city, academy_address, terms_accepted_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'academy_name',
    new.raw_user_meta_data->>'academy_city',
    new.raw_user_meta_data->>'academy_address',
    (new.raw_user_meta_data->>'terms_accepted_at')::timestamptz
  );
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
  phone text,
  email text,
  notes text,
  dominant_hand text, -- 'destra' | 'sinistra'
  level text,        -- es. 'Principiante' | 'Intermedio' | 'Avanzato' | 'Agonista'
  category text,     -- es. 'Under 12', libero
  strengths text,    -- punti forti
  weaknesses text,   -- punti deboli
  fiscal_code text,
  parental_consent_confirmed_at timestamptz,
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
  coach_rating int check (coach_rating is null or (coach_rating between 1 and 10)),
  coach_comment text,
  coach_summary text,
  coach_worked_well text,
  coach_to_improve text,
  coach_next_goal text,
  published_to_athlete boolean default false,
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

-- ------------------------------------------------------------
-- TABELLA: training_sessions (sessioni di allenamento)
-- ------------------------------------------------------------
create table training_sessions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  shot_type text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  episodes jsonb not null default '[]'::jsonb,
  coach_rating int check (coach_rating is null or (coach_rating between 1 and 10)),
  coach_summary text,
  coach_worked_well text,
  coach_to_improve text,
  coach_next_goal text,
  published_to_athlete boolean default false,
  created_at timestamptz default now()
);

create index idx_training_coach on training_sessions(coach_id);
create index idx_training_athlete on training_sessions(athlete_id);

alter table training_sessions enable row level security;

create policy "coach manages own training sessions"
  on training_sessions for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- ------------------------------------------------------------
-- TABELLA: athlete_goals (obiettivi tecnici strutturati)
-- ------------------------------------------------------------
create table athlete_goals (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  title text not null,
  status text not null default 'in_corso',  -- 'in_corso' | 'raggiunto'
  published_to_athlete boolean default false,
  created_at timestamptz default now(),
  achieved_at timestamptz
);

create index idx_goals_coach on athlete_goals(coach_id);
create index idx_goals_athlete on athlete_goals(athlete_id);

alter table athlete_goals enable row level security;

create policy "coach manages own goals"
  on athlete_goals for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());
