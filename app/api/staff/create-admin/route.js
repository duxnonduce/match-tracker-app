// FILE: /app/api/staff/create-admin/route.js
// Chiamata UNA SOLA VOLTA, subito dopo la registrazione dell'Academy, per
// creare il primo membro dello staff (il fondatore) con ruolo admin —
// il suo PIN diventa il "Super PIN". Per sicurezza, questa route accetta
// la richiesta solo se l'Academy non ha ancora NESSUN membro dello staff,
// così non può essere riusata per aggiungerne altri (quello richiederà
// l'apposita gestione admin, non ancora collegata a un permesso — vedi
// nota nel prossimo giro di lavoro).

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

export async function POST(request) {
  const { academyId, fullName, pin } = await request.json();

  if (!academyId || !fullName || !pin) {
    return Response.json({ error: 'Dati mancanti' }, { status: 400 });
  }
  if (!/^\d{4,6}$/.test(pin)) {
    return Response.json({ error: 'Il PIN deve essere numerico, da 4 a 6 cifre.' }, { status: 400 });
  }

  const { count, error: countErr } = await getSupabaseAdmin()
    .from('staff')
    .select('*', { count: 'exact', head: true })
    .eq('academy_id', academyId);

  if (countErr) {
    return Response.json({ error: 'Errore database' }, { status: 500 });
  }
  if (count > 0) {
    return Response.json({ error: 'Questa Academy ha già dello staff registrato.' }, { status: 400 });
  }

  const pinHash = bcrypt.hashSync(pin, 10);

  const { data: created, error } = await getSupabaseAdmin()
    .from('staff')
    .insert({ academy_id: academyId, full_name: fullName, pin_hash: pinHash, role: 'admin' })
    .select('id, full_name, role')
    .single();

  if (error) {
    return Response.json({ error: 'Errore nella creazione dello staff' }, { status: 500 });
  }

  return Response.json({ staff: created });
}
