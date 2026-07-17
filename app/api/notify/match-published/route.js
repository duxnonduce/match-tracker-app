// FILE: /app/api/notify/match-published/route.js
// Chiamata dal browser del maestro subito dopo aver pubblicato una
// partita. Manda email + notifica push SOLO se la partita risulta
// davvero pubblicata (doppio controllo lato server).

import { createClient } from '@supabase/supabase-js';
import { sendMatchPublishedEmail } from '../../../../lib/email';
import { sendPushToOwner } from '../../../../lib/push';

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

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
    getSupabaseAdmin().from('athletes').select('email, full_name').eq('id', match.athlete_id).single(),
    getSupabaseAdmin().from('coaches').select('first_name, last_name, academy_name').eq('id', match.coach_id).single(),
  ]);

  const coachName = coach?.academy_name || [coach?.first_name, coach?.last_name].filter(Boolean).join(' ');
  const matchLabel = match.meta?.data ? `partita del ${match.meta.data}` : 'una nuova partita';

  const results = await Promise.allSettled([
    athlete?.email
      ? sendMatchPublishedEmail({ toEmail: athlete.email, athleteName: athlete.full_name, coachName, matchLabel: `partita del ${match.meta?.data}` })
      : Promise.resolve('nessuna email'),
    sendPushToOwner('athlete', match.athlete_id, {
      title: 'Nuova partita disponibile 🎾',
      body: `${coachName || 'Il tuo maestro'} ha pubblicato ${matchLabel}.`,
      url: `/allievo/match/${matchId}`,
    }),
  ]);

  return Response.json({ ok: true, email: results[0].status, push: results[1].status });
}
