// FILE: /app/api/admin/overview/route.js
// Calcola tutti i numeri della schermata principale del pannello admin.
// Chiamata anche dal login/pagine per verificare "sei davvero un admin?"
// (se risponde 200, lo sei — è un effetto collaterale comodo, non un
// meccanismo di sicurezza a sé: la vera verifica è requirePlatformAdmin).

import { requirePlatformAdmin, getAdminSupabaseClient } from '../../../../lib/platformAdminAuth';

export async function POST(request) {
  const admin = await requirePlatformAdmin(request);
  if (!admin) {
    return Response.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const sb = getAdminSupabaseClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: totalAcademies },
    { count: activeAdminStatus },
    { count: suspended },
    { count: blocked },
    { count: totalStaff },
    { count: totalAthletes },
    { count: subActive },
    { count: subPastDue },
    { count: subCanceled },
    { count: subInactive },
    { count: manualOverrides },
    { count: newLast7 },
    { count: newLast30 },
  ] = await Promise.all([
    sb.from('academies').select('*', { count: 'exact', head: true }),
    sb.from('academies').select('*', { count: 'exact', head: true }).eq('admin_status', 'active'),
    sb.from('academies').select('*', { count: 'exact', head: true }).eq('admin_status', 'suspended'),
    sb.from('academies').select('*', { count: 'exact', head: true }).eq('admin_status', 'blocked'),
    sb.from('staff').select('*', { count: 'exact', head: true }).eq('active', true),
    sb.from('athletes').select('*', { count: 'exact', head: true }).eq('active', true),
    sb.from('academies').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    sb.from('academies').select('*', { count: 'exact', head: true }).eq('subscription_status', 'past_due'),
    sb.from('academies').select('*', { count: 'exact', head: true }).eq('subscription_status', 'canceled'),
    sb.from('academies').select('*', { count: 'exact', head: true }).eq('subscription_status', 'inactive'),
    sb.from('academies').select('*', { count: 'exact', head: true }).eq('is_manual_override', true),
    sb.from('academies').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    sb.from('academies').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo),
  ]);

  // Academy da tenere d'occhio: pagamento fallito
  const { data: attention } = await sb
    .from('academies')
    .select('id, academy_name, email, subscription_status, admin_status')
    .eq('subscription_status', 'past_due')
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: recentSignups } = await sb
    .from('academies')
    .select('id, academy_name, email, created_at, subscription_status, admin_status')
    .order('created_at', { ascending: false })
    .limit(8);

  return Response.json({
    academies: { total: totalAcademies || 0, active: activeAdminStatus || 0, suspended: suspended || 0, blocked: blocked || 0 },
    staff: { total: totalStaff || 0 },
    athletes: { total: totalAthletes || 0 },
    subscriptions: { active: subActive || 0, pastDue: subPastDue || 0, canceled: subCanceled || 0, inactive: subInactive || 0, manualOverrides: manualOverrides || 0 },
    registrations: { last7Days: newLast7 || 0, last30Days: newLast30 || 0 },
    attention: attention || [],
    recentSignups: recentSignups || [],
  });
}
