-- ============================================================
-- MIGRAZIONE 13 — Commento tecnico generato da AI
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

alter table matches add column if not exists ai_commentary text;
alter table matches add column if not exists ai_commentary_generated_at timestamptz;
