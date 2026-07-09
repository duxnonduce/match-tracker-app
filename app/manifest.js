export default function manifest() {
  return {
    name: 'PointLab · Tennis',
    short_name: 'PointLab',
    description: 'Registrazione partite e analisi per maestri di tennis',
    start_url: '/',
    display: 'standalone',
    background_color: '#101d16',
    theme_color: '#101d16',
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
