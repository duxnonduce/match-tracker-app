'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../../../lib/supabaseClient';
import ConfirmDialog from '../../../../../../lib/ConfirmDialog';

const SHOT_LABELS = {
  dritto: 'Diritto', rovescio: 'Rovescio', servizio: 'Servizio', volee: 'Volée',
  smash: 'Smash', dropshot: 'Drop Shot', back: 'Back', cesto: 'Cesto/Multipalla',
};
const DIRECTION_LABELS = { incrociato: 'Incrociato', centro: 'Centro', lungolinea: 'Lungolinea' };

export default function CoachTrainingDetail() {
  const router = useRouter();
  const params = useParams();
  const [sessionRow, setSessionRow] = useState(null);
  const [error, setError] = useState('');

  const [rating, setRating] = useState(null);
  const [summary, setSummary] = useState('');
  const [workedWell, setWorkedWell] = useState('');
  const [toImprove, setToImprove] = useState('');
  const [nextGoal, setNextGoal] = useState('');
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [deleteStep, setDeleteStep] = useState(0);
  const [deleteTyped, setDeleteTyped] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      if (!localStorage.getItem('staff_token')) { router.push('/pin'); return; }

      const { data, error: err } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('id', params.sessionId)
        .single();

      if (err || !data) { setError('Allenamento non trovato.'); return; }
      setSessionRow(data);
      setRating(data.coach_rating || null);
      setSummary(data.coach_summary || '');
      setWorkedWell(data.coach_worked_well || '');
      setToImprove(data.coach_to_improve || '');
      setNextGoal(data.coach_next_goal || '');
      setPublished(!!data.published_to_athlete);
    })();
  }, [params.sessionId]);

  async function handleSave(publishNow) {
    setSaving(true);
    setSaveMsg('');
    try {
      const { error } = await supabase.from('training_sessions').update({
        coach_rating: rating,
        coach_summary: summary.trim() || null,
        coach_worked_well: workedWell.trim() || null,
        coach_to_improve: toImprove.trim() || null,
        coach_next_goal: nextGoal.trim() || null,
        published_to_athlete: publishNow,
      }).eq('id', params.sessionId);
      if (error) throw error;
      setPublished(publishNow);
      setSaveMsg(publishNow ? '✅ Pubblicato per l\u2019allievo.' : '💾 Salvato come bozza.');
      if (publishNow) {
        fetch('/api/notify/training-published', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: params.sessionId }),
        }).catch(() => {});
      }
    } catch (err) {
      setSaveMsg('Errore: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase.from('training_sessions').delete().eq('id', params.sessionId);
      if (error) throw error;
      router.push(`/dashboard/athlete/${params.id}`);
    } catch (err) {
      alert('Errore nella cancellazione: ' + err.message);
      setDeleting(false);
    }
  }

  if (error) {
    return (
      <div className="wrap">
        <p className="error">{error}</p>
        <Link href={`/dashboard/athlete/${params.id}`} className="btn secondary">← Torna alla scheda allievo</Link>
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
      <Link href={`/dashboard/athlete/${params.id}`} className="muted">← Torna alla scheda allievo</Link>

      <div className="card" style={{marginTop:14}}>
        <div className="row">
          <div>
            <div className="muted">{new Date(sessionRow.started_at).toLocaleDateString('it-IT')}</div>
            <h1 style={{fontSize:20, margin:0}}>🎯 {SHOT_LABELS[sessionRow.shot_type] || sessionRow.shot_type}</h1>
          </div>
          {!published && <span style={{fontSize:10.5, color:'var(--muted)', border:'1px solid var(--line)', borderRadius:6, padding:'2px 8px', textTransform:'uppercase'}}>Bozza</span>}
        </div>
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

      <div className="card">
        <h2 style={{fontSize:16}}>📝 Report per l'allievo</h2>
        <div className="rating-picker" style={{margin:'12px 0'}}>
          {Array.from({length:10}, (_, i) => i+1).map(n => (
            <button key={n} type="button" className={'rating-btn' + (rating===n ? ' selected' : '')} onClick={()=>setRating(rating===n ? null : n)}>{n}</button>
          ))}
        </div>
        <div className="field"><label>Sintesi</label><textarea className="textarea" rows={2} value={summary} onChange={e=>setSummary(e.target.value)} /></div>
        <div className="field"><label>Cosa ha funzionato</label><textarea className="textarea" rows={2} value={workedWell} onChange={e=>setWorkedWell(e.target.value)} /></div>
        <div className="field"><label>Cosa migliorare</label><textarea className="textarea" rows={2} value={toImprove} onChange={e=>setToImprove(e.target.value)} /></div>
        <div className="field"><label>Obiettivo per il prossimo allenamento</label><textarea className="textarea" rows={2} value={nextGoal} onChange={e=>setNextGoal(e.target.value)} /></div>
        <div className="row" style={{gap:8, marginTop:8}}>
          <button className="btn secondary" style={{flex:1}} disabled={saving} onClick={()=>handleSave(false)}>💾 Salva bozza</button>
          <button className="btn" style={{flex:1}} disabled={saving} onClick={()=>handleSave(true)}>📤 {published ? 'Aggiorna pubblicato' : 'Pubblica per l\'allievo'}</button>
        </div>
        {saveMsg && <p className="muted" style={{marginTop:8}}>{saveMsg}</p>}
      </div>

      <div className="card">
        <h2 style={{fontSize:16, color:'var(--danger)'}}>⚠️ Zona pericolosa</h2>
        <p className="muted" style={{marginBottom:12}}>Eliminare questo allenamento è definitivo.</p>
        <button className="btn danger" onClick={()=>setDeleteStep(1)}>🗑 Elimina allenamento</button>
      </div>

      <ConfirmDialog open={deleteStep === 1} title="Eliminare questo allenamento?" confirmLabel="Continua" danger
        onCancel={()=>setDeleteStep(0)} onConfirm={()=>setDeleteStep(2)}>
        <p>Tutti i dati registrati andranno persi per sempre, per te e per l'allievo.</p>
      </ConfirmDialog>
      <ConfirmDialog open={deleteStep === 2} title="Conferma definitiva" confirmLabel="Elimina definitivamente" danger
        busy={deleting} confirmDisabled={deleteTyped.trim().toUpperCase() !== 'ELIMINA'}
        onCancel={()=>{setDeleteStep(0); setDeleteTyped('');}} onConfirm={handleDelete}>
        <p className="muted">Per confermare, scrivi <b style={{color:'var(--text)'}}>ELIMINA</b> qui sotto:</p>
        <input
          style={{width:'100%', padding:'12px 14px', borderRadius:10, border:'1px solid var(--line)', background:'var(--surface2)', color:'var(--text)', marginTop:6, fontSize:16}}
          value={deleteTyped} onChange={e=>setDeleteTyped(e.target.value)} autoFocus
        />
      </ConfirmDialog>
    </div>
  );
}
