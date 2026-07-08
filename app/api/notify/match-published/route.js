// FILE: /app/api/notify/match-published/route.js
// Chiamata dal browser del maestro subito dopo aver pubblicato una
// partita. Manda l'email SOLO se la partita risulta davvero pubblicata
// (doppio controllo lato server, non ci fidiamo del solo client).

import { createClient } from '@supabase/supabase-js';
import { sendMatchPublishedEmail } from '../../../../lib/email';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const { matchId } = await request.json();
  if (!matchId) {
    return Response.json({ error: 'matchId mancante' }, { status: 400 });
  }

  const { data: match, error } = await supabaseAdmin
    .from('matches')
    .select('meta, published_to_athlete, athlete_id, coach_id')
    .eq('id', matchId)
    .single();

  if (error || !match || !match.published_to_athlete) {
    return Response.json({ error: 'Partita non trovata o non pubblicata' }, { status: 404 });
  }

  const [{ data: athlete }, { data: coach }] = await Promise.all([
    supabaseAdmin.from('athletes').select('email, full_name').eq('id', match.athlete_id).single(),
    supabaseAdmin.from('coaches').select('first_name, last_name, academy_name').eq('id', match.coach_id).single(),
  ]);

  if (!athlete?.email) {
    // Non è un errore: semplicemente l'allievo non ha un'email registrata.
    return Response.json({ ok: true, skipped: 'nessuna email per questo allievo' });
  }

  try {
    await sendMatchPublishedEmail({
      toEmail: athlete.email,
      athleteName: athlete.full_name,
      coachName: coach?.academy_name || [coach?.first_name, coach?.last_name].filter(Boolean).join(' '),
      matchLabel: match.meta?.data ? `partita del ${match.meta.data}` : null,
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: 'Invio email fallito: ' + e.message }, { status: 500 });
  }
}
