// FILE: /app/api/athlete/matches/route.js
// L'allievo, una volta loggato con il PIN, chiama questo endpoint per
// vedere SOLO le proprie partite. Nota: nessuna route di scrittura è
// esposta a questo ruolo — è di sola lettura per design.

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

  // Filtro esplicito per athlete_id: è QUESTO il punto in cui si applica
  // la sicurezza per gli allievi (dato che bypassano RLS con la service key).
  const { data, error } = await supabaseAdmin
    .from('matches')
    .select('id, meta, stats, log, match, created_at')
    .eq('athlete_id', athlete.athleteId)
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: 'Errore database' }, { status: 500 });
  }

  return Response.json({ matches: data });
}
