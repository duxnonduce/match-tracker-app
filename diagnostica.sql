-- ============================================================
-- DIAGNOSTICA — copia e incolla tutto questo in Supabase SQL Editor
-- e mandami il risultato (o uno screenshot)
-- ============================================================

-- 1) La tabella academies esiste ed ha tutte le colonne attese?
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'academies'
order by ordinal_position;

-- 2) Il trigger è collegato correttamente?
select tgname, tgrelid::regclass as tabella, tgenabled
from pg_trigger
where tgname = 'on_auth_user_created';

-- 3) La funzione esiste ed è quella giusta (controlla che dentro ci sia
-- "insert into public.academies" e non più "insert into public.coaches")?
select prosrc
from pg_proc
where proname = 'handle_new_coach';
