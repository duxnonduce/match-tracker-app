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
  };
}
