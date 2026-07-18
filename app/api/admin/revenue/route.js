// FILE: /app/api/admin/revenue/route.js
// Incassi e fatture — presi DAVVERO da Stripe (l'app non tiene una sua
// copia dei pagamenti, sarebbe facile farla disallineare). Quello che
// Stripe chiama "invoice" qui viene mostrato come "fattura": è il record
// di pagamento reale, ma NON è automaticamente una fattura elettronica
// italiana — quella resta da gestire con il tuo commercialista/sistema di
// fatturazione se la generi separatamente.

import Stripe from 'stripe';
import { requirePlatformAdmin, getAdminSupabaseClient } from '../../../../lib/platformAdminAuth';

let _stripe = null;
function getStripe() {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

const PRICE_TO_PLAN = {
  [process.env.STRIPE_PRICE_BASE10]: 'base10',
  [process.env.STRIPE_PRICE_PLUS30]: 'plus30',
  [process.env.STRIPE_PRICE_PRO50]: 'pro50',
  [process.env.STRIPE_PRICE_ORO]: 'oro',
};

// Sotto quanti record ci fermiamo di paginare Stripe: abbondante per una
// piattaforma di queste dimensioni, evita comunque un ciclo senza fine.
const MAX_INVOICES = 1000;

async function fetchAllInvoices(createdGte) {
  const stripe = getStripe();
  let invoices = [];
  let startingAfter;
  while (invoices.length < MAX_INVOICES) {
    const page = await stripe.invoices.list({
      limit: 100,
      starting_after: startingAfter,
      created: createdGte ? { gte: createdGte } : undefined,
    });
    invoices = invoices.concat(page.data);
    if (!page.has_more || page.data.length === 0) break;
    startingAfter = page.data[page.data.length - 1].id;
  }
  return invoices;
}

export async function POST(request) {
  const admin = await requirePlatformAdmin(request);
  if (!admin) {
    return Response.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return Response.json({ error: 'STRIPE_SECRET_KEY non configurata sul server' }, { status: 500 });
  }

  const { period } = await request.json().catch(() => ({}));

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  // Guardiamo di default gli ultimi 15 mesi: copre l'anno corrente + un po'
  // di storico, senza scaricare tutta la vita dell'account ad ogni apertura.
  const lookback = new Date(now);
  lookback.setMonth(lookback.getMonth() - 15);
  const createdGte = Math.floor((period === 'all' ? new Date(2020, 0, 1) : lookback).getTime() / 1000);

  const sb = getAdminSupabaseClient();
  const { data: academies } = await sb
    .from('academies')
    .select('id, academy_name, email, stripe_customer_id, is_manual_override, manual_override_reason, plan_tier, subscription_status');

  const byCustomerId = {};
  (academies || []).forEach(a => { if (a.stripe_customer_id) byCustomerId[a.stripe_customer_id] = a; });

  let invoices;
  try {
    invoices = await fetchAllInvoices(createdGte);
  } catch (err) {
    return Response.json({ error: 'Stripe: ' + err.message }, { status: 500 });
  }

  const transactions = invoices.map(inv => {
    const academy = byCustomerId[inv.customer] || null;
    const planId = inv.lines?.data?.[0]?.price?.id;
    return {
      id: inv.id,
      date: new Date(inv.created * 1000).toISOString(),
      academyId: academy?.id || null,
      academyName: academy?.academy_name || inv.customer_name || inv.customer_email || '(sconosciuta)',
      amount: (inv.amount_paid ?? inv.amount_due ?? 0) / 100,
      currency: (inv.currency || 'eur').toUpperCase(),
      status: inv.status, // 'paid' | 'open' | 'draft' | 'uncollectible' | 'void'
      plan: PRICE_TO_PLAN[planId] || null,
      hostedInvoiceUrl: inv.hosted_invoice_url || null,
    };
  });

  const paid = transactions.filter(t => t.status === 'paid');
  const totalRevenue = paid.reduce((s, t) => s + t.amount, 0);
  const monthRevenue = paid.filter(t => new Date(t.date) >= startOfMonth).reduce((s, t) => s + t.amount, 0);
  const yearRevenue = paid.filter(t => new Date(t.date) >= startOfYear).reduce((s, t) => s + t.amount, 0);

  const byPlan = {};
  paid.forEach(t => {
    const key = t.plan || 'sconosciuto';
    byPlan[key] = (byPlan[key] || 0) + t.amount;
  });

  const payingAcademies = (academies || []).filter(a => a.subscription_status === 'active' && !a.is_manual_override);
  const freeAcademies = (academies || []).filter(a => a.is_manual_override);

  const openInvoices = transactions.filter(t => t.status === 'open');
  const failedInvoices = transactions.filter(t => t.status === 'uncollectible');

  return Response.json({
    totals: {
      total: totalRevenue,
      month: monthRevenue,
      year: yearRevenue,
      payingCount: payingAcademies.length,
      freeCount: freeAcademies.length,
    },
    byPlan,
    transactions: transactions.sort((a, b) => new Date(b.date) - new Date(a.date)),
    openInvoices,
    failedInvoices,
    freeAcademies: freeAcademies.map(a => ({ id: a.id, academy_name: a.academy_name, email: a.email, plan_tier: a.plan_tier, manual_override_reason: a.manual_override_reason })),
  });
}
