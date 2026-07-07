import './globals.css';

export const metadata = {
  title: 'Match Tracker · Tennis',
  description: 'Registrazione partite e analisi per maestri di tennis',
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
      <body>{children}</body>
    </html>
  );
}
