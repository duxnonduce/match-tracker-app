// FILE: /app/api/staff/list/route.js
// Solo il Super Operatore può vedere l'elenco completo dello staff.

import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../../lib/staffAuth';

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

export async function POST(request) {
  const { academyId } = await request.json();

  const staff = requireAdmin(request, academyId);
  if (!staff) {
    return Response.json({ error: 'Solo il Super Operatore può gestire lo staff.' }, { status: 403 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('staff')
    .select('id, full_name, role, active, created_at')
    .eq('academy_id', academyId)
    .order('created_at', { ascending: true });

  if (error) {
    return Response.json({ error: 'Errore database' }, { status: 500 });
  }

  return Response.json({ staff: data });
}
