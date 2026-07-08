-- ============================================================
-- MIGRAZIONE 3 — Valutazione del maestro sulle partite
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- Sicura su un database già in uso: aggiunge solo colonne.
-- ============================================================

alter table matches add column if not exists coach_rating int check (coach_rating is null or (coach_rating between 1 and 10));
alter table matches add column if not exists coach_comment text;
-- Finché false, l'allievo NON vede questa partita nel suo elenco/API.
alter table matches add column if not exists published_to_athlete boolean default false;
