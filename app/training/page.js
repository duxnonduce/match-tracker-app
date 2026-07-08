'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

const SHOT_TYPES = [
  { id: 'dritto', label: 'Diritto' },
  { id: 'rovescio', label: 'Rovescio' },
  { id: 'servizio', label: 'Servizio' },
  { id: 'volee', label: 'Volée' },
  { id: 'smash', label: 'Smash' },
  { id: 'dropshot', label: 'Drop Shot' },
  { id: 'back', label: 'Back' },
  { id: 'cesto', label: 'Cesto / Multipalla' },
];
const DIRECTIONS = [
  { id: 'incrociato', label: 'Incrociato' },
  { id: 'centro', label: 'Centro' },
  { id: 'lungolinea', label: 'Lungolinea' },
];
const QUALITIES = [
  { id: 'scarso', label: 'Scarso' },
  { id: 'medio', label: 'Medio' },
  { id: 'buono', label: 'Buono' },
];

function TrainingInner() {
  const params = useSearchParams();
  const router = useRouter();
  const athleteId = params.get('athleteId');

  const [session, setSession] = useState(null);
  const [athlete, setAthlete] = useState(null);
  const [loadErr, setLoadErr] = useState('');

  const [phase, setPhase] = useState('setup'); // setup | logging | review | done
  const [shotType, setShotType] = useState('dritto');
  const [startedAt, setStartedAt] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [direction, setDirection] = useState('centro');
  const [quality, setQuality] = useState('medio');

  const [rating, setRating] = useState(null);
  const [summary, setSummary] = useState('');
  const [workedWell, setWorkedWell] = useState('');
  const [toImprove, setToImprove] = useState('');
  const [nextGoal, setNextGoal] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    (async () => {
      if (!athleteId) { setLoadErr('Nessun allievo selezionato.'); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setSession(session);
      const { data: a, error } = await supabase.from('athletes').select('id, full_name').eq('id', athleteId).single();
      if (error || !a) { setLoadErr('Allievo non trovato.'); return; }
      setAthlete(a);
    })();
  }, [athleteId]);

  function startSession() {
    setEpisodes([]);
    setStartedAt(Date.now());
    setPhase('logging');
  }

  function logEpisode(result) {
    setEpisodes(list => [...list, { ts: Date.now(), result, direction, quality }]);
  }

  function undoLast() {
    setEpisodes(list => list.slice(0, -1));
  }

  const riusciti = episodes.filter(e => e.result === 'riuscito').length;
  const errori = episodes.filter(e => e.result === 'errore').length;

  function directionBreakdown() {
    return DIRECTIONS.map(d => ({
      ...d,
      count: episodes.filter(e => e.direction === d.id).length,
      success: episodes.filter(e => e.direction === d.id && e.result === 'riuscito').length,
    }));
  }

  async function handleSave(publish) {
    setSaving(true);
    setSaveMsg('');
    try {
      const { data: inserted, error } = await supabase.from('training_sessions').insert({
        coach_id: session.user.id,
        athlete_id: athleteId,
        shot_type: shotType,
        started_at: new Date(startedAt).toISOString(),
        ended_at: new Date().toISOString(),
        episodes,
        coach_rating: rating,
        coach_summary: summary.trim() || null,
        coach_worked_well: workedWell.trim() || null,
        coach_to_improve: toImprove.trim() || null,
        coach_next_goal: nextGoal.trim() || null,
        published_to_athlete: publish,
      }).select('id').single();
      if (error) throw error;

      if (publish) {
        fetch('/api/notify/training-published', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: inserted.id }),
        }).catch(() => {});
      }
      setPhase('done');
      setSaveMsg(publish ? '✅ Allenamento pubblicato per l\u2019allievo.' : '💾 Salvato come bozza (non visibile all\u2019allievo).');
    } catch (err) {
      setSaveMsg('Errore: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loadErr) {
    return (
      <div className="wrap">
        <p className="error">{loadErr}</p>
        <Link href="/dashboard" className="btn secondary">← Torna alla dashboard</Link>
      </div>
    );
  }
  if (!athlete) return <div className="wrap"><p className="muted">Caricamento…</p></div>;

  return (
    <div className="wrap">
      {phase === 'setup' && (
        <div className="card" style={{marginTop:40}}>
          <h1 style={{fontSize:20}}>🎯 Nuovo allenamento — {athlete.full_name}</h1>
          <p className="muted" style={{marginBottom:16}}>Scegli su cosa lavorate oggi.</p>
          <div className="pill-row">
            {SHOT_TYPES.map(s => (
              <button key={s.id} type="button" className={'pill' + (shotType === s.id ? ' active' : '')} onClick={()=>setShotType(s.id)}>
                {s.label}
              </button>
            ))}
          </div>
          <button className="btn block" style={{marginTop:20}} onClick={startSession}>▶ Inizia allenamento</button>
        </div>
      )}

      {phase === 'logging' && (
        <>
          <div className="card">
            <div className="row">
              <div>
                <div className="muted">{athlete.full_name}</div>
                <div style={{fontFamily:'Oswald', fontSize:19}}>{SHOT_TYPES.find(s=>s.id===shotType)?.label}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className="muted">Riusciti / Errori</div>
                <div style={{fontFamily:'Oswald', fontSize:19}}><span style={{color:'var(--ok)'}}>{riusciti}</span> / <span style={{color:'var(--danger)'}}>{errori}</span></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="muted" style={{marginBottom:8, fontSize:12, textTransform:'uppercase', letterSpacing:.5}}>Direzione</div>
            <div className="pill-row" style={{marginBottom:16}}>
              {DIRECTIONS.map(d => (
                <button key={d.id} type="button" className={'pill' + (direction === d.id ? ' active' : '')} onClick={()=>setDirection(d.id)}>{d.label}</button>
              ))}
            </div>
            <div className="muted" style={{marginBottom:8, fontSize:12, textTransform:'uppercase', letterSpacing:.5}}>Qualità</div>
            <div className="pill-row">
              {QUALITIES.map(q => (
                <button key={q.id} type="button" className={'pill' + (quality === q.id ? ' active' : '')} onClick={()=>setQuality(q.id)}>{q.label}</button>
              ))}
            </div>
          </div>

          <div className="row" style={{gap:10}}>
            <button className="log-btn fail" onClick={()=>logEpisode('errore')}>
              <span>❌ Errore</span>
              <span className="count">{errori}</span>
            </button>
            <button className="log-btn success" onClick={()=>logEpisode('riuscito')}>
              <span>✅ Riuscito</span>
              <span className="count">{riusciti}</span>
            </button>
          </div>

          <div className="row" style={{gap:8, marginTop:14}}>
            <button className="btn secondary" style={{flex:1}} onClick={undoLast} disabled={episodes.length===0}>↺ Annulla ultimo</button>
            <button className="btn" style={{flex:1}} onClick={()=>setPhase('review')}>Termina allenamento →</button>
          </div>
        </>
      )}

      {phase === 'review' && (
        <>
          <div className="card">
            <h2 style={{fontSize:17}}>📊 Riepilogo</h2>
            <div className="stat-mini-grid">
              <div className="stat-mini"><div className="v" style={{color:'var(--ok)'}}>{riusciti}</div><div className="l">Riusciti</div></div>
              <div className="stat-mini"><div className="v" style={{color:'var(--danger)'}}>{errori}</div><div className="l">Errori</div></div>
              <div className="stat-mini"><div className="v">{episodes.length ? Math.round(100*riusciti/episodes.length) : 0}%</div><div className="l">Precisione</div></div>
            </div>
            <div style={{marginTop:16}}>
              {directionBreakdown().map(d => (
                <div key={d.id} className="row" style={{fontSize:13, padding:'6px 0', borderBottom:'1px solid var(--line)'}}>
                  <span className="muted">{d.label}</span>
                  <span>{d.count === 0 ? '—' : `${d.success}/${d.count} (${Math.round(100*d.success/d.count)}%)`}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 style={{fontSize:17}}>📝 Report per l'allievo</h2>
            <p className="muted" style={{marginBottom:12}}>Facoltativo ma consigliato — è quello che l'allievo vedrà, insieme ai numeri.</p>
            <div className="rating-picker" style={{marginBottom:14}}>
              {Array.from({length:10}, (_, i) => i+1).map(n => (
                <button key={n} type="button" className={'rating-btn' + (rating===n ? ' selected' : '')} onClick={()=>setRating(rating===n ? null : n)}>{n}</button>
              ))}
            </div>
            <div className="field"><label>Sintesi</label><textarea className="textarea" rows={2} value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Com'è andato l'allenamento in generale" /></div>
            <div className="field"><label>Cosa ha funzionato</label><textarea className="textarea" rows={2} value={workedWell} onChange={e=>setWorkedWell(e.target.value)} /></div>
            <div className="field"><label>Cosa migliorare</label><textarea className="textarea" rows={2} value={toImprove} onChange={e=>setToImprove(e.target.value)} /></div>
            <div className="field"><label>Obiettivo per il prossimo allenamento</label><textarea className="textarea" rows={2} value={nextGoal} onChange={e=>setNextGoal(e.target.value)} /></div>

            <div className="row" style={{gap:8, marginTop:8}}>
              <button className="btn secondary" style={{flex:1}} disabled={saving} onClick={()=>handleSave(false)}>💾 Salva bozza</button>
              <button className="btn" style={{flex:1}} disabled={saving} onClick={()=>handleSave(true)}>📤 Pubblica per l'allievo</button>
            </div>
            {saveMsg && <p className="muted" style={{marginTop:8}}>{saveMsg}</p>}
          </div>
        </>
      )}

      {phase === 'done' && (
        <div className="card" style={{marginTop:40, textAlign:'center'}}>
          <div style={{fontSize:34, marginBottom:6}}>✅</div>
          <h1 style={{fontSize:20}}>Allenamento salvato</h1>
          <p className="muted" style={{marginBottom:16}}>{saveMsg}</p>
          <Link href={`/dashboard/athlete/${athleteId}`} className="btn">← Torna alla scheda allievo</Link>
        </div>
      )}
    </div>
  );
}

export default function TrainingPage() {
  return (
    <Suspense fallback={<div className="wrap"><p className="muted">Caricamento…</p></div>}>
      <TrainingInner />
    </Suspense>
  );
}
