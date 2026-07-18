// FILE: /app/api/admin/academies/manage/route.js
// Un unico endpoint per tutte le azioni amministrative su un'Academy,
// selezionate col campo "action".

import { requirePlatformAdmin, getAdminSupabaseClient } from '../../../../../lib/platformAdminAuth';

const MATCH_QUOTA_BY_PLAN = { base10: 10, plus30: 30, pro50: 50, oro: null };

export async function POST(request) {
  const admin = await requirePlatformAdmin(request);
  if (!admin) {
    return Response.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const body = await request.json();
  const { academyId, action } = body;
  if (!academyId || !action) {
    return Response.json({ error: 'Dati mancanti' }, { status: 400 });
  }

  const sb = getAdminSupabaseClient();

  switch (action) {
    case 'update': {
      // body.fields = oggetto con i soli campi da aggiornare (dati anagrafici/fiscali/note)
      const allowed = [
        'academy_name', 'academy_city', 'academy_address',
        'ragione_sociale', 'partita_iva', 'codice_fiscale_azienda', 'codice_sdi', 'pec',
        'indirizzo', 'comune', 'cap', 'provincia', 'nazione',
        'email_amministrativa', 'telefono_amministrativo', 'internal_notes',
      ];
      const update = {};
      for (const k of allowed) {
        if (body.fields && Object.prototype.hasOwnProperty.call(body.fields, k)) update[k] = body.fields[k];
      }
      if (Object.keys(update).length === 0) {
        return Response.json({ error: 'Nessuna modifica da salvare' }, { status: 400 });
      }
      const { error } = await sb.from('academies').update(update).eq('id', academyId);
      if (error) return Response.json({ error: 'Errore nel salvataggio' }, { status: 500 });
      return Response.json({ ok: true });
    }

    case 'set-admin-status': {
      // body.adminStatus = 'active' | 'suspended' | 'blocked'
      if (!['active', 'suspended', 'blocked'].includes(body.adminStatus)) {
        return Response.json({ error: 'Stato non valido' }, { status: 400 });
      }
      const { error } = await sb.from('academies').update({ admin_status: body.adminStatus }).eq('id', academyId);
      if (error) return Response.json({ error: 'Errore nel salvataggio' }, { status: 500 });
      return Response.json({ ok: true });
    }

    case 'grant-subscription': {
      // body: { plan, months, reason } — attiva/proroga un abbonamento SENZA passare da Stripe.
      const { plan, months, reason } = body;
      if (!MATCH_QUOTA_BY_PLAN.hasOwnProperty(plan)) {
        return Response.json({ error: 'Pacchetto non valido' }, { status: 400 });
      }
      const monthsNum = Number(months) || 1;
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + monthsNum);

      const { error } = await sb.from('academies').update({
        plan_tier: plan,
        match_quota: MATCH_QUOTA_BY_PLAN[plan],
        subscription_status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        is_manual_override: true,
        manual_override_reason: reason || 'Assegnato manualmente',
      }).eq('id', academyId);

      if (error) return Response.json({ error: 'Errore nel salvataggio' }, { status: 500 });
      return Response.json({ ok: true });
    }

    case 'extend-period': {
      // body: { extraDays } — proroga la scadenza corrente senza cambiare piano
      const { data: current } = await sb.from('academies').select('current_period_end').eq('id', academyId).single();
      const base = current?.current_period_end ? new Date(current.current_period_end) : new Date();
      base.setDate(base.getDate() + (Number(body.extraDays) || 30));
      const { error } = await sb.from('academies').update({ current_period_end: base.toISOString() }).eq('id', academyId);
      if (error) return Response.json({ error: 'Errore nel salvataggio' }, { status: 500 });
      return Response.json({ ok: true });
    }

    case 'end-manual-override': {
      // torna alla gestione normale via Stripe (utile se poi l'Academy inizia a pagare davvero)
      const { error } = await sb.from('academies').update({
        is_manual_override: false,
        manual_override_reason: null,
      }).eq('id', academyId);
      if (error) return Response.json({ error: 'Errore nel salvataggio' }, { status: 500 });
      return Response.json({ ok: true });
    }

    case 'delete': {
      // Cancella l'Academy e, a cascata, tutto ciò che le appartiene (foreign key ON DELETE CASCADE).
      // Cancelliamo prima l'utente Supabase Auth: la riga academies verrà rimossa a cascata da lì.
      const { error } = await sb.auth.admin.deleteUser(academyId);
      if (error) return Response.json({ error: 'Errore nell\'eliminazione: ' + error.message }, { status: 500 });
      return Response.json({ ok: true });
    }

    default:
      return Response.json({ error: 'Azione non valida' }, { status: 400 });
  }
}
