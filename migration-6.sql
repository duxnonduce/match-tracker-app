-- ============================================================
-- MIGRAZIONE 6 — Modalità Allenamento + report più "umano"
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ------------------------------------------------------------
-- Report più "umano" sulle PARTITE: 4 campi narrativi al posto
-- (o in aggiunta) del semplice commento libero.
-- ------------------------------------------------------------
alter table matches add column if not exists coach_summary text;        -- Sintesi della partita
alter table matches add column if not exists coach_worked_well text;    -- Cosa ha funzionato
alter table matches add column if not exists coach_to_improve text;     -- Cosa migliorare
alter table matches add column if not exists coach_next_goal text;      -- Obiettivo per il prossimo allenamento

-- ------------------------------------------------------------
-- TABELLA: training_sessions (sessioni di allenamento)
-- Stessa filosofia delle partite: bozza finché il maestro non
-- pubblica, con eventuale valutazione e i 4 campi narrativi.
-- ------------------------------------------------------------
create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  shot_type text not null,        -- 'dritto' | 'rovescio' | 'servizio' | 'volee' | 'smash' | 'dropshot' | 'back' | 'cesto'
  started_at timestamptz not null,
  ended_at timestamptz,
  episodes jsonb not null default '[]'::jsonb,  -- [{ts, result:'riuscito'|'errore', direction, quality}]
  coach_rating int check (coach_rating is null or (coach_rating between 1 and 10)),
  coach_summary text,
  coach_worked_well text,
  coach_to_improve text,
  coach_next_goal text,
  published_to_athlete boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_training_coach on training_sessions(coach_id);
create index if not exists idx_training_athlete on training_sessions(athlete_id);

alter table training_sessions enable row level security;

drop policy if exists "coach manages own training sessions" on training_sessions;
create policy "coach manages own training sessions"
  on training_sessions for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Come per le partite: l'allievo non ha una policy di SELECT diretta —
-- il suo accesso passa sempre dalle API server-side con service_role key,
-- che filtrano esplicitamente per athlete_id e published_to_athlete.
