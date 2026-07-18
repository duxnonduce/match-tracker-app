// FILE: /app/api/admin/academies/create/route.js

import bcrypt from 'bcryptjs';
import { requirePlatformAdmin, getAdminSupabaseClient } from '../../../../../lib/platformAdminAuth';

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%&*';
  let pw = '';
  for (let i = 0; i < 16; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  return pw;
}

export async function POST(request) {
  const admin = await requirePlatformAdmin(request);
  if (!admin) {
    return Response.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const { email, academyName, adminFullName, adminPin } = await request.json();
  if (!email || !academyName || !adminFullName || !adminPin) {
    return Response.json({ error: 'Dati mancanti' }, { status: 400 });
  }
  if (!/^\d{4,6}$/.test(adminPin)) {
    return Response.json({ error: 'Il PIN deve essere numerico, da 4 a 6 cifre.' }, { status: 400 });
  }

  const sb = getAdminSupabaseClient();
  const password = generatePassword();

  const { data: created, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { academy_name: academyName },
  });

  if (error) {
    return Response.json({ error: 'Supabase: ' + error.message }, { status: 500 });
  }

  // Il trigger handle_new_coach() crea già la riga academies automaticamente.
  // Creiamo qui il primo membro dello staff (admin) per farla usare subito.
  const pinHash = bcrypt.hashSync(adminPin, 10);

  const { error: staffErr } = await sb.from('staff').insert({
    academy_id: created.user.id,
    full_name: adminFullName,
    pin_hash: pinHash,
    role: 'admin',
  });

  if (staffErr) {
    return Response.json({ error: 'Academy creata ma errore nella creazione dello staff: ' + staffErr.message }, { status: 500 });
  }

  return Response.json({ email, password, academyId: created.user.id });
}
