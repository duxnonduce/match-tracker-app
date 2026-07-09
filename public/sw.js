// Service worker volutamente minimale: nessuna cache offline (per
// un'app che cambia dati in continuazione, cache aggressive = bug di
// dati vecchi mostrati). Serve principalmente a soddisfare i requisiti
// di installabilità di alcuni browser (Chrome desktop/Android).

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // network passthrough: nessuna intercettazione/cache
});

self.addEventListener('push', (event) => {
  let data = { title: 'PointLab', body: 'Hai una nuova notifica', url: '/' };
  try { data = { ...data, ...event.data.json() }; } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
      if (existing) { existing.navigate(url); return existing.focus(); }
      return self.clients.openWindow(url);
    })
  );
});
