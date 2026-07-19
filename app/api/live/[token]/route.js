// FILE: /app/api/live/[token]/route.js
// Pubblica, NESSUN login richiesto — è il punto d'accesso del link Live.
// Espone SOLO il sottoinsieme di dati pensato per essere visto da genitori/
// accompagnatori: punteggio, servizio, durata, statistiche di base. Mai i
// dati tecnici dettagliati (log colpo-per-colpo, zone, note del maestro,
// analisi AI) — quelli restano riservati allo staff dell'Academy.

import { createClient } from '@supabase/supabase-js';
import { getCurrentServer } from '../../../../lib/matchEngine';

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

function computeBasicTotals(stats) {
  // Totale winner/errori dell'allievo su TUTTI i colpi insieme — un numero
  // solo, non la classifica per tipo di colpo (quella resta riservata).
  let winner = 0, errori = 0, ace = 0, doppiFalli = 0;
  Object.entries(stats).forEach(([key, val]) => {
    if (key === 'servizio') {
      ace += val.ace?.allievo || 0;
      doppiFalli += val.doppio_fallo?.allievo || 0;
      return;
    }
    const collectLeaves = (node) => {
      if (node && typeof node === 'object') {
        if ('winner' in node && 'errori_forzati' in node && 'errori_non_forzati' in node) {
          winner += node.winner.allievo || 0;
          errori += (node.errori_forzati.allievo || 0) + (node.errori_non_forzati.allievo || 0);
        } else {
          Object.values(node).forEach(collectLeaves);
        }
      }
    };
    collectLeaves(val);
  });
  return { winner, errori, ace, doppiFalli };
}

export async function GET(request, { params }) {
  const { token } = params;
  if (!token) {
    return Response.json({ error: 'Link non valido' }, { status: 400 });
  }

  const { data: match, error } = await getSupabaseAdmin()
    .from('matches')
    .select('meta, stats, match, is_live, created_at')
    .eq('live_token', token)
    .single();

  if (error || !match) {
    return Response.json({ error: 'Partita non trovata. Il link potrebbe non essere più valido.' }, { status: 404 });
  }

  if (!match.is_live) {
    return Response.json({ error: 'Il maestro ha disattivato la condivisione di questa partita.' }, { status: 403 });
  }

  const ms = match.match;
  const meta = match.meta;
  const isFinished = !!(ms && ms.matchOver);

  const currentServer = (ms && !isFinished) ? getCurrentServer(ms, meta.firstServer || 'allievo') : null;

  const startedAt = meta.startedAt || null;
  const endedAt = meta.endedAt || null;
  const durationMin = startedAt
    ? Math.max(0, Math.round(((isFinished && endedAt ? endedAt : Date.now()) - startedAt) / 60000))
    : null;

  const basic = computeBasicTotals(match.stats);

  return Response.json({
    allievo: meta.allievo,
    avversario: meta.avversario,
    torneo: meta.torneo || null,
    data: meta.data,
    formatLabel: meta.formatLabel || null,
    superficie: meta.superficie || null,
    finished: isFinished,
    score: ms ? {
      setsWon: ms.setsWon,
      completedSets: ms.completedSets,
      currentSetGames: ms.currentSetGames,
      currentGamePoints: ms.currentGamePoints,
      inTiebreak: ms.inTiebreak,
      tiebreakPoints: ms.tiebreakPoints,
      winner: ms.winner || null,
    } : null,
    currentServer,
    durationMin,
    basicStats: basic,
  });
}
