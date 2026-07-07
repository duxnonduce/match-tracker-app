'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
      <div className="row" style={{marginBottom:18}}>
        <h1 style={{fontSize:22}}>Ciao, {name} 👋</h1>
        <button className="btn secondary" onClick={handleLogout}>Esci</button>
      </div>
      <p className="muted">Qui trovi le partite registrate dal tuo maestro. Sola lettura — non puoi modificarle.</p>

      <div className="card">
        {error && <div className="error">{error}</div>}
        {matches.length === 0 && !error && <p className="muted">Nessuna partita registrata ancora.</p>}
        {matches.map(m => (
          <div key={m.id} className="list-item">
            <span>{m.meta?.torneo ? m.meta.torneo + ' · ' : ''}{m.meta?.data}</span>
            <span className="muted">{m.meta?.formatLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
