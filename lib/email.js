// FILE: /lib/email.js
// Helper server-side per l'invio email tramite Resend. Import SOLO da
// codice server (API routes) — mai da componenti 'use client'.

import { Resend } from 'resend';

let _resend = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// Finché non verifichi un tuo dominio su Resend, puoi mandare email solo
// usando questo indirizzo "sandbox" — funziona subito, senza configurazione.
// Quando verifichi il tuo dominio (Resend → Domains), cambia questa
// costante con qualcosa tipo "InsideMatch <no-reply@tuodominio.it>".
const FROM = process.env.RESEND_FROM || 'InsideMatch <onboarding@resend.dev>';

function wrapHtml(title, bodyHtml, academyFooter) {
  return `
  <div style="font-family:Arial,sans-serif;background:#101d16;padding:32px 16px;">
    <div style="max-width:480px;margin:0 auto;background:#1b2e22;border-radius:14px;padding:28px 24px;color:#eef2ea;">
      <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#d7ff4e;margin-bottom:6px;">🎾 InsideMatch</div>
      <h2 style="margin:0 0 16px;color:#eef2ea;">${title}</h2>
      <div style="font-size:14.5px;line-height:1.6;color:#cdd8d1;">${bodyHtml}</div>
      ${academyFooter ? `
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #2a3f31;font-size:12px;color:#8a9a8a;">
          ${academyFooter}
        </div>
      ` : ''}
    </div>
  </div>`;
}

/** Piccola tabella riepilogativa usata dalle email di abbonamento. */
function summaryTable(rows) {
  return `<table style="width:100%;border-collapse:collapse;margin:14px 0;">
    ${rows.map(([label, value]) => `
      <tr>
        <td style="padding:7px 0;color:#8a9a8a;border-bottom:1px solid #2a3f31;font-size:13px;">${label}</td>
        <td style="padding:7px 0;text-align:right;font-weight:700;color:#eef2ea;border-bottom:1px solid #2a3f31;font-size:13.5px;">${value}</td>
      </tr>
    `).join('')}
  </table>`;
}

/** Riga con i dati dell'Academy, da mettere in fondo alle email principali. */
function academyFooterBlock({ academyName, academyCity, ragioneSociale, partitaIva }) {
  if (!academyName && !ragioneSociale) return null;
  const lines = [];
  if (academyName) lines.push(`<b style="color:#cdd8d1;">${academyName}</b>${academyCity ? ' — ' + academyCity : ''}`);
  if (ragioneSociale) lines.push(ragioneSociale);
  if (partitaIva) lines.push(`P.IVA ${partitaIva}`);
  return lines.join('<br>');
}

/** 1) Conferma abbonamento — mandata quando il pagamento va a buon fine. */
export async function sendSubscriptionConfirmedEmail({ toEmail, academyName, academyCity, ragioneSociale, partitaIva, planLabel, quota, priceLabel, periodEndFormatted }) {
  if (!toEmail) return;
  const html = wrapHtml('Abbonamento attivato ✅', `
    <p>Ciao${academyName ? ' ' + academyName : ''},</p>
    <p>Il tuo abbonamento a InsideMatch è attivo da subito. Ecco il riepilogo:</p>
    ${summaryTable([
      ['Pacchetto', planLabel],
      ['Partite al mese', quota],
      ...(priceLabel ? [['Prezzo', priceLabel]] : []),
      ...(periodEndFormatted ? [['Prossimo rinnovo', periodEndFormatted]] : []),
    ])}
    <p>Puoi iniziare subito ad aggiungere i tuoi allievi e a registrare partite dalla dashboard.</p>
    <p style="margin-top:18px;">Puoi gestire il pacchetto, i pagamenti e le fatture in qualsiasi momento dalla sezione "Impostazioni → Abbonamento".</p>
  `, academyFooterBlock({ academyName, academyCity, ragioneSociale, partitaIva }));
  return getResend().emails.send({ from: FROM, to: toEmail, subject: 'Il tuo abbonamento è attivo 🎾', html });
}

