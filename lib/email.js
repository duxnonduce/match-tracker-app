// FILE: /lib/email.js
// Helper server-side per l'invio email tramite Resend. Import SOLO da
// codice server (API routes) — mai da componenti 'use client'.

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Finché non verifichi un tuo dominio su Resend, puoi mandare email solo
// usando questo indirizzo "sandbox" — funziona subito, senza configurazione.
// Quando verifichi il tuo dominio (Resend → Domains), cambia questa
// costante con qualcosa tipo "Match Tracker <no-reply@tuodominio.it>".
const FROM = process.env.RESEND_FROM || 'Match Tracker <onboarding@resend.dev>';

function wrapHtml(title, bodyHtml) {
  return `
  <div style="font-family:Arial,sans-serif;background:#101d16;padding:32px 16px;">
    <div style="max-width:480px;margin:0 auto;background:#1b2e22;border-radius:14px;padding:28px 24px;color:#eef2ea;">
      <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#d7ff4e;margin-bottom:6px;">🎾 Match Tracker</div>
      <h2 style="margin:0 0 16px;color:#eef2ea;">${title}</h2>
      <div style="font-size:14.5px;line-height:1.6;color:#cdd8d1;">${bodyHtml}</div>
    </div>
  </div>`;
}

/** 1) Conferma abbonamento — mandata quando il pagamento va a buon fine. */
export async function sendSubscriptionConfirmedEmail({ toEmail, coachName, planLabel, quota, periodEndFormatted }) {
  if (!toEmail) return;
  const html = wrapHtml('Abbonamento attivato ✅', `
    <p>Ciao ${coachName || ''},</p>
    <p>Il tuo abbonamento <b>${planLabel}</b> (fino a ${quota} allievi) è attivo da subito.</p>
    ${periodEndFormatted ? `<p>Il rinnovo automatico è previsto per il <b>${periodEndFormatted}</b>.</p>` : ''}
    <p>Puoi iniziare ad aggiungere i tuoi allievi dalla dashboard.</p>
  `);
  return resend.emails.send({ from: FROM, to: toEmail, subject: 'Il tuo abbonamento è attivo 🎾', html });
}

/** 2) Promemoria rinnovo — mandato qualche giorno prima della scadenza. */
export async function sendRenewalReminderEmail({ toEmail, coachName, planLabel, periodEndFormatted }) {
  if (!toEmail) return;
  const html = wrapHtml('Il tuo abbonamento sta per rinnovarsi', `
    <p>Ciao ${coachName || ''},</p>
    <p>Il tuo abbonamento <b>${planLabel}</b> si rinnoverà automaticamente il <b>${periodEndFormatted}</b>.</p>
    <p>Non devi fare nulla se va bene così. Se vuoi cambiare pacchetto o annullare, puoi farlo dalla tua dashboard prima di quella data.</p>
  `);
  return resend.emails.send({ from: FROM, to: toEmail, subject: 'Promemoria: rinnovo abbonamento in arrivo', html });
}

/** 3) Avviso nuova partita pubblicata — mandato all'allievo. */
export async function sendMatchPublishedEmail({ toEmail, athleteName, coachName, matchLabel }) {
  if (!toEmail) return;
  const html = wrapHtml('Nuova partita disponibile 🎾', `
    <p>Ciao ${athleteName || ''},</p>
    <p>${coachName || 'Il tuo maestro'} ha appena pubblicato una nuova partita${matchLabel ? `: <b>${matchLabel}</b>` : ''}.</p>
    <p>Accedi con il tuo PIN per vedere il report completo, le statistiche e il commento del maestro.</p>
  `);
  return resend.emails.send({ from: FROM, to: toEmail, subject: 'Il tuo maestro ha pubblicato una nuova partita', html });
}
