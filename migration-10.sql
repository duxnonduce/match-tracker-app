-- ============================================================
-- MIGRAZIONE 10 — Notifiche push
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('coach','athlete')),
  owner_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

create index if not exists idx_push_owner on push_subscriptions(owner_type, owner_id);

-- Tabella gestita solo da codice server con la service_role key (come
-- l'accesso degli allievi alle altre tabelle): nessuna policy pubblica.
alter table push_subscriptions enable row level security;
