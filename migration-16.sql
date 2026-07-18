-- ============================================================
-- MIGRAZIONE 16 — Pannello amministrativo della piattaforma
-- Da eseguire in: Supabase Dashboard → SQL Editor → New query
-- Completamente separato dalle Academy: nessuna Academy o maestro può
-- vedere o raggiungere in alcun modo questa parte.
-- ============================================================

-- ------------------------------------------------------------
-- TABELLA: platform_admins — chi può accedere al pannello /admin.
-- Login con Supabase Auth (come le Academy), ma è una tabella
-- completamente separata: un'Academy non potrà mai comparire qui e
-- viceversa.
-- ------------------------------------------------------------
create table if not exists platform_admins (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz default now()
);

alter table platform_admins enable row level security;

drop policy if exists "admin reads own row" on platform_admins;
create policy "admin reads own row"
  on platform_admins for select
  using (id = auth.uid());
-- Nessuna policy di scrittura diretta: la gestione degli admin passa
-- sempre da codice server con service_role key.

-- ------------------------------------------------------------
-- Stato amministrativo dell'Academy — SEPARATO dallo stato
-- dell'abbonamento (che segue Stripe). Permette a te di sospendere o
-- bloccare un'Academy indipendentemente da cosa dice Stripe.
-- ------------------------------------------------------------
alter table academies add column if not exists admin_status text not null default 'active'
  check (admin_status in ('active', 'suspended', 'blocked'));
alter table academies add column if not exists internal_notes text;

-- ------------------------------------------------------------
-- Aggiorna il trigger di creazione automatica riga Academy perché
-- SALTI la creazione quando l'account che si registra è un
-- amministratore della piattaforma (vedi /api/admin/bootstrap).
-- ------------------------------------------------------------
create or replace function public.handle_new_coach()
returns trigger as $$
begin
  if (new.raw_user_meta_data->>'account_type') = 'platform_admin' then
    return new;
  end if;

  insert into public.academies (
    id, email, academy_name, academy_city, academy_address, terms_accepted_at,
    ragione_sociale, partita_iva, codice_fiscale_azienda, codice_sdi, pec,
    indirizzo, comune, cap, provincia, nazione, email_amministrativa, telefono_amministrativo
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'academy_name',
    new.raw_user_meta_data->>'academy_city',
    new.raw_user_meta_data->>'academy_address',
    (new.raw_user_meta_data->>'terms_accepted_at')::timestamptz,
    new.raw_user_meta_data->>'ragione_sociale',
    new.raw_user_meta_data->>'partita_iva',
    new.raw_user_meta_data->>'codice_fiscale_azienda',
    new.raw_user_meta_data->>'codice_sdi',
    new.raw_user_meta_data->>'pec',
    new.raw_user_meta_data->>'indirizzo',
    new.raw_user_meta_data->>'comune',
    new.raw_user_meta_data->>'cap',
    new.raw_user_meta_data->>'provincia',
    coalesce(new.raw_user_meta_data->>'nazione', 'Italia'),
    new.raw_user_meta_data->>'email_amministrativa',
    new.raw_user_meta_data->>'telefono_amministrativo'
  );
  return new;
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------
-- Tracciamento degli abbonamenti assegnati manualmente da te (omaggi,
-- prove, accordi commerciali) invece che tramite pagamento Stripe.
-- ------------------------------------------------------------
alter table academies add column if not exists is_manual_override boolean default false;
alter table academies add column if not exists manual_override_reason text;
