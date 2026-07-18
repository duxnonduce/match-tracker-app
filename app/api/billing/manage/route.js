// FILE: /app/api/billing/manage/route.js
// Annulla (a fine periodo già pagato, non subito) o riattiva l'abbonamento.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../../../../lib/staffAuth';

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

export async function POST(request) {
  const { academyId, action } = await request.json();

  const staff = requireAdmin(request, academyId);
  if (!staff) {
    return Response.json({ error: 'Solo il Super Operatore può gestire l\'abbonamento.' }, { status: 403 });
  }

  if (!['cancel', 'reactivate'].includes(action)) {
    return Response.json({ error: 'Azione non valida' }, { status: 400 });
  }

  const { data: coach, error: coachErr } = await getSupabaseAdmin()
    .from('academies')
    .select('stripe_subscription_id')
    .eq('id', academyId)
    .single();

  if (coachErr || !coach || !coach.stripe_subscription_id) {
    return Response.json({ error: 'Nessun abbonamento trovato' }, { status: 404 });
  }

  try {
    const cancelAtPeriodEnd = action === 'cancel';
    const updated = await getStripe().subscriptions.update(coach.stripe_subscription_id, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });

    await getSupabaseAdmin().from('academies').update({
      cancel_at_period_end: cancelAtPeriodEnd,
      subscription_status: updated.status,
    }).eq('id', academyId);

    return Response.json({ ok: true, cancelAtPeriodEnd });
  } catch (err) {
    return Response.json({ error: 'Stripe: ' + err.message }, { status: 500 });
  }
}
