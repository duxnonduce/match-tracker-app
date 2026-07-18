-- ============================================================
-- MIGRAZIONE 15 — Verifica di sicurezza: assicura che "academies" abbia
-- TUTTE le colonne attese, indipendentemente da quali migrazioni passate
-- siano state eseguite davvero. Ogni riga è sicura da rieseguire.
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

alter table academies add column if not exists email text;
alter table academies add column if not exists academy_name text;
alter table academies add column if not exists academy_city text;
alter table academies add column if not exists academy_address text;

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

alter table academies add column if not exists stripe_customer_id text;
alter table academies add column if not exists stripe_subscription_id text;
alter table academies add column if not exists plan_tier text default 'none';
alter table academies add column if not exists match_quota int;
alter table academies add column if not exists subscription_status text default 'inactive';
alter table academies add column if not exists current_period_end timestamptz;
alter table academies add column if not exists current_period_start timestamptz;
alter table academies add column if not exists cancel_at_period_end boolean default false;
alter table academies add column if not exists renewal_reminder_sent_at timestamptz;
alter table academies add column if not exists terms_accepted_at timestamptz;
alter table academies add column if not exists created_at timestamptz default now();

-- Stessa verifica per athletes, matches, training_sessions, athlete_goals:
-- assicura che le colonne aggiunte via app negli ultimi mesi ci siano
-- tutte, a prescindere da quali migrazioni intermedie siano state saltate.
alter table athletes add column if not exists level text;
alter table athletes add column if not exists category text;
alter table athletes add column if not exists strengths text;
alter table athletes add column if not exists weaknesses text;
alter table athletes add column if not exists parental_consent_confirmed_at timestamptz;

alter table matches add column if not exists coach_summary text;
alter table matches add column if not exists coach_worked_well text;
alter table matches add column if not exists coach_to_improve text;
alter table matches add column if not exists coach_next_goal text;
alter table matches add column if not exists ai_commentary text;
alter table matches add column if not exists ai_commentary_generated_at timestamptz;
alter table matches add column if not exists staff_id uuid references staff(id) on delete set null;
alter table matches add column if not exists recorded_by_name text;

alter table training_sessions add column if not exists staff_id uuid references staff(id) on delete set null;
alter table training_sessions add column if not exists recorded_by_name text;

alter table athlete_goals add column if not exists staff_id uuid references staff(id) on delete set null;
alter table athlete_goals add column if not exists recorded_by_name text;
