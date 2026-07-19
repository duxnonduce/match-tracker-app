'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabaseClient';
import { computeMatchDigest, compareDigests } from '../../../../lib/matchEngine';

export default function ConfrontaPartitePage() {
  const router = useRouter();
  const [academyId, setAcademyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [athletes, setAthletes] = useState([]);
  const [athleteId, setAthleteId] = useState('');
  const [matches, setMatches] = useState([]);
  const [matchAId, setMatchAId] = useState('');
  const [matchBId, setMatchBId] = useState('');
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState('');
  const [comparison, setComparison] = useState(null);
  const [labelA, setLabelA] = useState('');
  const [labelB, setLabelB] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      if (!localStorage.getItem('staff_token')) { router.push('/pin'); return; }
      setAcademyId(session.user.id);
      const { data } = await supabase.from('athletes').select('id, full_name').eq('academy_id', session.user.id).order('full_name');
      setAthletes(data || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!athleteId) { setMatches([]); return; }
    (async () => {
      const { data } = await supabase
        .from('matches')
        .select('id, meta, created_at')
        .eq('academy_id', academyId)
        .eq('athlete_id', athleteId)
        .order('created_at', { ascending: false });
      setMatches(data || []);
      setMatchAId(''); setMatchBId(''); setComparison(null);
    })();
  }, [athleteId]);

  function matchLabel(m) {
    return `${m.meta?.data || ''} — vs ${m.meta?.avversario || '?'}${m.meta?.torneo ? ' (' + m.meta.torneo + ')' : ''}`;
  }

  async function handleCompare() {
    if (!matchAId || !matchBId) { setError('Scegli entrambe le partite.'); return; }
    if (matchAId === matchBId) { setError('Scegli due partite diverse.'); return; }
    setComparing(true);
    setError('');
    try {
      const [{ data: recA, error: errA }, { data: recB, error: errB }] = await Promise.all([
        supabase.from('matches').select('meta, stats, log, match').eq('id', matchAId).single(),
        supabase.from('matches').select('meta, stats, log, match').eq('id', matchBId).single(),
      ]);
      if (errA || errB) throw new Error('Errore nel caricamento delle partite');

      const digestA = computeMatchDigest(recA);
      const digestB = computeMatchDigest(recB);
      setComparison(compareDigests(digestA, digestB));
      setLabelA(matchLabel(matches.find(m => m.id === matchAId)));
      setLabelB(matchLabel(matches.find(m => m.id === matchBId)));
    } catch (err) {
      setError(err.message);
    } finally {
      setComparing(false);
    }
  }

  if (loading) return <div className="wrap"><p className="muted" style={{marginTop:60, textAlign:'center'}}>Caricamento…</p></div>;

  return (
    <div className="wrap">
      <Link href="/dashboard/statistiche" className="muted">← Analisi avanzate</Link>

      <div className="card" style={{marginTop:14}}>
        <div className="section-title-row">
          <div className="icon-badge pink">⚖️</div>
          <h2>Confronta due partite</h2>
        </div>
        <p className="muted">Scegli un atleta, poi due sue partite — l'app evidenzia automaticamente cosa è migliorato e cosa è peggiorato.</p>

        <div className="field">
          <label>Atleta</label>
          <select value={athleteId} onChange={e=>setAthleteId(e.target.value)}>
            <option value="">— seleziona —</option>
            {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
          </select>
        </div>

        {athleteId && matches.length < 2 && (
          <p className="field-hint">Questo atleta ha meno di 2 partite registrate — servono almeno due per un confronto.</p>
        )}

        {matches.length >= 2 && (
          <>
            <div className="field-row2">
              <div className="field">
                <label>Partita "prima"</label>
                <select value={matchAId} onChange={e=>setMatchAId(e.target.value)}>
                  <option value="">— seleziona —</option>
                  {matches.map(m => <option key={m.id} value={m.id}>{matchLabel(m)}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Partita "dopo"</label>
                <select value={matchBId} onChange={e=>setMatchBId(e.target.value)}>
                  <option value="">— seleziona —</option>
                  {matches.map(m => <option key={m.id} value={m.id}>{matchLabel(m)}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="error">{error}</p>}
            <button className="btn block" onClick={handleCompare} disabled={comparing}>{comparing ? 'Confronto…' : '⚖️ Confronta'}</button>
          </>
        )}
      </div>

      {comparison && (
        <>
          <div className="card">
            <p className="muted" style={{fontSize:12.5}}>Prima: <b style={{color:'var(--text)'}}>{labelA}</b> → Dopo: <b style={{color:'var(--text)'}}>{labelB}</b></p>
          </div>

          {comparison.improved.length > 0 && (
            <div className="card">
              <h2 style={{fontSize:16, color:'var(--ok)'}}>📈 Migliorato</h2>
              {comparison.improved.map(r => (
                <div key={r.label} className="row" style={{padding:'8px 0', borderBottom:'1px solid var(--line)'}}>
                  <span className="muted">{r.label}</span>
                  <span style={{fontFamily:'Oswald', color:'var(--ok)'}}>{r.before} → {r.after} (+{r.delta})</span>
                </div>
              ))}
            </div>
          )}

          {comparison.worsened.length > 0 && (
            <div className="card">
              <h2 style={{fontSize:16, color:'var(--danger)'}}>📉 Peggiorato</h2>
              {comparison.worsened.map(r => (
                <div key={r.label} className="row" style={{padding:'8px 0', borderBottom:'1px solid var(--line)'}}>
                  <span className="muted">{r.label}</span>
                  <span style={{fontFamily:'Oswald', color:'var(--danger)'}}>{r.before} → {r.after} ({r.delta})</span>
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <h2 style={{fontSize:16}}>Servizio</h2>
            <div className="row" style={{padding:'8px 0', borderBottom:'1px solid var(--line)'}}>
              <span className="muted">Ace</span>
              <span style={{fontFamily:'Oswald'}}>{comparison.serveComparison.ace.before} → {comparison.serveComparison.ace.after} ({comparison.serveComparison.ace.delta >= 0 ? '+' : ''}{comparison.serveComparison.ace.delta})</span>
            </div>
            <div className="row" style={{padding:'8px 0'}}>
              <span className="muted">Doppi falli</span>
              <span style={{fontFamily:'Oswald', color: comparison.serveComparison.doppiFalli.delta > 0 ? 'var(--danger)' : 'var(--ok)'}}>{comparison.serveComparison.doppiFalli.before} → {comparison.serveComparison.doppiFalli.after} ({comparison.serveComparison.doppiFalli.delta >= 0 ? '+' : ''}{comparison.serveComparison.doppiFalli.delta})</span>
            </div>
            {comparison.advancedServeComparison && (
              <>
                <div className="row" style={{padding:'8px 0', borderTop:'1px solid var(--line)'}}>
                  <span className="muted">% prima in campo</span>
                  <span style={{fontFamily:'Oswald'}}>{comparison.advancedServeComparison.firstInPct.before ?? '—'}% → {comparison.advancedServeComparison.firstInPct.after ?? '—'}%</span>
                </div>
                <div className="row" style={{padding:'8px 0'}}>
                  <span className="muted">% punti vinti con la prima</span>
                  <span style={{fontFamily:'Oswald'}}>{comparison.advancedServeComparison.wonOnFirstPct.before ?? '—'}% → {comparison.advancedServeComparison.wonOnFirstPct.after ?? '—'}%</span>
                </div>
              </>
            )}
          </div>

          <div className="card">
            <h2 style={{fontSize:16}}>Tutti i colpi</h2>
            {comparison.shotComparison.map(r => (
              <div key={r.label} className="row" style={{padding:'8px 0', borderBottom:'1px solid var(--line)'}}>
                <span className="muted">{r.label}</span>
                <span style={{fontFamily:'Oswald', color: r.delta > 0 ? 'var(--ok)' : r.delta < 0 ? 'var(--danger)' : 'var(--muted)'}}>{r.before} → {r.after} ({r.delta >= 0 ? '+' : ''}{r.delta})</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
