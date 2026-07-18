// FILE: /app/api/admin/academies/get/route.js

import { requirePlatformAdmin, getAdminSupabaseClient } from '../../../../../lib/platformAdminAuth';

export async function POST(request) {
  const admin = await requirePlatformAdmin(request);
  if (!admin) {
    return Response.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const { academyId } = await request.json();
  if (!academyId) {
    return Response.json({ error: 'Dati mancanti' }, { status: 400 });
  }

  const sb = getAdminSupabaseClient();

  const [
    { data: academy, error: academyErr },
    { data: staff },
    { data: athletes },
    { count: matchesCount },
    { count: trainingCount },
  ] = await Promise.all([
    sb.from('academies').select('*').eq('id', academyId).single(),
    sb.from('staff').select('id, full_name, role, active, created_at').eq('academy_id', academyId).order('created_at', { ascending: true }),
    sb.from('athletes').select('id, full_name, birth_date, active, created_at').eq('academy_id', academyId).order('created_at', { ascending: false }),
    sb.from('matches').select('*', { count: 'exact', head: true }).eq('academy_id', academyId),
    sb.from('training_sessions').select('*', { count: 'exact', head: true }).eq('academy_id', academyId),
  ]);

  if (academyErr || !academy) {
    return Response.json({ error: 'Academy non trovata' }, { status: 404 });
  }

  const { data: recentMatches } = await sb
    .from('matches')
    .select('id, meta, created_at, recorded_by_name')
    .eq('academy_id', academyId)
    .order('created_at', { ascending: false })
    .limit(10);

  return Response.json({
    academy,
    staff: staff || [],
    athletes: athletes || [],
    counts: { matches: matchesCount || 0, trainingSessions: trainingCount || 0 },
    recentMatches: recentMatches || [],
  });
}
