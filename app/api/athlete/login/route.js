// FILE: /app/api/athlete/login/route.js  (Next.js App Router, esempio)
// Login dell'allievo: riceve un PIN, verifica contro l'hash salvato,
// e se corretto rilascia un token JWT "leggero" (non è un utente Supabase Auth).

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Questa chiave ha pieni poteri sul database: usarla SOLO lato server,
// mai esporla al browser.
let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

export async function POST(request) {
  const { pin } = await request.json();

  if (!pin || typeof pin !== 'string') {
    return Response.json({ error: 'PIN mancante' }, { status: 400 });
  }

  // Il PIN da solo non identifica la riga: dobbiamo scorrere gli atleti attivi
  // e confrontare l'hash. Per dataset grandi conviene invece generare PIN
  // univoci a livello globale e indicizzare un hash deterministico — per
  // iniziare, questo approccio semplice va benissimo.
  const { data: athletes, error } = await getSupabaseAdmin()
    .from('athletes')
    .select('id, academy_id, full_name, pin_hash, active')
    .eq('active', true);

  if (error) {
    return Response.json({ error: 'Errore database' }, { status: 500 });
  }

  const match = athletes.find(a => bcrypt.compareSync(pin, a.pin_hash));

  if (!match) {
    return Response.json({ error: 'PIN non valido' }, { status: 401 });
  }

  // Se il maestro non ha un abbonamento attivo (scaduto, pagamento fallito,
  // disdetto), blocchiamo l'accesso anche ai suoi allievi.
  const { data: coach } = await getSupabaseAdmin()
    .from('academies')
    .select('subscription_status, admin_status')
    .eq('id', match.academy_id)
    .single();

  if (!coach || coach.subscription_status !== 'active' || coach.admin_status !== 'active') {
    return Response.json({ error: 'Il tuo maestro non ha al momento un abbonamento attivo. Contattalo per maggiori informazioni.' }, { status: 403 });
  }

  // Token firmato con un segreto TUO (diverso dalle chiavi Supabase),
  // valido per 12 ore. Contiene solo ciò che serve per capire chi è.
  const token = jwt.sign(
    { athleteId: match.id, academyId: match.academy_id, role: 'athlete' },
    process.env.ATHLETE_JWT_SECRET,
    { expiresIn: '12h' }
  );

  return Response.json({
    token,
    athlete: { id: match.id, fullName: match.full_name }
  });
}
