// FILE: /app/api/athlete/matches/route.js
// L'allievo, una volta loggato con il PIN, chiama questo endpoint per
// vedere SOLO le proprie partite. Nota: nessuna route di scrittura è
// esposta a questo ruolo — è di sola lettura per design.

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
    return payload; // { athleteId, coachId, role }
  } catch (e) {
    return null; // token scaduto o non valido
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

  // Filtro esplicito per athlete_id: è QUESTO il punto in cui si applica
  // la sicurezza per gli allievi (dato che bypassano RLS con la service key).
  // published_to_athlete=true esclude le partite che il maestro non ha
  // ancora "rilasciato" (bozze con eventuale valutazione non finita).
  const { data, error } = await getSupabaseAdmin()
    .from('matches')
    .select('id, meta, stats, log, match, coach_rating, coach_comment, coach_summary, coach_worked_well, coach_to_improve, coach_next_goal, created_at')
    .eq('athlete_id', athlete.athleteId)
    .eq('published_to_athlete', true)
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: 'Errore database' }, { status: 500 });
  }

  return Response.json({ matches: data });
}
