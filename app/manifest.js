export default function manifest() {
  return {
    id: '/',
    name: 'InsideMatch · Tennis',
    short_name: 'InsideMatch',
    description: 'Registrazione partite e analisi per Academy e maestri di tennis',
    start_url: '/',
    scope: '/',
    lang: 'it',
    dir: 'ltr',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    background_color: '#101d16',
    theme_color: '#101d16',
    orientation: 'portrait',
    categories: ['sports', 'productivity'],
    shortcuts: [
      {
        name: 'Dashboard',
        short_name: 'Dashboard',
        description: 'Vai alla dashboard della tua Academy',
        url: '/dashboard',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
      {
        name: 'Analisi avanzate',
        short_name: 'Statistiche',
        description: 'Filtri e confronti sulle partite registrate',
        url: '/dashboard/statistiche',
        icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
      },
    ],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    screenshots: [
      { src: '/screenshots/screenshot-1.png', sizes: '1320x2527', type: 'image/png', form_factor: 'narrow', label: 'Pagina iniziale' },
      { src: '/screenshots/screenshot-2.png', sizes: '1320x2586', type: 'image/png', form_factor: 'narrow', label: 'Aggiungi un allievo' },
      { src: '/screenshots/screenshot-3.png', sizes: '1313x2633', type: 'image/png', form_factor: 'narrow', label: 'Scheda tecnica e storico progressi' },
      { src: '/screenshots/screenshot-4.png', sizes: '1320x2559', type: 'image/png', form_factor: 'narrow', label: 'Report e statistiche di partita' },
    ],
  };
}
