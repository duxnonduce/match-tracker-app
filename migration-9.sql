-- ============================================================
-- MIGRAZIONE 9 — Scheda tecnica allievo
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

alter table athletes add column if not exists level text;        -- es. 'Principiante' | 'Intermedio' | 'Avanzato' | 'Agonista'
alter table athletes add column if not exists category text;     -- es. 'Under 12', libero
alter table athletes add column if not exists strengths text;    -- punti forti
alter table athletes add column if not exists weaknesses text;   -- punti deboli
