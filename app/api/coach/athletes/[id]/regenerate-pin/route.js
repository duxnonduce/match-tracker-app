// FILE: /app/api/coach/athletes/[id]/regenerate-pin/route.js

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request, { params }) {
  const { coachId } = await request.json();
  if (!coachId) {
    return Response.json({ error: 'Dati mancanti' }, { status: 400 });
  }

  // Verifica che l'allievo appartenga davvero a questo maestro prima di toccarlo.
  const { data: athlete, error: findErr } = await supabaseAdmin
    .from('athletes')
    .select('id, coach_id, full_name')
    .eq('id', params.id)
    .single();

  if (findErr || !athlete || athlete.coach_id !== coachId) {
    return Response.json({ error: 'Allievo non trovato' }, { status: 404 });
  }

  const pin = generatePin();
  const pinHash = bcrypt.hashSync(pin, 10);

  const { error } = await supabaseAdmin
    .from('athletes')
    .update({ pin_hash: pinHash })
    .eq('id', params.id);

  if (error) {
    return Response.json({ error: 'Errore nella rigenerazione del PIN' }, { status: 500 });
  }

  // Il vecchio PIN smette di funzionare da subito (l'hash è stato sovrascritto).
  return Response.json({ pin, athleteName: athlete.full_name });
}
