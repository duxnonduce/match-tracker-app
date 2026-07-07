// FILE: /app/api/athlete/matches/[id]/route.js
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

export async function GET(request, { params }) {
  const athlete = getAthleteFromToken(request);
  if (!athlete) {
    return Response.json({ error: 'Non autenticato' }, { status: 401 });
  }

  // Doppio filtro (id della partita + athlete_id del token): un allievo
  // non può mai vedere la partita di un altro, anche indovinando un id.
  const { data, error } = await supabaseAdmin
    .from('matches')
    .select('meta, stats, log, match')
    .eq('id', params.id)
    .eq('athlete_id', athlete.athleteId)
    .single();

  if (error || !data) {
    return Response.json({ error: 'Partita non trovata' }, { status: 404 });
  }

  return Response.json({ match: data });
}
