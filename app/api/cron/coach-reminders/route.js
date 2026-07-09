// FILE: /app/api/cron/coach-reminders/route.js
// Pensato per essere chiamato una volta al giorno (vedi vercel.json).
// Manda al maestro un promemoria push se: ha partite/allenamenti/obiettivi
// ancora in bozza da almeno 2 giorni, oppure il suo abbonamento è in
// ritardo di pagamento. Un solo promemoria per maestro per esecuzione,
// anche se ha più cose da sistemare, per non essere invadente.

import { createClient } from '@supabase/supabase-js';
import { sendPushToOwner } from '../../../../lib/push';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

  // 1) maestri con abbonamento in ritardo di pagamento
  const { data: pastDueCoaches } = await supabaseAdmin
    .from('coaches')
    .select('id')
    .eq('subscription_status', 'past_due');

  let remindersSent = 0;
  for (const c of pastDueCoaches || []) {
    await sendPushToOwner('coach', c.id, {
      title: '⚠️ Pagamento in ritardo',
      body: 'Il tuo abbonamento PointLab ha un problema di pagamento: sistemalo per non perdere l\'accesso.',
      url: '/dashboard',
    });
    remindersSent++;
  }

  // 2) maestri con bozze (partite/allenamenti/obiettivi) vecchie di 2+ giorni
  const [{ data: draftMatches }, { data: draftTrainings }, { data: draftGoals }] = await Promise.all([
    supabaseAdmin.from('matches').select('coach_id').eq('published_to_athlete', false).lte('created_at', twoDaysAgo),
    supabaseAdmin.from('training_sessions').select('coach_id').eq('published_to_athlete', false).lte('created_at', twoDaysAgo),
    supabaseAdmin.from('athlete_goals').select('coach_id').eq('published_to_athlete', false).lte('created_at', twoDaysAgo),
  ]);

  const draftCounts = {};
  for (const row of [...(draftMatches || []), ...(draftTrainings || []), ...(draftGoals || [])]) {
    draftCounts[row.coach_id] = (draftCounts[row.coach_id] || 0) + 1;
  }

  for (const [coachId, count] of Object.entries(draftCounts)) {
    await sendPushToOwner('coach', coachId, {
      title: '📝 Bozze in attesa',
      body: `Hai ${count} tra partite, allenamenti e obiettivi non ancora pubblicati per i tuoi allievi.`,
      url: '/dashboard',
    });
    remindersSent++;
  }

  return Response.json({ ok: true, remindersSent });
}
