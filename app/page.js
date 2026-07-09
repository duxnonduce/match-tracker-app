'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Footer from '../lib/Footer';
import { supabase } from '../lib/supabaseClient';

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      // Allievo già loggato (token PIN salvato)? vai dritto alla sua dashboard.
      if (typeof window !== 'undefined' && localStorage.getItem('athlete_token')) {
        router.replace('/allievo/dashboard');
        return;
      }
      // Maestro già loggato (sessione Supabase attiva)? vai dritto alla dashboard.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/dashboard');
        return;
      }
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return <div className="wrap"><p className="muted" style={{marginTop:60, textAlign:'center'}}>Caricamento…</p></div>;
  }

  return (
    <div className="wrap" style={{maxWidth:760}}>
      <div className="hero">
        <span className="badge">🎾 Per maestri di tennis</span>
        <h1>Ogni colpo registrato.<br/>Ogni allievo, un progresso visibile.</h1>
        <p className="sub">
          Registra le partite dei tuoi allievi in tempo reale da bordo campo, e ottieni
          automaticamente grafici, statistiche e analisi a fine match — per ogni allievo, sempre a disposizione.
        </p>
        <div className="hero-actions">
          <Link href="/login" className="btn">Sono un maestro →</Link>
          <Link href="/allievo" className="btn secondary">Sono un allievo</Link>
        </div>
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <div className="icon">📋</div>
          <h3>Registrazione a bordo campo</h3>
          <p>Diritto, rovescio, servizio, volée e altro — tocca e registra ogni scambio dal telefono, punto per punto.</p>
        </div>
        <div className="feature-card">
          <div className="icon">📊</div>
          <h3>Statistiche automatiche</h3>
          <p>A fine partita: grafici su winner, errori, fasi di gioco e andamento del match, generati da soli.</p>
        </div>
        <div className="feature-card">
          <div className="icon">👥</div>
          <h3>Un profilo per allievo</h3>
          <p>Ogni allievo accede con un PIN personale e rivede tutte le sue partite passate, in sola lettura.</p>
        </div>
      </div>

      <div className="card" style={{marginTop:22, textAlign:'center'}}>
        <h2 style={{justifyContent:'center', fontSize:16}}>🏆 Pronto a iniziare?</h2>
        <p className="muted" style={{marginBottom:16}}>Scegli un pacchetto in base al numero di allievi che segui, e inizia subito.</p>
        <Link href="/login" className="btn">Crea il tuo account →</Link>
      </div>

      <Footer />
    </div>
  );
}
