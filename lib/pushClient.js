'use client';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

/**
 * Chiede il permesso per le notifiche e sottoscrive il dispositivo,
 * poi salva la sottoscrizione lato server tramite l'endpoint indicato.
 * Ritorna {ok:true} o {ok:false, reason:'...'} — non lancia mai eccezioni,
 * così il chiamante può mostrare un messaggio semplice senza try/catch.
 */
export async function enablePushNotifications({ endpoint, extraBody = {}, authHeader = null }) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, reason: 'Il tuo browser non supporta le notifiche push.' };
  }
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return { ok: false, reason: 'Notifiche non configurate sul server.' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, reason: 'Permesso negato. Puoi riattivarlo dalle impostazioni del browser.' };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(authHeader ? { Authorization: authHeader } : {}) },
      body: JSON.stringify({ subscription: sub.toJSON(), ...extraBody }),
    });
    if (!res.ok) return { ok: false, reason: 'Errore nel salvare la sottoscrizione.' };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}
