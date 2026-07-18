// FILE: /app/api/billing/sync/route.js
// Rilegge l'abbonamento direttamente da Stripe e aggiorna il database.
// Serve soprattutto una tantum, per sistemare subito gli abbonamenti già
// attivi creati prima della correzione del campo current_period_end
// (che Stripe ha spostato da marzo 2025), senza dover aspettare il
// prossimo rinnovo automatico.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

let _stripe = null;
function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}
let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

function getPeriodEnd(sub) {
  const fromItem = sub.items?.data?.[0]?.current_period_end;
  return fromItem ?? sub.current_period_end ?? null;
}
function getPeriodStart(sub) {
  const fromItem = sub.items?.data?.[0]?.current_period_start;
  return fromItem ?? sub.current_period_start ?? null;
}

export async function POST(request) {
  const { coachId } = await request.json();

  const { data: coach, error: coachErr } = await getSupabaseAdmin()
    .from('coaches')
    .select('stripe_subscription_id')
    .eq('id', coachId)
    .single();

  if (coachErr || !coach || !coach.stripe_subscription_id) {
    return Response.json({ error: 'Nessun abbonamento collegato' }, { status: 404 });
  }

  try {
    const sub = await getStripe().subscriptions.retrieve(coach.stripe_subscription_id, { expand: ['items'] });
    const periodEndUnix = getPeriodEnd(sub);
    const periodStartUnix = getPeriodStart(sub);

    await getSupabaseAdmin().from('coaches').update({
      subscription_status: sub.status,
      current_period_end: periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null,
      current_period_start: periodStartUnix ? new Date(periodStartUnix * 1000).toISOString() : null,
      cancel_at_period_end: !!sub.cancel_at_period_end,
    }).eq('id', coachId);

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: 'Stripe: ' + err.message }, { status: 500 });
  }
}
