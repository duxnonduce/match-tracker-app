// FILE: /app/api/billing/plans/route.js
// Ritorna i prezzi VERI configurati su Stripe per i 3 pacchetti, così la
// dashboard non mostra mai un numero inventato o disallineato.

import Stripe from 'stripe';

let _stripe = null;
function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

const PRICE_IDS = {
  base10: process.env.STRIPE_PRICE_BASE10,
  plus30: process.env.STRIPE_PRICE_PLUS30,
  pro50: process.env.STRIPE_PRICE_PRO50,
  oro: process.env.STRIPE_PRICE_ORO,
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
        const price = await getStripe().prices.retrieve(priceId);
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
