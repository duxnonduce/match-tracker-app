-- ============================================================
-- MIGRAZIONE 4 — Promemoria di rinnovo via email
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Tiene traccia dell'ultimo promemoria di rinnovo mandato, per non
-- mandarne due per lo stesso ciclo di fatturazione.
alter table coaches add column if not exists renewal_reminder_sent_at timestamptz;
