'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const SHOT_LABELS = {
  dritto: 'Diritto', rovescio: 'Rovescio', servizio: 'Servizio', volee: 'Volée',
  smash: 'Smash', dropshot: 'Drop Shot', back: 'Back', cesto: 'Cesto/Multipalla',
};

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
  const [trainingSessions, setTrainingSessions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('athlete_token');
    if (!token) { router.push('/allievo'); return; }
    setName(localStorage.getItem('athlete_name') || '');

    (async () => {
      const [matchesRes, trainingRes, goalsRes] = await Promise.all([
        fetch('/api/athlete/matches', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/athlete/training', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/athlete/goals', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (matchesRes.status === 401) {
        localStorage.removeItem('athlete_token');
        router.push('/allievo');
        return;
      }
      const matchesData = await matchesRes.json();
      if (!matchesRes.ok) { setError(matchesData.error || 'Errore'); setLoading(false); return; }
      setMatches(matchesData.matches || []);

      if (trainingRes.ok) {
        const trainingData = await trainingRes.json();
        setTrainingSessions(trainingData.sessions || []);
      }
      if (goalsRes.ok) {
        const goalsData = await goalsRes.json();
        setGoals(goalsData.goals || []);
      }
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
            <div className="sub">Sola lettura — solo il tuo maestro registra i dati</div>
          </div>
        </div>
        <button className="btn secondary" onClick={handleLogout}>Esci</button>
      </div>

      <div className="card">
        <h2 style={{fontSize:17}}>🎯 I tuoi obiettivi</h2>
        {goals.filter(g=>g.status==='in_corso').length === 0 && goals.filter(g=>g.status==='raggiunto').length === 0 && (
          <p className="muted" style={{marginTop:8}}>Il tuo maestro non ha ancora impostato obiettivi.</p>
        )}
        {goals.filter(g=>g.status==='in_corso').map(g => (
          <div key={g.id} className="list-item">
            <div className="li-text"><div className="li-title">{g.title}</div><div className="li-sub">In corso</div></div>
          </div>
        ))}
        {goals.filter(g=>g.status==='raggiunto').length > 0 && (
          <div style={{marginTop:10}}>
            {goals.filter(g=>g.status==='raggiunto').map(g => (
              <div key={g.id} className="row" style={{fontSize:13, padding:'7px 0', borderBottom:'1px solid var(--line)'}}>
                <span style={{color:'var(--muted)', textDecoration:'line-through'}}>✓ {g.title}</span>
              </div>
            ))}
          </div>
        )}
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

      <div className="card">
        <h2 style={{fontSize:17}}>🎯 I tuoi allenamenti <span className="muted" style={{fontSize:13, fontWeight:400}}>({trainingSessions.length})</span></h2>
        {trainingSessions.length === 0 && <p className="muted" style={{marginTop:8}}>Nessun allenamento pubblicato ancora.</p>}
        {trainingSessions.map(t => {
          const ep = t.episodes || [];
          const riusciti = ep.filter(e => e.result === 'riuscito').length;
          return (
            <Link key={t.id} href={`/allievo/training/${t.id}`} className="list-item" style={{textDecoration:'none', color:'inherit'}}>
              <div className="li-text">
                <div className="li-title">{SHOT_LABELS[t.shot_type] || t.shot_type}</div>
                <div className="li-sub">{new Date(t.started_at).toLocaleDateString('it-IT')}{t.coach_rating ? ` · ⭐ ${t.coach_rating}/10` : ''}</div>
              </div>
              <span style={{fontFamily:'Oswald', color:'var(--accent)', fontSize:15, flexShrink:0}}>{ep.length ? `${riusciti}/${ep.length}` : ''}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
