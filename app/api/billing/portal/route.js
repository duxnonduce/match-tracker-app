// FILE: /app/api/billing/portal/route.js
// Crea un link verso il "Customer Portal" di Stripe, dove il maestro può
// vedere/scaricare le fatture passate e aggiornare il metodo di pagamento,
// senza che dobbiamo costruire nulla di tutto questo noi.
//
// ATTENZIONE — passo da fare UNA TANTUM su Stripe prima che funzioni:
// Stripe Dashboard → Settings → Billing → Customer portal → Activate.
// Senza quell'attivazione, questa chiamata restituisce un errore.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  const { coachId } = await request.json();

  const { data: coach, error } = await supabaseAdmin
    .from('coaches')
    .select('stripe_customer_id')
    .eq('id', coachId)
    .single();

  if (error || !coach || !coach.stripe_customer_id) {
    return Response.json({ error: 'Nessun cliente Stripe collegato (devi aver fatto almeno un acquisto).' }, { status: 404 });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: coach.stripe_customer_id,
      return_url: `${process.env.APP_URL}/dashboard`,
    });
    return Response.json({ url: session.url });
  } catch (err) {
    return Response.json({ error: 'Stripe: ' + err.message }, { status: 500 });
  }
}
