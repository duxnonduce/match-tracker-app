'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

const SURFACE_LABELS = { terra: 'Terra rossa', cemento: 'Cemento', erba: 'Erba', indoor: 'Indoor', altro: '' };

function formatSetScore(ms) {
  if (!ms) return '';
  return ms.completedSets.map(s => `${s.allievo}-${s.avversario}`).join(', ');
}

function pointsLabel(a, b) {
  const LABELS = ['0', '15', '30', '40'];
  if (a >= 3 && b >= 3) {
    if (a === b) return 'Parità';
    return a > b ? 'Vantaggio' : 'Svantaggio';
  }
  return `${LABELS[Math.min(a, 3)]} - ${LABELS[Math.min(b, 3)]}`;
}

export default function LiveMatchPage() {
  const params = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  async function fetchData() {
    try {
      const res = await fetch(`/api/live/${params.token}`);
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Errore'); return; }
      setError('');
      setData(json);
      if (json.finished && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch (e) {
      setError('Impossibile aggiornare il punteggio. Controlla la connessione.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    pollRef.current = setInterval(fetchData, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [params.token]);

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={styles.muted}>Caricamento diretta…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🎾</div>
          <p style={{ color: '#e05b5b' }}>{error}</p>
        </div>
      </div>
    );
  }

  const s = data.score;
  const surfaceLabel = SURFACE_LABELS[data.superficie] || '';

  return (
    <div style={styles.page}>
      <div style={styles.brand}>🎾 PointLab — Diretta</div>

      <div style={styles.card}>
        {data.finished ? (
          <div style={styles.finishedBadge}>✅ PARTITA TERMINATA</div>
        ) : (
          <div style={styles.liveBadge}><span style={styles.dot}></span> IN DIRETTA</div>
        )}

        <div style={styles.players}>
          <div style={styles.playerRow}>
            <span style={{ ...styles.playerName, fontWeight: !data.finished && data.currentServer === 'allievo' ? 800 : 600 }}>
              {!data.finished && data.currentServer === 'allievo' && <span style={styles.ballIcon}>🎾</span>}
              {data.allievo}
            </span>
            <span style={styles.setsScore}>{s?.setsWon.allievo ?? 0}</span>
          </div>
          <div style={styles.playerRow}>
            <span style={{ ...styles.playerName, fontWeight: !data.finished && data.currentServer === 'avversario' ? 800 : 600 }}>
              {!data.finished && data.currentServer === 'avversario' && <span style={styles.ballIcon}>🎾</span>}
              {data.avversario}
            </span>
            <span style={styles.setsScore}>{s?.setsWon.avversario ?? 0}</span>
          </div>
        </div>

        {s && formatSetScore(s) && <div style={styles.setLine}>Set: {formatSetScore(s)}</div>}

        {!data.finished && s && (
          <div style={styles.currentGame}>
            <div style={styles.gameLabel}>Game in corso</div>
            <div style={styles.gameScore}>{s.currentSetGames.allievo} - {s.currentSetGames.avversario}</div>
            <div style={styles.pointsScore}>
              {s.inTiebreak ? `Tiebreak: ${s.tiebreakPoints.allievo} - ${s.tiebreakPoints.avversario}` : pointsLabel(s.currentGamePoints.allievo, s.currentGamePoints.avversario)}
            </div>
          </div>
        )}

        <div style={styles.metaRow}>
          {data.torneo && <span>{data.torneo}</span>}
          {data.data && <span>{new Date(data.data).toLocaleDateString('it-IT')}</span>}
          {surfaceLabel && <span>{surfaceLabel}</span>}
          {data.durationMin != null && <span>{data.durationMin} min</span>}
        </div>
      </div>

      {data.basicStats && (
        <div style={styles.statsCard}>
          <div style={styles.statsGrid}>
            <div style={styles.statBox}><div style={styles.statVal}>{data.basicStats.winner}</div><div style={styles.statLabel}>Winner</div></div>
            <div style={styles.statBox}><div style={styles.statVal}>{data.basicStats.errori}</div><div style={styles.statLabel}>Errori</div></div>
            <div style={styles.statBox}><div style={styles.statVal}>{data.basicStats.ace}</div><div style={styles.statLabel}>Ace</div></div>
            <div style={styles.statBox}><div style={styles.statVal}>{data.basicStats.doppiFalli}</div><div style={styles.statLabel}>Doppi falli</div></div>
          </div>
        </div>
      )}

      <p style={styles.footer}>Aggiornamento automatico ogni pochi secondi{error ? ' — connessione instabile' : ''}.</p>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#0b140e', color: '#eef2ea', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', fontFamily: 'Inter, system-ui, sans-serif' },
  brand: { fontSize: 13, color: '#8a9a8a', marginBottom: 16, fontWeight: 700, letterSpacing: 0.5 },
  muted: { color: '#8a9a8a', marginTop: 60 },
  card: { width: '100%', maxWidth: 420, background: '#101d16', border: '1px solid #223328', borderRadius: 20, padding: 24, textAlign: 'center' },
  liveBadge: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(224,91,91,0.15)', color: '#e05b5b', fontSize: 12, fontWeight: 800, padding: '5px 12px', borderRadius: 20, marginBottom: 18, letterSpacing: 0.5 },
  finishedBadge: { display: 'inline-block', background: 'rgba(215,255,78,0.15)', color: '#d7ff4e', fontSize: 12, fontWeight: 800, padding: '5px 12px', borderRadius: 20, marginBottom: 18, letterSpacing: 0.5 },
  dot: { width: 7, height: 7, borderRadius: '50%', background: '#e05b5b', display: 'inline-block' },
  players: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 },
  playerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 19 },
  playerName: { display: 'flex', alignItems: 'center', gap: 8 },
  ballIcon: { fontSize: 14 },
  setsScore: { fontFamily: 'Oswald, sans-serif', fontSize: 28, fontWeight: 700, color: '#d7ff4e' },
  setLine: { fontSize: 13, color: '#8a9a8a', marginBottom: 14 },
  currentGame: { background: '#182920', borderRadius: 14, padding: '16px 12px', marginTop: 8 },
  gameLabel: { fontSize: 11, color: '#8a9a8a', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  gameScore: { fontFamily: 'Oswald, sans-serif', fontSize: 22, fontWeight: 700, marginBottom: 4 },
  pointsScore: { fontFamily: 'Oswald, sans-serif', fontSize: 32, fontWeight: 800, color: '#d7ff4e' },
  metaRow: { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 10, fontSize: 12, color: '#8a9a8a', marginTop: 18 },
  statsCard: { width: '100%', maxWidth: 420, marginTop: 14 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 },
  statBox: { background: '#101d16', border: '1px solid #223328', borderRadius: 12, padding: '12px 6px', textAlign: 'center' },
  statVal: { fontFamily: 'Oswald, sans-serif', fontSize: 20, fontWeight: 700, color: '#d7ff4e' },
  statLabel: { fontSize: 10, color: '#8a9a8a', textTransform: 'uppercase', marginTop: 2 },
  footer: { fontSize: 11, color: '#5a6a5a', marginTop: 20 },
};
