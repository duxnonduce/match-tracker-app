-- ============================================================
-- MIGRAZIONE 7 — Obiettivi strutturati per allievo
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create table if not exists athlete_goals (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references coaches(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  title text not null,
  status text not null default 'in_corso',  -- 'in_corso' | 'raggiunto'
  created_at timestamptz default now(),
  achieved_at timestamptz
);

create index if not exists idx_goals_coach on athlete_goals(coach_id);
create index if not exists idx_goals_athlete on athlete_goals(athlete_id);

alter table athlete_goals enable row level security;

drop policy if exists "coach manages own goals" on athlete_goals;
create policy "coach manages own goals"
  on athlete_goals for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Come per matches/training_sessions: l'allievo legge i propri obiettivi
-- tramite un'API server-side con service_role key, non con una policy diretta.
