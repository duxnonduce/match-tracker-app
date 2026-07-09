// FILE: /app/api/push/subscribe-coach/route.js

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const { coachId, subscription } = await request.json();
  if (!coachId || !subscription?.endpoint) {
    return Response.json({ error: 'Dati mancanti' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('push_subscriptions').upsert({
    owner_type: 'coach',
    owner_id: coachId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  }, { onConflict: 'endpoint' });

  if (error) {
    return Response.json({ error: 'Errore salvataggio' }, { status: 500 });
  }
  return Response.json({ ok: true });
}
