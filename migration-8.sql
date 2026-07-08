-- ============================================================
-- MIGRAZIONE 8 — Bozza/pubblicazione anche per gli obiettivi
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

alter table athlete_goals add column if not exists published_to_athlete boolean default false;
