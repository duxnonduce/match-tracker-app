export default function manifest() {
  return {
    id: '/',
    name: 'InsideMatch · Tennis',
    short_name: 'InsideMatch',
    description: 'Registrazione partite e analisi per Academy e maestri di tennis',
    start_url: '/',
    scope: '/',
    lang: 'it',
    display: 'standalone',
    background_color: '#101d16',
    theme_color: '#101d16',
    orientation: 'portrait',
    categories: ['sports', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
