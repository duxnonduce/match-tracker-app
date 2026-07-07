// FILE: /app/api/coach/athletes/route.js
// Il maestro (loggato con Supabase Auth) aggiunge un nuovo allievo.
// Qui applichiamo il controllo della quota del pacchetto acquistato.

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generatePin() {
  // PIN numerico a 6 cifre, es. "042817"
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request) {
  // In produzione: verifica il JWT Supabase del maestro dall'header
  // Authorization e ricava coachId da lì (Supabase fornisce helper per
  // farlo sia in Next.js che in altri framework — vedi doc "Server-Side Auth").
  const { coachId, fullName, birthDate, phone, email, notes } = await request.json();

  if (!coachId || !fullName) {
    return Response.json({ error: 'Dati mancanti' }, { status: 400 });
  }

  // 1) verifica quota del piano
  const { data: coach, error: coachErr } = await supabaseAdmin
    .from('coaches')
    .select('athlete_quota, subscription_status')
    .eq('id', coachId)
    .single();

  if (coachErr || !coach) {
    return Response.json({ error: 'Maestro non trovato' }, { status: 404 });
  }
  if (coach.subscription_status !== 'active') {
    return Response.json({ error: 'Abbonamento non attivo' }, { status: 402 });
  }

  const { count } = await supabaseAdmin
    .from('athletes')
    .select('*', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .eq('active', true);

  if (count >= coach.athlete_quota) {
    return Response.json(
      { error: `Hai raggiunto il limite di ${coach.athlete_quota} allievi del tuo pacchetto. Fai upgrade per aggiungerne altri.` },
      { status: 403 }
    );
  }

  // 2) genera PIN, salva solo l'hash
  const pin = generatePin();
  const pinHash = bcrypt.hashSync(pin, 10);

  const { data: athlete, error } = await supabaseAdmin
    .from('athletes')
    .insert({
      coach_id: coachId,
      full_name: fullName,
      birth_date: birthDate || null,
      phone: phone || null,
      email: email || null,
      notes: notes || null,
      pin_hash: pinHash,
    })
    .select('id, full_name, created_at')
    .single();

  if (error) {
    return Response.json({ error: 'Errore creazione allievo' }, { status: 500 });
  }

  // Il PIN in chiaro viene restituito UNA SOLA VOLTA qui: mostralo al
  // maestro a schermo con un avviso "salvalo/comunicalo ora, non potrai
  // rivederlo" (potrà solo rigenerarlo, invalidando quello vecchio).
  return Response.json({ athlete, pin });
}
