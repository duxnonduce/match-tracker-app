-- ============================================================
-- MIGRAZIONE 5 — Tracciabilità dei consensi (termini + consenso genitoriale)
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Quando il maestro ha accettato Termini/Privacy in fase di registrazione.
alter table coaches add column if not exists terms_accepted_at timestamptz;

-- Conferma del maestro di avere il consenso del genitore/tutore per
-- l'allievo inserito (obbligatoria per gli allievi minorenni).
alter table athletes add column if not exists parental_consent_confirmed_at timestamptz;

-- Aggiorna il trigger di registrazione per salvare anche terms_accepted_at.
create or replace function public.handle_new_coach()
returns trigger as $$
begin
  insert into public.coaches (id, email, first_name, last_name, phone, academy_name, academy_city, academy_address, terms_accepted_at)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'academy_name',
    new.raw_user_meta_data->>'academy_city',
    new.raw_user_meta_data->>'academy_address',
    (new.raw_user_meta_data->>'terms_accepted_at')::timestamptz
  );
  return new;
end;
$$ language plpgsql security definer;
