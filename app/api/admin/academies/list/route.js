// FILE: /app/api/admin/academies/list/route.js

import { requirePlatformAdmin, getAdminSupabaseClient } from '../../../../../lib/platformAdminAuth';

export async function POST(request) {
  const admin = await requirePlatformAdmin(request);
  if (!admin) {
    return Response.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const { search } = await request.json().catch(() => ({}));
  const sb = getAdminSupabaseClient();

  let query = sb
    .from('academies')
    .select('id, academy_name, email, partita_iva, plan_tier, subscription_status, admin_status, is_manual_override, created_at')
    .order('created_at', { ascending: false });

  if (search && search.trim()) {
    const s = search.trim();
    query = query.or(`academy_name.ilike.%${s}%,email.ilike.%${s}%,partita_iva.ilike.%${s}%`);
  }

  const { data, error } = await query;
  if (error) {
    return Response.json({ error: 'Errore database' }, { status: 500 });
  }

  return Response.json({ academies: data });
}
