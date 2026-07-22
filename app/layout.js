import './globals.css';
import RegisterSW from '../lib/RegisterSW';

export const metadata = {
  title: 'InsideMatch · Tennis',
  description: 'Registrazione partite e analisi per maestri di tennis',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'InsideMatch',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#101d16',
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
