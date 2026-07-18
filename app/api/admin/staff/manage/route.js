// FILE: /app/api/admin/staff/manage/route.js

import bcrypt from 'bcryptjs';
import { requirePlatformAdmin, getAdminSupabaseClient } from '../../../../../lib/platformAdminAuth';

export async function POST(request) {
  const admin = await requirePlatformAdmin(request);
  if (!admin) {
    return Response.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const { staffId, action, newPin } = await request.json();
  if (!staffId || !action) {
    return Response.json({ error: 'Dati mancanti' }, { status: 400 });
  }

  const sb = getAdminSupabaseClient();

  if (action === 'toggle-active') {
    const { data: current } = await sb.from('staff').select('active').eq('id', staffId).single();
    const { error } = await sb.from('staff').update({ active: !current?.active }).eq('id', staffId);
    if (error) return Response.json({ error: 'Errore nel salvataggio' }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (action === 'reset-pin') {
    if (!/^\d{4,6}$/.test(newPin || '')) {
      return Response.json({ error: 'Il PIN deve essere numerico, da 4 a 6 cifre.' }, { status: 400 });
    }
    const pinHash = bcrypt.hashSync(newPin, 10);
    const { error } = await sb.from('staff').update({ pin_hash: pinHash }).eq('id', staffId);
    if (error) return Response.json({ error: 'Errore nel salvataggio' }, { status: 500 });
    return Response.json({ ok: true });
  }

  return Response.json({ error: 'Azione non valida' }, { status: 400 });
}
