// FILE: /app/api/notify/goal-published/route.js
// Chiamata dal browser del maestro subito dopo aver pubblicato un
// obiettivo. Solo notifica push (gli obiettivi non hanno un template email).

import { createClient } from '@supabase/supabase-js';
import { sendPushToOwner } from '../../../../lib/push';

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

export async function POST(request) {
  const { goalId } = await request.json();
  if (!goalId) {
    return Response.json({ error: 'goalId mancante' }, { status: 400 });
  }

  const { data: goal, error } = await getSupabaseAdmin()
    .from('athlete_goals')
    .select('title, published_to_athlete, athlete_id, academy_id')
    .eq('id', goalId)
    .single();

  if (error || !goal || !goal.published_to_athlete) {
    return Response.json({ error: 'Obiettivo non trovato o non pubblicato' }, { status: 404 });
  }

  const { data: coach } = await getSupabaseAdmin()
    .from('academies').select('first_name, last_name, academy_name').eq('id', goal.academy_id).single();
  const coachName = coach?.academy_name || [coach?.first_name, coach?.last_name].filter(Boolean).join(' ');

  const result = await sendPushToOwner('athlete', goal.athlete_id, {
    title: 'Nuovo obiettivo 🎯',
    body: `${coachName || 'Il tuo maestro'} ti ha assegnato: "${goal.title}"`,
    url: '/allievo/dashboard',
  });

  return Response.json({ ok: true, push: result });
}
