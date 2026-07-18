// FILE: /app/api/admin/bootstrap/route.js
// Crea il PRIMO amministratore della piattaforma. Funziona solo se non
// esiste ancora nessun admin — dopo la prima volta, questa route rifiuta
// sempre, così non può essere riusata da nessun altro.

import { createClient } from '@supabase/supabase-js';

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%&*';
  let pw = '';
  for (let i = 0; i < 18; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export async function POST(request) {
  const { email, fullName } = await request.json();
  if (!email) {
    return Response.json({ error: 'Email mancante' }, { status: 400 });
  }

  const { count } = await getSupabaseAdmin()
    .from('platform_admins')
    .select('*', { count: 'exact', head: true });

  if (count > 0) {
    return Response.json({ error: 'Esiste già un amministratore della piattaforma. Questa pagina serve solo per il primissimo accesso — usa /admin/login.' }, { status: 400 });
  }

  const password = generatePassword();

  const { data: created, error } = await getSupabaseAdmin().auth.admin.createUser({
    email,
    password,
    email_confirm: true, // salta la conferma via email: sei tu, non serve
    user_metadata: { account_type: 'platform_admin' },
  });

  if (error) {
    return Response.json({ error: 'Supabase: ' + error.message }, { status: 500 });
  }

  const { error: insertErr } = await getSupabaseAdmin()
    .from('platform_admins')
    .insert({ id: created.user.id, email, full_name: fullName || null });

  if (insertErr) {
    return Response.json({ error: 'Utente creato ma errore nel salvarlo come admin: ' + insertErr.message }, { status: 500 });
  }

  return Response.json({ email, password });
}
