-- ============================================================
-- SCHEMA DATABASE — PointLab (Supabase / Postgres)
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- Modello: l'account appartiene all'ACADEMY (una società sportiva),
-- non al singolo maestro. Lo staff (i singoli maestri) accede con le
-- stesse credenziali dell'Academy + un PIN personale — vedi tabella
-- "staff" più sotto.
-- ============================================================

-- estensione per generare UUID
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- TABELLA: academies (l'account che si registra e paga l'abbonamento)
-- id = stesso id dell'utente in auth.users (Supabase Auth) — email e
-- password sono UNICHE e condivise da tutto lo staff dell'Academy.
-- ------------------------------------------------------------
create table academies (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,

  -- Nome/branding
  academy_name text,
  academy_city text,
  academy_address text,

  -- Dati di fatturazione
  ragione_sociale text,
  partita_iva text,
  codice_fiscale_azienda text,
  codice_sdi text,
  pec text,
  indirizzo text,
  comune text,
  cap text,
  provincia text,
  nazione text default 'Italia',
  email_amministrativa text,
  telefono_amministrativo text,

  -- Abbonamento
  stripe_customer_id text,
  stripe_subscription_id text,
  plan_tier text default 'none',          -- 'none' | 'base10' | 'plus30' | 'pro50' | 'oro'
  match_quota int,                         -- NULL = illimitato; altrimenti tetto di partite/mese
  subscription_status text default 'inactive', -- 'active' | 'past_due' | 'canceled' | 'inactive'
  current_period_end timestamptz,
  current_period_start timestamptz,
  cancel_at_period_end boolean default false,
  renewal_reminder_sent_at timestamptz,
  terms_accepted_at timestamptz,

  -- Pannello amministrativo della piattaforma (vedi tabella platform_admins)
  admin_status text not null default 'active' check (admin_status in ('active', 'suspended', 'blocked')),
  internal_notes text,
  is_manual_override boolean default false,
  manual_override_reason text,

  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- TABELLA: platform_admins (pannello di controllo generale — separato
-- dalle Academy, accessibile solo a chi gestisce la piattaforma)
-- ------------------------------------------------------------
create table platform_admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz default now()
);

alter table platform_admins enable row level security;

create policy "admin reads own row"
  on platform_admins for select
  using (id = auth.uid());

-- trigger: quando ci si registra via Supabase Auth, crea automaticamente
-- la riga academy, leggendo i dati passati come metadata dal form. Fa
-- eccezione per la creazione di un amministratore della piattaforma
-- (vedi /api/admin/bootstrap): in quel caso NON va creata nessuna riga
-- Academy, ce ne occupiamo separatamente in quella route.
create function public.handle_new_coach()
returns trigger as $$
begin
  if (new.raw_user_meta_data->>'account_type') = 'platform_admin' then
    return new;
  end if;

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_coach();

