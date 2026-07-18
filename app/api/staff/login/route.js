// FILE: /app/api/staff/login/route.js
// Secondo passaggio del login: dopo email+password dell'Academy, ogni
// membro dello staff si identifica con il proprio PIN personale. Il PIN
// da solo non basta a riconoscere la persona: serve sapere prima a quale
// Academy appartiene (lo sappiamo già, dalla sessione Supabase attiva).

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

export async function POST(request) {
  const { academyId, pin } = await request.json();

  if (!academyId || !pin) {
    return Response.json({ error: 'Dati mancanti' }, { status: 400 });
  }

  const { data: staffRows, error } = await getSupabaseAdmin()
    .from('staff')
    .select('id, full_name, pin_hash, role, active')
    .eq('academy_id', academyId)
    .eq('active', true);

  if (error) {
    return Response.json({ error: 'Errore database' }, { status: 500 });
  }

  const match = (staffRows || []).find(s => bcrypt.compareSync(pin, s.pin_hash));

  if (!match) {
    return Response.json({ error: 'PIN non valido' }, { status: 401 });
  }

  const token = jwt.sign(
    { staffId: match.id, academyId, fullName: match.full_name, role: match.role },
    process.env.STAFF_JWT_SECRET,
    { expiresIn: '12h' }
  );

  return Response.json({
    token,
    staff: { id: match.id, fullName: match.full_name, role: match.role },
  });
}
