'use client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function TrackerPlaceholder() {
  const params = useSearchParams();
  const athleteId = params.get('athleteId');

  return (
    <div className="wrap">
      <div className="card" style={{marginTop:60, textAlign:'center'}}>
        <h1 style={{fontSize:20}}>🚧 Punto di collegamento del tracker</h1>
        <p className="muted">
          Qui va integrata l'app di registrazione partita già pronta (quella con tutti i pulsanti
          Diritto/Rovescio/Servizio ecc. e la scelta del formato del match). Quando la colleghiamo,
          questa pagina riceverà <code>athleteId={athleteId}</code> e, a fine partita, invece di
          salvare su <code>window.storage</code> farà una <code>fetch('/api/coach/matches', ...)</code>
          per salvare la partita nel database collegata a questo allievo.
        </p>
        <Link href="/dashboard" className="btn secondary">← Torna alla dashboard</Link>
      </div>
    </div>
  );
}
