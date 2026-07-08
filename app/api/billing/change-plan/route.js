// FILE: /app/api/billing/change-plan/route.js
// Il maestro passa da un pacchetto a un altro (già abbonato). Modifichiamo
// la sottoscrizione Stripe esistente invece di crearne una nuova: Stripe
// calcola da solo l'addebito/rimborso proporzionale (proration).

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PRICE_IDS = {
  basic20: process.env.STRIPE_PRICE_BASIC20,
  plus50: process.env.STRIPE_PRICE_PLUS50,
  pro100: process.env.STRIPE_PRICE_PRO100,
};
const QUOTA_BY_PLAN = { basic20: 20, plus50: 50, pro100: 100 };

// Da marzo 2025 Stripe ha spostato "current_period_end" dal livello
// abbonamento al livello della singola voce (item) dell'abbonamento.
function getPeriodEnd(sub) {
  const fromItem = sub.items?.data?.[0]?.current_period_end;
  return fromItem ?? sub.current_period_end ?? null;
}

export async function POST(request) {
  const { coachId, newPlan } = await request.json();

  const priceId = PRICE_IDS[newPlan];
  if (!priceId) {
    return Response.json({ error: 'Pacchetto non valido' }, { status: 400 });
  }

  const { data: coach, error: coachErr } = await supabaseAdmin
    .from('coaches')
    .select('stripe_subscription_id, athlete_quota, plan_tier')
    .eq('id', coachId)
    .single();

  if (coachErr || !coach || !coach.stripe_subscription_id) {
    return Response.json({ error: 'Nessun abbonamento attivo trovato' }, { status: 404 });
  }

  if (newPlan === coach.plan_tier) {
    return Response.json({ error: 'Sei già su questo pacchetto' }, { status: 400 });
  }

  // Se stai facendo un downgrade, controlliamo che il numero di allievi
  // attivi non superi la nuova quota, altrimenti si bloccherebbe da solo.
  if (QUOTA_BY_PLAN[newPlan] < QUOTA_BY_PLAN[coach.plan_tier]) {
    const { count } = await supabaseAdmin
      .from('athletes')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', coachId)
      .eq('active', true);
    if (count > QUOTA_BY_PLAN[newPlan]) {
      return Response.json(
        { error: `Hai ${count} allievi attivi: disattivane almeno ${count - QUOTA_BY_PLAN[newPlan]} prima di scendere a questo pacchetto.` },
        { status: 400 }
      );
    }
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(coach.stripe_subscription_id);
    const itemId = subscription.items.data[0].id;

    const updated = await stripe.subscriptions.update(coach.stripe_subscription_id, {
      items: [{ id: itemId, price: priceId }],
      proration_behavior: 'create_prorations',
      metadata: { coachId, plan: newPlan },
      expand: ['items'],
    });

    const periodEndUnix = getPeriodEnd(updated);

    // Aggiorniamo subito anche noi (il webhook arriverà comunque a
    // confermare, ma così l'interfaccia si aggiorna all'istante).
    await supabaseAdmin.from('coaches').update({
      plan_tier: newPlan,
      athlete_quota: QUOTA_BY_PLAN[newPlan],
      subscription_status: updated.status,
      current_period_end: periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null,
    }).eq('id', coachId);

    return Response.json({ ok: true, plan: newPlan });
  } catch (err) {
    return Response.json({ error: 'Stripe: ' + err.message }, { status: 500 });
  }
}
