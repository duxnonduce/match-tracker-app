// FILE: /app/api/admin/athletes/manage/route.js

import { requirePlatformAdmin, getAdminSupabaseClient } from '../../../../../lib/platformAdminAuth';

export async function POST(request) {
  const admin = await requirePlatformAdmin(request);
  if (!admin) {
    return Response.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const { athleteId, action } = await request.json();
  if (!athleteId || action !== 'toggle-active') {
    return Response.json({ error: 'Dati mancanti o azione non valida' }, { status: 400 });
  }

  const sb = getAdminSupabaseClient();
  const { data: current } = await sb.from('athletes').select('active').eq('id', athleteId).single();
  const { error } = await sb.from('athletes').update({ active: !current?.active }).eq('id', athleteId);
  if (error) return Response.json({ error: 'Errore nel salvataggio' }, { status: 500 });
  return Response.json({ ok: true });
}
