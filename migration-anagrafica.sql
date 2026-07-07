-- ============================================================
-- MIGRAZIONE — Dati anagrafici più dettagliati
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- Sicura da eseguire su un database già in uso: aggiunge solo colonne,
-- non tocca né cancella nessun dato esistente.
-- ============================================================

-- Nuovi campi anagrafici per il maestro / accademia
alter table coaches add column if not exists first_name text;
alter table coaches add column if not exists last_name text;
alter table coaches add column if not exists phone text;
alter table coaches add column if not exists academy_name text;
alter table coaches add column if not exists academy_city text;
alter table coaches add column if not exists academy_address text;

-- Nuovi campi anagrafici per l'allievo
alter table athletes add column if not exists phone text;
alter table athletes add column if not exists email text;
-- (birth_date e notes esistevano già nello schema originale)

-- Aggiorna il trigger che crea automaticamente la riga "coach" alla
-- registrazione, per popolare anche questi nuovi campi dai metadata
-- passati dal form di registrazione.
create or replace function public.handle_new_coach()
returns trigger as $$
begin
  insert into public.coaches (id, email, first_name, last_name, phone, academy_name, academy_city, academy_address)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'academy_name',
    new.raw_user_meta_data->>'academy_city',
    new.raw_user_meta_data->>'academy_address'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Il trigger "on_auth_user_created" esiste già e punta a questa funzione:
-- non serve ricrearlo, "create or replace function" aggiorna già il suo comportamento.
