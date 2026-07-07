// FILE: /app/api/billing/webhook/route.js
// Stripe chiama QUESTO endpoint (non il browser del maestro) quando
// succede qualcosa all'abbonamento: pagamento riuscito, rinnovo, disdetta...
// È qui che aggiorniamo davvero il piano/quota nel database.

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
    // Verifica che la chiamata arrivi davvero da Stripe (firma segreta
    // ottenuta quando configuri il webhook — vedi FASE 2 della guida).
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

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const status = sub.status === 'active' ? 'active' : sub.status; // 'past_due', 'canceled', ecc.
      await supabaseAdmin.from('coaches')
        .update({ subscription_status: status })
        .eq('stripe_subscription_id', sub.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await supabaseAdmin.from('coaches')
        .update({ subscription_status: 'canceled', athlete_quota: 0 })
        .eq('stripe_subscription_id', sub.id);
      break;
    }

    default:
      // altri eventi Stripe che non ci interessano: ignorali pure
      break;
  }

  return Response.json({ received: true });
}

// Importante: questo endpoint deve ricevere il BODY GREZZO (non parsato
// come JSON) perché Stripe verifica la firma sul testo esatto ricevuto.
// In Next.js App Router basta usare request.text() come sopra; se usi
// Express, ricordati di NON applicare express.json() su questa rotta.
