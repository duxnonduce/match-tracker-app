// FILE: /app/api/ai/generate-commentary/route.js
// Genera il commento tecnico AI per una partita, su richiesta esplicita
// del maestro (mai automatico — ogni chiamata costa, meglio che decida
// lui quando generarlo). Il risultato viene salvato sulla partita, così
// non va rigenerato ad ogni apertura del report.

import { createClient } from '@supabase/supabase-js';
import { computeMatchDigest } from '../../../../lib/matchEngine';
import { generateMatchCommentary } from '../../../../lib/openai';

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

const MIN_EPISODES = 10; // stessa soglia dell'analisi automatica: sotto questa, il commento sarebbe inaffidabile

export async function POST(request) {
  const { matchId, academyId } = await request.json();
  if (!matchId || !academyId) {
    return Response.json({ error: 'Dati mancanti' }, { status: 400 });
  }

  const { data: match, error } = await getSupabaseAdmin()
    .from('matches')
    .select('meta, stats, log, match, academy_id')
    .eq('id', matchId)
    .single();

  if (error || !match) {
    return Response.json({ error: 'Partita non trovata' }, { status: 404 });
  }
  if (match.academy_id !== academyId) {
    return Response.json({ error: 'Non autorizzato' }, { status: 403 });
  }
  if (!match.log || match.log.length < MIN_EPISODES) {
    return Response.json({ error: `Servono almeno ${MIN_EPISODES} episodi registrati per generare un commento affidabile (ce ne sono ${match.log?.length || 0}).` }, { status: 400 });
  }

  try {
    const digest = computeMatchDigest(match);
    const commentary = await generateMatchCommentary(digest);

    const { error: updateErr } = await getSupabaseAdmin()
      .from('matches')
      .update({ ai_commentary: commentary, ai_commentary_generated_at: new Date().toISOString() })
      .eq('id', matchId);

    if (updateErr) throw updateErr;

    return Response.json({ ok: true, commentary });
  } catch (err) {
    return Response.json({ error: err.message || 'Errore nella generazione del commento' }, { status: 500 });
  }
}
