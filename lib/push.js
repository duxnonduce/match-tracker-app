// FILE: /lib/push.js
// Helper server-side per l'invio di notifiche push. Import SOLO da
// codice server (API routes, cron) — mai da componenti 'use client'.

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:info@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Manda una notifica push a TUTTI i dispositivi su cui quel maestro o
 * quell'allievo ha attivato le notifiche. Se un dispositivo risulta
 * scaduto/disinstallato (Stripe... ehm, il browser risponde 404/410),
 * la sottoscrizione viene rimossa automaticamente dal database.
 */
export async function sendPushToOwner(ownerType, ownerId, { title, body, url }) {
  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('owner_type', ownerType)
    .eq('owner_id', ownerId);

  if (!subs || subs.length === 0) return { sent: 0 };

  const payload = JSON.stringify({ title, body, url: url || '/' });
  let sent = 0;

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        // dispositivo non più valido: puliamo la sottoscrizione morta
        await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id);
      } else {
        console.warn('invio push fallito (non bloccante):', err.message);
      }
    }
  }));

  return { sent };
}
