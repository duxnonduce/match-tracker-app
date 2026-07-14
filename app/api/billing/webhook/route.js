// FILE: /app/api/billing/webhook/route.js
// Stripe chiama QUESTO endpoint (non il browser del maestro) quando
// succede qualcosa all'abbonamento: pagamento riuscito, rinnovo, disdetta,
// cambio piano... È qui che teniamo sincronizzato il database con Stripe,
// e da qui parte l'email di conferma abbonamento.

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { sendSubscriptionConfirmedEmail } from '../../../../lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// null = partite illimitate (piano Oro)
const MATCH_QUOTA_BY_PLAN = { base10: 10, plus30: 30, pro50: 50, oro: null };
const PLAN_LABELS = { base10: 'Base', plus30: 'Plus', pro50: 'Pro', oro: 'Oro' };

// Da marzo 2025 Stripe ha spostato "current_period_end"/"current_period_start"
// dal livello abbonamento al livello della singola voce (item). Questi
// helper leggono dal posto giusto, con un fallback al vecchio campo nel
// caso il tuo account usi ancora una versione API precedente.
function getPeriodEnd(sub) {
  const fromItem = sub.items?.data?.[0]?.current_period_end;
  return fromItem ?? sub.current_period_end ?? null;
}
function getPeriodStart(sub) {
  const fromItem = sub.items?.data?.[0]?.current_period_start;
  return fromItem ?? sub.current_period_start ?? null;
}

function formatDateIt(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

function quotaLabel(quota) {
  return quota == null ? 'illimitate' : String(quota);
}

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

      // Recuperiamo la sottoscrizione per sapere inizio/fine periodo da
      // mettere nell'email e da usare per il conteggio mensile delle partite.
      let periodEndIso = null, periodStartIso = null;
      try {
        const sub = await stripe.subscriptions.retrieve(session.subscription, { expand: ['items'] });
        const periodEndUnix = getPeriodEnd(sub);
        const periodStartUnix = getPeriodStart(sub);
        periodEndIso = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;
        periodStartIso = periodStartUnix ? new Date(periodStartUnix * 1000).toISOString() : null;
      } catch (e) { /* non bloccante: mandiamo comunque l'email senza data se fallisce */ }

      await supabaseAdmin.from('coaches').update({
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        plan_tier: plan,
        match_quota: MATCH_QUOTA_BY_PLAN[plan] ?? null,
        subscription_status: 'active',
        current_period_end: periodEndIso,
        current_period_start: periodStartIso,
        renewal_reminder_sent_at: null, // reset: nuovo ciclo, nuovo eventuale promemoria
      }).eq('id', coachId);

      try {
        const { data: coach } = await supabaseAdmin.from('coaches').select('email, first_name').eq('id', coachId).single();
        if (coach) {
          await sendSubscriptionConfirmedEmail({
            toEmail: coach.email,
            coachName: coach.first_name,
            planLabel: PLAN_LABELS[plan] || plan,
            quota: quotaLabel(MATCH_QUOTA_BY_PLAN[plan]),
            periodEndFormatted: formatDateIt(periodEndIso),
          });
        }
      } catch (e) {
        console.warn('invio email conferma abbonamento fallito (non bloccante):', e);
      }
      break;
    }

    // Copre sia i rinnovi automatici, sia i cambi di piano fatti dal
    // maestro (upgrade/downgrade), sia i pagamenti falliti (status
    // diventa 'past_due' — il maestro e i suoi allievi restano bloccati
    // finché non torna 'active'). È QUI che, ad ogni rinnovo mensile,
    // current_period_start si aggiorna e il conteggio delle partite
    // riparte automaticamente da zero.
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const plan = sub.metadata?.plan;
      const periodEndUnix = getPeriodEnd(sub);
      const periodStartUnix = getPeriodStart(sub);
      const newPeriodEndIso = periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null;
      const newPeriodStartIso = periodStartUnix ? new Date(periodStartUnix * 1000).toISOString() : null;

      const { data: existing } = await supabaseAdmin
        .from('coaches').select('current_period_end').eq('stripe_subscription_id', sub.id).single();
      const periodRolledOver = existing && existing.current_period_end !== newPeriodEndIso;

      const update = {
        subscription_status: sub.status, // 'active' | 'past_due' | 'canceled' | 'unpaid' | ...
        current_period_end: newPeriodEndIso,
        current_period_start: newPeriodStartIso,
        cancel_at_period_end: !!sub.cancel_at_period_end,
      };
      // NB: usiamo "hasOwnProperty" e non "MATCH_QUOTA_BY_PLAN[plan]" nell'if
      // perché il piano Oro ha quota null, che sarebbe falsy in un if diretto.
      if (plan && Object.prototype.hasOwnProperty.call(MATCH_QUOTA_BY_PLAN, plan)) {
        update.plan_tier = plan;
        update.match_quota = MATCH_QUOTA_BY_PLAN[plan];
      }
      // Azzeriamo il flag del promemoria SOLO se è iniziato davvero un nuovo
      // ciclo di fatturazione, non ad ogni modifica minore della sottoscrizione.
      if (periodRolledOver) update.renewal_reminder_sent_at = null;

      await supabaseAdmin.from('coaches').update(update).eq('stripe_subscription_id', sub.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await supabaseAdmin.from('coaches')
        .update({ subscription_status: 'canceled', match_quota: 0, cancel_at_period_end: false })
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
