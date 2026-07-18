// FILE: /app/api/coach/athletes/route.js
// Il maestro (loggato con Supabase Auth) aggiunge un nuovo allievo.
// Nessun limite sul numero di allievi: verifichiamo solo che
// l'abbonamento sia attivo, e validiamo il codice fiscale contro
// nome/cognome/data di nascita.

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { validateCodiceFiscale } from '../../../../lib/codiceFiscale';

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

function generatePin() {
  // PIN numerico a 6 cifre, es. "042817"
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request) {
  // In produzione: verifica il JWT Supabase del maestro dall'header
  // Authorization e ricava coachId da lì (Supabase fornisce helper per
  // farlo sia in Next.js che in altri framework — vedi doc "Server-Side Auth").
  const { coachId, firstName, lastName, birthDate, phone, email, notes, dominantHand, fiscalCode, parentalConsentConfirmed } = await request.json();

  if (!coachId || !firstName || !lastName) {
    return Response.json({ error: 'Dati mancanti' }, { status: 400 });
  }
  if (!parentalConsentConfirmed) {
    return Response.json({ error: 'Devi confermare di avere il consenso del genitore/tutore (se l\'allievo è minorenne) prima di procedere.' }, { status: 400 });
  }

  // 1) verifica solo che l'abbonamento sia attivo — non c'è più un limite
  // sul numero di allievi (il piano ora limita le PARTITE registrate, non
  // gli allievi: vedi il trigger check_match_quota() sul database).
  const { data: coach, error: coachErr } = await getSupabaseAdmin()
    .from('coaches')
    .select('subscription_status')
    .eq('id', coachId)
    .single();

  if (coachErr || !coach) {
    return Response.json({ error: 'Maestro non trovato' }, { status: 404 });
  }
  if (coach.subscription_status !== 'active') {
    return Response.json({ error: 'Abbonamento non attivo: rinnova per aggiungere allievi.' }, { status: 402 });
  }

  // 2) valida il codice fiscale (se fornito) contro i dati anagrafici
  if (fiscalCode) {
    const { valid, errors } = validateCodiceFiscale(fiscalCode, { firstName, lastName, birthDate });
    if (!valid) {
      return Response.json({ error: 'Codice fiscale non valido: ' + errors.join(' ') }, { status: 400 });
    }
  }

  // 3) genera PIN, salva solo l'hash
  const pin = generatePin();
  const pinHash = bcrypt.hashSync(pin, 10);
  const fullName = `${firstName} ${lastName}`.trim();

  const { data: athlete, error } = await getSupabaseAdmin()
    .from('athletes')
    .insert({
      coach_id: coachId,
      full_name: fullName,
      birth_date: birthDate || null,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      dominant_hand: dominantHand || null,
      fiscal_code: fiscalCode ? fiscalCode.toUpperCase() : null,
      parental_consent_confirmed_at: new Date().toISOString(),
      pin_hash: pinHash,
    })
    .select('id, full_name, created_at')
    .single();

  if (error) {
    return Response.json({ error: 'Errore creazione allievo' }, { status: 500 });
  }

  // Il PIN in chiaro viene restituito UNA SOLA VOLTA qui: mostralo al
  // maestro a schermo con un avviso "salvalo/comunicalo ora, non potrai
  // rivederlo" (potrà solo rigenerarlo con l'apposito pulsante).
  return Response.json({ athlete, pin });
}
