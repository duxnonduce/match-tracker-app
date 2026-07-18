// FILE: /app/api/athlete/goals/route.js

import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

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

export async function GET(request) {
  const athlete = getAthleteFromToken(request);
  if (!athlete) {
    return Response.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const { data: coach } = await getSupabaseAdmin()
    .from('coaches')
    .select('subscription_status')
    .eq('id', athlete.coachId)
    .single();
  if (!coach || coach.subscription_status !== 'active') {
    return Response.json({ error: 'Il tuo maestro non ha al momento un abbonamento attivo.' }, { status: 403 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from('athlete_goals')
    .select('id, title, status, created_at, achieved_at')
    .eq('athlete_id', athlete.athleteId)
    .eq('published_to_athlete', true)
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: 'Errore database' }, { status: 500 });
  }

  return Response.json({ goals: data });
}