/** 1b) Cambio pacchetto — mandata quando un abbonamento già attivo passa da un piano a un altro. */
export async function sendPlanChangedEmail({ toEmail, academyName, academyCity, ragioneSociale, partitaIva, oldPlanLabel, newPlanLabel, newQuota, priceLabel, periodEndFormatted }) {
  if (!toEmail) return;
  const isUpgrade = true; // il messaggio funziona bene per entrambi i versi, non serve distinguere nel testo
  const html = wrapHtml('Pacchetto aggiornato 🔁', `
    <p>Ciao${academyName ? ' ' + academyName : ''},</p>
    <p>Il tuo abbonamento è passato da <b>${oldPlanLabel}</b> a <b>${newPlanLabel}</b>.</p>
    ${summaryTable([
      ['Nuovo pacchetto', newPlanLabel],
      ['Partite al mese', newQuota],
      ...(priceLabel ? [['Nuovo prezzo', priceLabel]] : []),
      ...(periodEndFormatted ? [['Prossimo rinnovo', periodEndFormatted]] : []),
    ])}
    <p>Se il nuovo pacchetto costa di più, Stripe ha già addebitato la differenza proporzionale per il periodo rimanente; se costa di meno, la differenza viene scalata dal prossimo rinnovo.</p>
    <p style="margin-top:18px;">Puoi controllare il dettaglio dell'addebito in "Impostazioni → Abbonamento → Fatture e pagamento".</p>
  `, academyFooterBlock({ academyName, academyCity, ragioneSociale, partitaIva }));
  return getResend().emails.send({ from: FROM, to: toEmail, subject: 'Hai cambiato pacchetto su InsideMatch', html });
}

/** 2) Promemoria rinnovo — mandato qualche giorno prima della scadenza. */
export async function sendRenewalReminderEmail({ toEmail, academyName, academyCity, ragioneSociale, partitaIva, planLabel, periodEndFormatted }) {
  if (!toEmail) return;
  const html = wrapHtml('Il tuo abbonamento sta per rinnovarsi', `
    <p>Ciao${academyName ? ' ' + academyName : ''},</p>
    <p>Il tuo abbonamento <b>${planLabel}</b> si rinnoverà automaticamente il <b>${periodEndFormatted}</b>.</p>
    <p>Non devi fare nulla se va bene così. Se vuoi cambiare pacchetto o annullare, puoi farlo dalla tua dashboard prima di quella data.</p>
  `, academyFooterBlock({ academyName, academyCity, ragioneSociale, partitaIva }));
  return getResend().emails.send({ from: FROM, to: toEmail, subject: 'Promemoria: rinnovo abbonamento in arrivo', html });
}

/** 3) Avviso nuova partita pubblicata — mandato all'allievo. */
export async function sendMatchPublishedEmail({ toEmail, athleteName, coachName, matchLabel }) {
  if (!toEmail) return;
  const html = wrapHtml('Nuova partita disponibile 🎾', `
    <p>Ciao ${athleteName || ''},</p>
    <p>${coachName || 'Il tuo maestro'} ha appena pubblicato una nuova partita${matchLabel ? `: <b>${matchLabel}</b>` : ''}.</p>
    <p>Accedi con il tuo PIN per vedere il report completo, le statistiche e il commento del maestro.</p>
  `);
  return getResend().emails.send({ from: FROM, to: toEmail, subject: 'Il tuo maestro ha pubblicato una nuova partita', html });
}

/** 4) Avviso nuovo allenamento pubblicato — mandato all'allievo. */
export async function sendTrainingPublishedEmail({ toEmail, athleteName, coachName, shotLabel }) {
  if (!toEmail) return;
  const html = wrapHtml('Nuovo allenamento disponibile 🎯', `
    <p>Ciao ${athleteName || ''},</p>
    <p>${coachName || 'Il tuo maestro'} ha pubblicato il report di un allenamento${shotLabel ? ` su <b>${shotLabel}</b>` : ''}.</p>
    <p>Accedi con il tuo PIN per vedere com'è andato e gli obiettivi per la prossima volta.</p>
  `);
  return getResend().emails.send({ from: FROM, to: toEmail, subject: 'Il tuo maestro ha pubblicato un nuovo allenamento', html });
}
