// FILE: /app/api/billing/checkout/route.js
// Il maestro sceglie un pacchetto (10/30/50/illimitate partite al mese)
// e viene mandato alla pagina di pagamento ospitata da Stripe.

import Stripe from 'stripe';

let _stripe = null;
function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// Questi ID li ottieni da Stripe Dashboard → Product catalog, dopo aver
// creato i 4 prodotti in abbonamento.
const PRICE_IDS = {
  base10: process.env.STRIPE_PRICE_BASE10,
  plus30: process.env.STRIPE_PRICE_PLUS30,
  pro50: process.env.STRIPE_PRICE_PRO50,
  oro: process.env.STRIPE_PRICE_ORO,
};

export async function POST(request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: 'STRIPE_SECRET_KEY non configurata sul server' }, { status: 500 });
  }
  if (!process.env.APP_URL) {
    return Response.json({ error: 'APP_URL non configurata sul server' }, { status: 500 });
  }

  const { coachId, coachEmail, plan } = await request.json();

  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    return Response.json({ error: `Pacchetto "${plan}" non valido o STRIPE_PRICE_${plan.toUpperCase()} non configurata` }, { status: 400 });
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'subscription',
      customer_email: coachEmail,
      line_items: [{ price: priceId, quantity: 1 }],
      // Passiamo coachId e piano nei metadata: li leggeremo nel webhook
      // per sapere a chi assegnare l'abbonamento.
      metadata: { coachId, plan },
      subscription_data: { metadata: { coachId, plan } },
      success_url: `${process.env.APP_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.APP_URL}/dashboard?checkout=cancel`,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    return Response.json({ error: 'Stripe: ' + err.message }, { status: 500 });
  }
}
