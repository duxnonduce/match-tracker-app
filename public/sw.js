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
