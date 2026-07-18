// FILE: /app/api/notify/training-published/route.js

import { createClient } from '@supabase/supabase-js';
import { sendTrainingPublishedEmail } from '../../../../lib/email';
import { sendPushToOwner } from '../../../../lib/push';

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

const SHOT_LABELS = {
  dritto: 'Diritto', rovescio: 'Rovescio', servizio: 'Servizio', volee: 'Volée',
  smash: 'Smash', dropshot: 'Drop Shot', back: 'Back', cesto: 'Cesto/Multipalla',
};

export async function POST(request) {
  const { sessionId } = await request.json();
  if (!sessionId) {
    return Response.json({ error: 'sessionId mancante' }, { status: 400 });
  }

  const { data: session, error } = await getSupabaseAdmin()
    .from('training_sessions')
    .select('shot_type, published_to_athlete, athlete_id, academy_id')
    .eq('id', sessionId)
    .single();

  if (error || !session || !session.published_to_athlete) {
    return Response.json({ error: 'Allenamento non trovato o non pubblicato' }, { status: 404 });
  }

  const [{ data: athlete }, { data: coach }] = await Promise.all([
    getSupabaseAdmin().from('athletes').select('email, full_name').eq('id', session.athlete_id).single(),
    getSupabaseAdmin().from('academies').select('first_name, last_name, academy_name').eq('id', session.academy_id).single(),
  ]);

  const coachName = coach?.academy_name || [coach?.first_name, coach?.last_name].filter(Boolean).join(' ');
  const shotLabel = SHOT_LABELS[session.shot_type] || session.shot_type;

  const results = await Promise.allSettled([
    athlete?.email
      ? sendTrainingPublishedEmail({ toEmail: athlete.email, athleteName: athlete.full_name, coachName, shotLabel })
      : Promise.resolve('nessuna email'),
    sendPushToOwner('athlete', session.athlete_id, {
      title: 'Nuovo allenamento disponibile 🎯',
      body: `${coachName || 'Il tuo maestro'} ha pubblicato una sessione di ${shotLabel}.`,
      url: `/allievo/training/${sessionId}`,
    }),
  ]);

  return Response.json({ ok: true, email: results[0].status, push: results[1].status });
}
