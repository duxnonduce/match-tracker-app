// FILE: /app/api/cron/renewal-reminders/route.js
// Pensato per essere chiamato una volta al giorno da un servizio esterno
// (Vercel Cron Jobs, o un cron gratuito come cron-job.org). Manda un
// promemoria a chi rinnova entro 3 giorni e non ne ha già ricevuto uno
// per questo ciclo.

import { createClient } from '@supabase/supabase-js';
import { sendRenewalReminderEmail } from '../../../../lib/email';

let _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabaseAdmin;
}

const PLAN_LABELS = { base10: 'Base', plus30: 'Plus', pro50: 'Pro', oro: 'Oro' };
const REMINDER_WINDOW_DAYS = 3;

function formatDateIt(iso) {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

export async function GET(request) {
  // Protezione semplice: solo chi conosce il segreto può far partire il cron.
  const auth = request.headers.get('authorization') || '';
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const { data: coaches, error } = await supabaseAdmin
    .from('coaches')
    .select('id, email, first_name, plan_tier, current_period_end, renewal_reminder_sent_at')
    .eq('subscription_status', 'active')
    .eq('cancel_at_period_end', false) // chi ha già annullato non deve ricevere "sta per rinnovarsi"
    .not('current_period_end', 'is', null)
    .lte('current_period_end', windowEnd.toISOString())
    .gte('current_period_end', now.toISOString())
    .is('renewal_reminder_sent_at', null);

  if (error) {
    return Response.json({ error: 'Errore database' }, { status: 500 });
  }

  let sent = 0;
  for (const coach of coaches || []) {
    try {
      await sendRenewalReminderEmail({
        toEmail: coach.email,
        coachName: coach.first_name,
        planLabel: PLAN_LABELS[coach.plan_tier] || coach.plan_tier,
        periodEndFormatted: formatDateIt(coach.current_period_end),
      });
      await getSupabaseAdmin().from('coaches').update({ renewal_reminder_sent_at: new Date().toISOString() }).eq('id', coach.id);
      sent++;
    } catch (e) {
      console.warn('invio promemoria fallito per', coach.id, e);
    }
  }

  return Response.json({ ok: true, checked: (coaches || []).length, sent });
}
