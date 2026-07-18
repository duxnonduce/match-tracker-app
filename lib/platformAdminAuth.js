// FILE: /lib/platformAdminAuth.js
// Verifica che chi sta chiamando una API /api/admin/* sia davvero un
// amministratore della piattaforma — completamente separato dallo staff
// delle Academy. Import SOLO da codice server.

import { createClient } from '@supabase/supabase-js';

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

/**
 * Legge il token Supabase dall'header Authorization, verifica che sia
 * valido, e controlla che quell'utente sia presente nella tabella
 * platform_admins. Ritorna la riga admin o null.
 */
export async function requirePlatformAdmin(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;

  const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !user) return null;

  const { data: admin } = await getSupabaseAdmin()
    .from('platform_admins')
    .select('id, email, full_name')
    .eq('id', user.id)
    .single();

  return admin || null;
}

export { getSupabaseAdmin as getAdminSupabaseClient };
