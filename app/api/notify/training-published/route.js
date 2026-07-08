// FILE: /app/api/notify/training-published/route.js

import { createClient } from '@supabase/supabase-js';
import { sendTrainingPublishedEmail } from '../../../../lib/email';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SHOT_LABELS = {
  dritto: 'Diritto', rovescio: 'Rovescio', servizio: 'Servizio', volee: 'Volée',
  smash: 'Smash', dropshot: 'Drop Shot', back: 'Back', cesto: 'Cesto/Multipalla',
};

export async function POST(request) {
  const { sessionId } = await request.json();
  if (!sessionId) {
    return Response.json({ error: 'sessionId mancante' }, { status: 400 });
  }

  const { data: session, error } = await supabaseAdmin
    .from('training_sessions')
    .select('shot_type, published_to_athlete, athlete_id, coach_id')
    .eq('id', sessionId)
    .single();

  if (error || !session || !session.published_to_athlete) {
    return Response.json({ error: 'Allenamento non trovato o non pubblicato' }, { status: 404 });
  }

  const [{ data: athlete }, { data: coach }] = await Promise.all([
    supabaseAdmin.from('athletes').select('email, full_name').eq('id', session.athlete_id).single(),
    supabaseAdmin.from('coaches').select('first_name, last_name, academy_name').eq('id', session.coach_id).single(),
  ]);

  if (!athlete?.email) {
    return Response.json({ ok: true, skipped: 'nessuna email per questo allievo' });
  }

  try {
    await sendTrainingPublishedEmail({
      toEmail: athlete.email,
      athleteName: athlete.full_name,
      coachName: coach?.academy_name || [coach?.first_name, coach?.last_name].filter(Boolean).join(' '),
      shotLabel: SHOT_LABELS[session.shot_type] || session.shot_type,
    });
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: 'Invio email fallito: ' + e.message }, { status: 500 });
  }
}
