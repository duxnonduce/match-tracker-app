// FILE: /app/api/push/subscribe-athlete/route.js

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getAthleteFromToken(request) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.ATHLETE_JWT_SECRET);
    if (payload.role !== 'athlete') return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export async function POST(request) {
  const athlete = getAthleteFromToken(request);
  if (!athlete) {
    return Response.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const { subscription } = await request.json();
  if (!subscription?.endpoint) {
    return Response.json({ error: 'Dati mancanti' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('push_subscriptions').upsert({
    owner_type: 'athlete',
    owner_id: athlete.athleteId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
  }, { onConflict: 'endpoint' });

  if (error) {
    return Response.json({ error: 'Errore salvataggio' }, { status: 500 });
  }
  return Response.json({ ok: true });
}
