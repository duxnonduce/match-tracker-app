// FILE: /app/api/billing/webhook/route.js
// Stripe chiama QUESTO endpoint (non il browser del maestro) quando
// succede qualcosa all'abbonamento: pagamento riuscito, rinnovo, disdetta,
// cambio piano... È qui che teniamo sincronizzato il database con Stripe.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const QUOTA_BY_PLAN = { basic20: 20, plus50: 50, pro100: 100 };

export async function POST(request) {
  const sig = request.headers.get('stripe-signature');
  const rawBody = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return Response.json({ error: `Firma webhook non valida: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { coachId, plan } = session.metadata;
      await supabaseAdmin.from('coaches').update({
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        plan_tier: plan,
        athlete_quota: QUOTA_BY_PLAN[plan] || 0,
        subscription_status: 'active',
      }).eq('id', coachId);
      break;
    }

    // Copre sia i rinnovi automatici, sia i cambi di piano fatti dal
    // maestro (upgrade/downgrade), sia i pagamenti falliti (status
    // diventa 'past_due' — il maestro e i suoi allievi restano bloccati
    // finché non torna 'active').
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const plan = sub.metadata?.plan;
      const update = {
        subscription_status: sub.status, // 'active' | 'past_due' | 'canceled' | 'unpaid' | ...
        current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
        cancel_at_period_end: !!sub.cancel_at_period_end,
      };
      if (plan && QUOTA_BY_PLAN[plan]) {
        update.plan_tier = plan;
        update.athlete_quota = QUOTA_BY_PLAN[plan];
      }
      await supabaseAdmin.from('coaches').update(update).eq('stripe_subscription_id', sub.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await supabaseAdmin.from('coaches')
        .update({ subscription_status: 'canceled', athlete_quota: 0, cancel_at_period_end: false })
        .eq('stripe_subscription_id', sub.id);
      break;
    }

    default:
      break;
  }

  return Response.json({ received: true });
}

// Importante: questo endpoint deve ricevere il BODY GREZZO (non parsato
// come JSON) perché Stripe verifica la firma sul testo esatto ricevuto.
