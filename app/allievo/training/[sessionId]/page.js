'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const SHOT_LABELS = {
  dritto: 'Diritto', rovescio: 'Rovescio', servizio: 'Servizio', volee: 'Volée',
  smash: 'Smash', dropshot: 'Drop Shot', back: 'Back', cesto: 'Cesto/Multipalla',
};
const DIRECTION_LABELS = { incrociato: 'Incrociato', centro: 'Centro', lungolinea: 'Lungolinea' };

export default function AthleteTrainingDetail() {
  const router = useRouter();
  const params = useParams();
  const [sessionRow, setSessionRow] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('athlete_token');
      if (!token) { router.push('/allievo'); return; }
      const res = await fetch(`/api/athlete/training/${params.sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { localStorage.removeItem('athlete_token'); router.push('/allievo'); return; }
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Errore'); return; }
      setSessionRow(data.session);
    })();
  }, [params.sessionId]);

  if (error) {
    return (
      <div className="wrap">
        <p className="error">{error}</p>
        <Link href="/allievo/dashboard" className="btn secondary">← Torna alla dashboard</Link>
      </div>
    );
  }
  if (!sessionRow) return <div className="wrap"><p className="muted">Caricamento…</p></div>;

  const episodes = sessionRow.episodes || [];
  const riusciti = episodes.filter(e => e.result === 'riuscito').length;
  const errori = episodes.filter(e => e.result === 'errore').length;
  const directions = ['incrociato', 'centro', 'lungolinea'].map(id => {
    const forDir = episodes.filter(e => e.direction === id);
    const succ = forDir.filter(e => e.result === 'riuscito').length;
    return { id, count: forDir.length, succ };
  });

  return (
    <div className="wrap">
      <Link href="/allievo/dashboard" className="muted">← Torna alla dashboard</Link>

      <div className="card" style={{marginTop:14}}>
        <div className="muted">{new Date(sessionRow.started_at).toLocaleDateString('it-IT')}</div>
        <h1 style={{fontSize:20, margin:0}}>🎯 Allenamento — {SHOT_LABELS[sessionRow.shot_type] || sessionRow.shot_type}</h1>

        <div className="stat-mini-grid" style={{marginTop:14}}>
          <div className="stat-mini"><div className="v" style={{color:'var(--ok)'}}>{riusciti}</div><div className="l">Riusciti</div></div>
          <div className="stat-mini"><div className="v" style={{color:'var(--danger)'}}>{errori}</div><div className="l">Errori</div></div>
          <div className="stat-mini"><div className="v">{episodes.length ? Math.round(100*riusciti/episodes.length) : 0}%</div><div className="l">Precisione</div></div>
        </div>
        <div style={{marginTop:14}}>
          {directions.map(d => (
            <div key={d.id} className="row" style={{fontSize:13, padding:'6px 0', borderBottom:'1px solid var(--line)'}}>
              <span className="muted">{DIRECTION_LABELS[d.id]}</span>
              <span>{d.count === 0 ? '—' : `${d.succ}/${d.count} (${Math.round(100*d.succ/d.count)}%)`}</span>
            </div>
          ))}
        </div>
      </div>

      {(sessionRow.coach_rating || sessionRow.coach_summary || sessionRow.coach_worked_well || sessionRow.coach_to_improve || sessionRow.coach_next_goal) && (
        <div className="card">
          <h2 style={{fontSize:16}}>👨‍🏫 Dal tuo maestro</h2>
          {sessionRow.coach_rating && <div style={{fontFamily:'Oswald', fontSize:28, color:'var(--accent)', marginBottom:8}}>{sessionRow.coach_rating}<span style={{fontSize:14, color:'var(--muted)'}}>/10</span></div>}
          {sessionRow.coach_summary && <p><b>Sintesi:</b> {sessionRow.coach_summary}</p>}
          {sessionRow.coach_worked_well && <p><b>Cosa ha funzionato:</b> {sessionRow.coach_worked_well}</p>}
          {sessionRow.coach_to_improve && <p><b>Cosa migliorare:</b> {sessionRow.coach_to_improve}</p>}
          {sessionRow.coach_next_goal && <p><b>Obiettivo per il prossimo allenamento:</b> {sessionRow.coach_next_goal}</p>}
        </div>
      )}
    </div>
  );
}
