// FILE: /app/api/push/subscribe-coach/route.js

import { createClient } from '@supabase/supabase-js';

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

export async function POST(request) {
  const { academyId, subscription } = await request.json();
  if (!academyId || !subscription?.endpoint) {
    return Response.json({ error: 'Dati mancanti' }, { status: 400 });
  }

  const { error } = await getSupabaseAdmin().from('push_subscriptions').upsert({
    owner_type: 'coach',
    owner_id: academyId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  }, { onConflict: 'endpoint' });

  if (error) {
    return Response.json({ error: 'Errore salvataggio' }, { status: 500 });
  }
  return Response.json({ ok: true });
}
