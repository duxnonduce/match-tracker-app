import './globals.css';

export const metadata = {
  title: 'Match Tracker · Tennis',
  description: 'Registrazione partite e analisi per maestri di tennis',
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
