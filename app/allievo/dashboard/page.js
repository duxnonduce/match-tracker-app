'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function formatMatchScore(m) {
  if (!m.match) return '';
  if (m.match.format?.matchType === 'tiebreakOnly') {
    const tb = m.match.completedSets?.[0];
    return tb ? `${tb.allievo}-${tb.avversario}` : '';
  }
  return m.match.setsWon ? `${m.match.setsWon.allievo}-${m.match.setsWon.avversario}` : '';
}

export default function AthleteDashboard() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('athlete_token');
    if (!token) { router.push('/allievo'); return; }
    setName(localStorage.getItem('athlete_name') || '');

    (async () => {
      const res = await fetch('/api/athlete/matches', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('athlete_token');
        router.push('/allievo');
        return;
      }
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Errore'); setLoading(false); return; }
      setMatches(data.matches || []);
      setLoading(false);
    })();
  }, []);

  function handleLogout() {
    localStorage.removeItem('athlete_token');
    localStorage.removeItem('athlete_name');
    router.push('/allievo');
  }

  if (loading) return <div className="wrap"><p className="muted">Caricamento…</p></div>;

  return (
    <div className="wrap">
      <div className="app-header">
        <div className="brand">
          <div className="brand-dot"></div>
          <div>
            <h1>Ciao, {name} 👋</h1>
            <div className="sub">Sola lettura — solo il tuo maestro registra le partite</div>
          </div>
        </div>
        <button className="btn secondary" onClick={handleLogout}>Esci</button>
      </div>

      <div className="card">
        <h2 style={{fontSize:17}}>🎾 Le tue partite <span className="muted" style={{fontSize:13, fontWeight:400}}>({matches.length})</span></h2>
        {error && <div className="error">{error}</div>}
        {matches.length === 0 && !error && <p className="muted" style={{marginTop:8}}>Nessuna partita registrata ancora — appariranno qui non appena il tuo maestro ne registra una.</p>}
        {matches.map(m => (
          <Link key={m.id} href={`/allievo/match/${m.id}`} className="list-item" style={{textDecoration:'none', color:'inherit'}}>
            <div className="li-text">
              <div className="li-title">{m.meta?.torneo ? m.meta.torneo + ' · ' : ''}{m.meta?.data}</div>
              <div className="li-sub">{m.meta?.formatLabel}</div>
            </div>
            <span style={{fontFamily:'Oswald', color:'var(--accent)', fontSize:15, flexShrink:0}}>{formatMatchScore(m)}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
