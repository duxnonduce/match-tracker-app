// FILE: /app/api/staff/add/route.js
// Solo il Super Operatore può aggiungere nuovi membri dello staff.

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '../../../../lib/staffAuth';

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

export async function POST(request) {
  const { academyId, fullName, pin, role } = await request.json();

  const staff = requireAdmin(request, academyId);
  if (!staff) {
    return Response.json({ error: 'Solo il Super Operatore può aggiungere maestri.' }, { status: 403 });
  }

  if (!fullName || !pin) {
    return Response.json({ error: 'Dati mancanti' }, { status: 400 });
  }
  if (!/^\d{4,6}$/.test(pin)) {
    return Response.json({ error: 'Il PIN deve essere numerico, da 4 a 6 cifre.' }, { status: 400 });
  }
  const finalRole = role === 'admin' ? 'admin' : 'staff';

  // Il PIN deve essere diverso da quello di tutti gli altri membri attivi
  // di questa Academy — altrimenti il login con PIN non saprebbe chi sei.
  const { data: existing } = await getSupabaseAdmin()
    .from('staff')
    .select('pin_hash')
    .eq('academy_id', academyId)
    .eq('active', true);

  const collision = (existing || []).some(s => bcrypt.compareSync(pin, s.pin_hash));
  if (collision) {
    return Response.json({ error: 'Questo PIN è già usato da un altro membro dello staff. Scegline uno diverso.' }, { status: 400 });
  }

  const pinHash = bcrypt.hashSync(pin, 10);

  const { data: created, error } = await getSupabaseAdmin()
    .from('staff')
    .insert({ academy_id: academyId, full_name: fullName, pin_hash: pinHash, role: finalRole })
    .select('id, full_name, role, active, created_at')
    .single();

  if (error) {
    return Response.json({ error: 'Errore nella creazione' }, { status: 500 });
  }

  return Response.json({ staff: created });
}
