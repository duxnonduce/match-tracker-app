-- ============================================================
-- MIGRAZIONE 2 — Scadenza abbonamento, mano preferita, codice fiscale
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- Sicura su un database già in uso: aggiunge solo colonne.
-- ============================================================

-- Scadenza e stato disdetta dell'abbonamento del maestro
alter table coaches add column if not exists current_period_end timestamptz;
alter table coaches add column if not exists cancel_at_period_end boolean default false;

-- Dati aggiuntivi dell'allievo
alter table athletes add column if not exists dominant_hand text; -- 'destra' | 'sinistra'
alter table athletes add column if not exists fiscal_code text;
