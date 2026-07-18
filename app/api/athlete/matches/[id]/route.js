// FILE: /app/api/athlete/matches/[id]/route.js
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

export async function GET(request, { params }) {
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

  // Triplo filtro: id della partita + athlete_id del token + deve essere
  // stata pubblicata dal maestro. Un allievo non può mai vedere la
  // partita di un altro, né una bozza non ancora rilasciata.
  const { data, error } = await getSupabaseAdmin()
    .from('matches')
    .select('meta, stats, log, match, coach_rating, coach_comment, coach_summary, coach_worked_well, coach_to_improve, coach_next_goal, ai_commentary')
    .eq('id', params.id)
    .eq('athlete_id', athlete.athleteId)
    .eq('published_to_athlete', true)
    .single();

  if (error || !data) {
    return Response.json({ error: 'Partita non trovata' }, { status: 404 });
  }

  return Response.json({ match: data });
}
