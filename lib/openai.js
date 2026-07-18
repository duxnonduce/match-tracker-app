// FILE: /lib/openai.js
// Helper server-side per generare il commento tecnico AI. Import SOLO da
// codice server (API routes) — mai da componenti 'use client'.

const DEFAULT_MODEL = 'gpt-4o-mini'; // economico e adatto a questo compito (scrittura da dati già pronti, non ragionamento complesso)

const SYSTEM_PROMPT = `Sei un allenatore di tennis esperto che scrive un breve commento tecnico-tattico su una partita appena giocata da un tuo allievo.

Regole fondamentali:
- Basati ESCLUSIVAMENTE sui dati forniti. Non inventare episodi, numeri o dettagli che non siano nei dati.
- Se un dato non è disponibile o è troppo scarso per dire qualcosa di sensato, semplicemente non parlarne — non tentare di riempire il vuoto.
- Scrivi in italiano, con tono da allenatore: diretto, costruttivo, concreto. Non essere generico né usare frasi fatte.
- Individua pattern tattici (es. un colpo che regge bene ma cede nei momenti importanti, un lato del campo più debole, un problema ricorrente sulla seconda di servizio) invece di limitarti a elencare i numeri.
- Lunghezza: 4-6 frasi in un unico paragrafo, oppure un breve paragrafo più un suggerimento pratico finale per il prossimo allenamento.
- Non ripetere meccanicamente ogni numero: usali per sostenere un'osservazione tattica.`;

function buildPromptText(digest) {
  const lines = [];
  lines.push(`Partita: ${digest.allievo} vs ${digest.avversario} (${digest.formatLabel || 'formato non specificato'})`);
  if (digest.setScore) lines.push(`Punteggio: ${digest.setScore}`);
  lines.push(`Episodi totali registrati: ${digest.totalPoints}`);

  lines.push(`\nRendimento per colpo di ${digest.allievo} (winner / errori forzati / errori non forzati / netto):`);
  digest.shotBreakdown.forEach(r => {
    lines.push(`- ${r.label}: ${r.winner}W / ${r.errori_forzati}EF / ${r.errori_non_forzati}ENF (netto ${r.net >= 0 ? '+' : ''}${r.net})`);
  });

  lines.push(`\nRisposta:`);
  digest.rispostaBreakdown.forEach(r => {
    lines.push(`- ${r.fase}: ${r.winner}W / ${r.errori_forzati}EF / ${r.errori_non_forzati}ENF`);
  });

  lines.push(`\nServizio: ${digest.servizio.ace} ace, ${digest.servizio.doppiFalli} doppi falli.`);
  if (digest.serveStatsAvanzate) {
    const s = digest.serveStatsAvanzate;
    lines.push(`Statistiche servizio avanzate: ${s.firstInPct ?? '—'}% prime in campo, ${s.wonOnFirstPct ?? '—'}% punti vinti con la prima, ${s.wonOnSecondPct ?? '—'}% punti vinti con la seconda.`);
    if (s.bpFaced > 0) lines.push(`Palle break subite: ${s.bpFaced}, salvate: ${s.bpSaved} (${s.bpSavedPct ?? '—'}%).`);
    if (s.bpConverted > 0) lines.push(`Palle break convertite in risposta: ${s.bpConverted}.`);
  }

  if (digest.zoneErrori) {
    const zoneLabels = { lungo: 'lunga', largo_sx: 'larga sul lato sinistro', largo_dx: 'larga sul lato destro', rete: 'in rete' };
    const zoneParts = Object.entries(digest.zoneErrori.conteggio).map(([k, v]) => `${zoneLabels[k] || k}: ${v}`);
    lines.push(`\nZona dove finiscono gli errori (${digest.zoneErrori.totale} totali con zona registrata): ${zoneParts.join(', ')}.`);
  }

  if (digest.direzioni) {
    lines.push(`Direzione dei colpi: ${digest.direzioni.lungolinea} lungolinea, ${digest.direzioni.diagonale} diagonale.`);
  }

  return lines.join('\n');
}

/**
 * Genera il commento tecnico. Ritorna il testo, o lancia un errore con un
 * messaggio comprensibile se la chiamata a OpenAI fallisce.
 */
export async function generateMatchCommentary(digest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY non configurata sul server.');
  }

  const promptText = buildPromptText(digest);
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: promptText },
      ],
      temperature: 0.6,
      max_tokens: 500,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenAI ha risposto con un errore (${res.status}): ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('OpenAI non ha restituito alcun testo.');
  }
  return text;
}
