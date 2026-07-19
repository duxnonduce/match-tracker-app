-- ============================================================
-- MIGRAZIONE 17 — Modalità Live (link pubblico di sola lettura)
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

alter table matches add column if not exists is_live boolean default false;
alter table matches add column if not exists live_token text unique;

create index if not exists idx_matches_live_token on matches(live_token) where live_token is not null;
