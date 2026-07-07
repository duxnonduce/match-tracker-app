import Link from 'next/link';

export default function Home() {
  return (
    <div className="wrap">
      <div className="card" style={{textAlign:'center', marginTop:60}}>
        <h1>🎾 Match Tracker</h1>
        <p className="muted">Registrazione partite e analisi per maestri di tennis</p>
        <div style={{display:'flex', gap:12, justifyContent:'center', marginTop:22}}>
          <Link href="/login" className="btn">Sono un maestro</Link>
          <Link href="/allievo" className="btn secondary">Sono un allievo</Link>
        </div>
      </div>
    </div>
  );
}
