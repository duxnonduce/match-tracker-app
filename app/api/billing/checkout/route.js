import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  basic20: process.env.STRIPE_PRICE_BASIC20,
  plus50: process.env.STRIPE_PRICE_PLUS50,
  pro100: process.env.STRIPE_PRICE_PRO100,
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
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: coachEmail,
      line_items: [{ price: priceId, quantity: 1 }],
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