-- ------------------------------------------------------------
-- TABELLA: staff (i singoli maestri all'interno dell'Academy)
-- Accedono con email+password dell'Academy (condivise) + il proprio
-- PIN personale. role='admin' = Super Operatore (chi ha registrato
-- l'Academy, di norma): unico che può gestire abbonamento/staff/dati
-- fiscali. role='staff' = maestro normale.
-- ------------------------------------------------------------
create table staff (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  full_name text not null,
  pin_hash text not null,       -- hash bcrypt, MAI il PIN in chiaro
  role text not null default 'staff' check (role in ('admin', 'staff')),
  active boolean default true,
  created_at timestamptz default now()
);

create index idx_staff_academy on staff(academy_id);

alter table staff enable row level security;
-- Nessuna policy diretta: tutto lo staff condivide la STESSA sessione
-- Supabase Auth (quella dell'Academy), quindi Supabase da solo non può
-- distinguere chi tra i maestri sta operando in un dato momento. Quella
-- distinzione (e il controllo "è admin?") si fa lato server, verificando
-- il PIN — per questo l'accesso alla tabella staff passa sempre da API
-- con service_role key, mai dal client diretto.

-- ------------------------------------------------------------
-- TABELLA: athletes (gli allievi — appartengono all'Academy, non al
-- singolo maestro: chiunque nello staff può cercarli/gestirli)
-- ------------------------------------------------------------
create table athletes (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
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

create index idx_athletes_academy on athletes(academy_id);

-- ------------------------------------------------------------
-- TABELLA: matches (le partite registrate — condivise nell'Academy,
-- con staff_id per sapere quale maestro l'ha registrata/valutata)
-- ------------------------------------------------------------
create table matches (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  staff_id uuid references staff(id) on delete set null,
  recorded_by_name text,
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
  ai_commentary text,
  ai_commentary_generated_at timestamptz,
  published_to_athlete boolean default false,
  created_at timestamptz default now()
);

create index idx_matches_academy on matches(academy_id);
create index idx_matches_athlete on matches(athlete_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Tutte le query dal browser passano per Supabase Auth (l'Academy).
-- Poiché tutto lo staff condivide la stessa sessione, le policy RLS
-- garantiscono che un'Academy veda solo i propri dati — la distinzione
-- TRA i maestri (chi è admin, chi ha fatto cosa) si gestisce a livello
-- applicativo/API, non con RLS, perché RLS non può vedere il PIN.
-- Gli allievi NON hanno un utente Supabase Auth: il loro accesso passa
-- dal backend (service_role key, filtro manuale per athlete_id).
-- ============================================================

alter table academies enable row level security;
alter table athletes enable row level security;
alter table matches enable row level security;

create policy "academy reads own row"
  on academies for select
  using (id = auth.uid());

create policy "academy updates own row"
  on academies for update
  using (id = auth.uid());

create policy "academy manages own athletes"
  on athletes for all
  using (academy_id = auth.uid())
  with check (academy_id = auth.uid());

create policy "academy manages own matches"
  on matches for all
  using (academy_id = auth.uid())
  with check (academy_id = auth.uid());

-- ------------------------------------------------------------
-- TABELLA: training_sessions (sessioni di allenamento)
-- ------------------------------------------------------------
create table training_sessions (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  staff_id uuid references staff(id) on delete set null,
  recorded_by_name text,
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

create index idx_training_academy on training_sessions(academy_id);
create index idx_training_athlete on training_sessions(athlete_id);

alter table training_sessions enable row level security;

create policy "academy manages own training sessions"
  on training_sessions for all
  using (academy_id = auth.uid())
  with check (academy_id = auth.uid());

-- ------------------------------------------------------------
-- TABELLA: athlete_goals (obiettivi tecnici strutturati)
-- ------------------------------------------------------------
create table athlete_goals (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid not null references academies(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  staff_id uuid references staff(id) on delete set null,
  recorded_by_name text,
  title text not null,
  status text not null default 'in_corso',  -- 'in_corso' | 'raggiunto'
  published_to_athlete boolean default false,
  created_at timestamptz default now(),
  achieved_at timestamptz
);

create index idx_goals_academy on athlete_goals(academy_id);
create index idx_goals_athlete on athlete_goals(athlete_id);

alter table athlete_goals enable row level security;

create policy "academy manages own goals"
  on athlete_goals for all
  using (academy_id = auth.uid())
  with check (academy_id = auth.uid());

-- ------------------------------------------------------------
-- TABELLA: push_subscriptions (notifiche push — per singolo membro
-- dello staff, non per l'Academy intera: ognuno ha il proprio telefono)
-- ------------------------------------------------------------
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('staff','athlete')),
  owner_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

create index idx_push_owner on push_subscriptions(owner_type, owner_id);
alter table push_subscriptions enable row level security;

-- ------------------------------------------------------------
-- Blocca l'inserimento di nuove partite oltre il limite del piano PER IL
-- MESE CORRENTE (match_quota = NULL vuol dire illimitato). Il conteggio
-- riparte da zero ad ogni rinnovo dell'abbonamento (current_period_start).
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

create trigger trg_check_match_quota
  before insert on matches
  for each row execute function check_match_quota();
