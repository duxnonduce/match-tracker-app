// FILE: /app/api/billing/plans/route.js
// Ritorna i prezzi VERI configurati su Stripe per i 3 pacchetti, così la
// dashboard non mostra mai un numero inventato o disallineato.

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICE_IDS = {
  basic20: process.env.STRIPE_PRICE_BASIC20,
  plus50: process.env.STRIPE_PRICE_PLUS50,
  pro100: process.env.STRIPE_PRICE_PRO100,
};

function formatAmount(cents, currency) {
  if (cents == null) return null;
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
}

export async function GET() {
  try {
    const entries = await Promise.all(
      Object.entries(PRICE_IDS).map(async ([plan, priceId]) => {
        if (!priceId) return [plan, null];
        const price = await stripe.prices.retrieve(priceId);
        return [plan, {
          amountCents: price.unit_amount,
          currency: price.currency,
          formatted: formatAmount(price.unit_amount, price.currency),
          interval: price.recurring?.interval || null, // 'month' | 'year'
        }];
      })
    );
    return Response.json({ plans: Object.fromEntries(entries) });
  } catch (err) {
    return Response.json({ error: 'Stripe: ' + err.message }, { status: 500 });
  }
}
