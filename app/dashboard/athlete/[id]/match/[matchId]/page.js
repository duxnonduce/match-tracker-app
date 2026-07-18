'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../../../lib/supabaseClient';
import ReportViewer from '../../../../../../lib/ReportViewer';
import ConfirmDialog from '../../../../../../lib/ConfirmDialog';

export default function CoachMatchDetail() {
  const router = useRouter();
  const params = useParams();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');
  const [academyId, setCoachId] = useState(null);

  const [rating, setRating] = useState(null);
  const [summary, setSummary] = useState('');
  const [workedWell, setWorkedWell] = useState('');
  const [toImprove, setToImprove] = useState('');
  const [nextGoal, setNextGoal] = useState('');
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [aiCommentary, setAiCommentary] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  const [deleteStep, setDeleteStep] = useState(0); // 0=chiuso, 1=avviso, 2=conferma scritta
  const [deleteTyped, setDeleteTyped] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      if (!localStorage.getItem('staff_token')) { router.push('/pin'); return; }
      setCoachId(session.user.id);

      const { data, error: err } = await supabase
        .from('matches')
        .select('meta, stats, log, match, coach_rating, coach_comment, coach_summary, coach_worked_well, coach_to_improve, coach_next_goal, published_to_athlete, ai_commentary, ai_commentary_generated_at, recorded_by_name')
        .eq('id', params.matchId)
        .single();

      if (err || !data) {
        setError('Partita non trovata (o non appartiene ai tuoi allievi).');
        return;
      }
      setRecord(data);
      setRating(data.coach_rating || null);
      setSummary(data.coach_summary || '');
      setWorkedWell(data.coach_worked_well || '');
      setToImprove(data.coach_to_improve || '');
      setNextGoal(data.coach_next_goal || '');
      setPublished(!!data.published_to_athlete);
      setAiCommentary(data.ai_commentary || '');
    })();
  }, [params.matchId]);

  async function handleSaveReview(publishNow) {
    setSaving(true);
    setSaveMsg('');
    try {
      const update = {
        coach_rating: rating,
        coach_summary: summary.trim() || null,
        coach_worked_well: workedWell.trim() || null,
        coach_to_improve: toImprove.trim() || null,
        coach_next_goal: nextGoal.trim() || null,
        ai_commentary: aiCommentary.trim() || null,
        published_to_athlete: publishNow,
      };
      const { error } = await supabase.from('matches').update(update).eq('id', params.matchId);
      if (error) throw error;
      setPublished(publishNow);
      setRecord(r => ({ ...r, ...update }));
      setSaveMsg(publishNow ? '✅ Pubblicato per l\'allievo.' : '💾 Salvato come bozza (non visibile all\'allievo).');
      if (publishNow) {
        fetch('/api/notify/match-published', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ matchId: params.matchId }),
        }).catch(() => {}); // non bloccante: se l'email fallisce, la pubblicazione resta comunque valida
      }
    } catch (err) {
      setSaveMsg('Errore: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateAI() {
    setAiGenerating(true);
    setAiError('');
    try {
      const res = await fetch('/api/ai/generate-commentary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: params.matchId, academyId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      setAiCommentary(data.commentary);
      setRecord(r => ({ ...r, ai_commentary: data.commentary }));
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const { error } = await supabase.from('matches').delete().eq('id', params.matchId);
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

  return (
    <>
      <ReportViewer record={record} />

      {record && (
        <div className="wrap" style={{paddingTop:0, marginTop:-24}}>
          <div className="card">
            <h2 style={{fontSize:16}}>👨‍🏫 Report per l'allievo</h2>
            <p className="muted" style={{marginBottom:12}}>Visibile all'allievo solo dopo che pubblichi. Puoi salvarlo come bozza e pubblicarlo più tardi.</p>
            <div className="rating-picker" style={{marginBottom:14}}>
              {Array.from({length:10}, (_, i) => i+1).map(n => (
                <button key={n} type="button" className={'rating-btn' + (rating===n ? ' selected' : '')} onClick={()=>setRating(rating===n ? null : n)}>{n}</button>
              ))}
            </div>
            {record.coach_comment && !summary && (
              <p className="field-hint" style={{marginBottom:10}}>Commento precedente (formato vecchio): "{record.coach_comment}" — puoi riportarlo nei campi qui sotto se vuoi tenerlo.</p>
            )}
            <div className="field"><label>Sintesi</label><textarea className="textarea" rows={2} value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Com'è andata la partita in generale" /></div>
            <div className="field"><label>Cosa ha funzionato</label><textarea className="textarea" rows={2} value={workedWell} onChange={e=>setWorkedWell(e.target.value)} /></div>
            <div className="field"><label>Cosa migliorare</label><textarea className="textarea" rows={2} value={toImprove} onChange={e=>setToImprove(e.target.value)} /></div>
            <div className="field"><label>Obiettivo per il prossimo allenamento</label><textarea className="textarea" rows={2} value={nextGoal} onChange={e=>setNextGoal(e.target.value)} /></div>
            <div className="row" style={{gap:8, marginTop:12}}>
              <button className="btn secondary" style={{flex:1}} disabled={saving} onClick={()=>handleSaveReview(false)}>💾 Salva bozza</button>
              <button className="btn" style={{flex:1}} disabled={saving} onClick={()=>handleSaveReview(true)}>📤 {published ? 'Aggiorna pubblicato' : 'Pubblica per l\'allievo'}</button>
            </div>
            {saveMsg && <p className="muted" style={{marginTop:8}}>{saveMsg}</p>}
            {published && <p className="success" style={{marginTop:4}}>Questa partita è visibile all'allievo.</p>}
          </div>

          <div className="card">
            <h2 style={{fontSize:16}}>📊 Analisi tecnica <span className="muted" style={{fontSize:11.5, fontWeight:400}}>— AI, supervisionata dal maestro</span></h2>
            {record.log && record.log.length < 10 ? (
              <p className="field-hint">Servono almeno 10 episodi registrati per generarla (ce ne sono {record.log?.length || 0}).</p>
            ) : !aiCommentary ? (
              <>
                <p className="muted" style={{marginBottom:12}}>Non ancora generata per questa partita.</p>
                <button className="btn secondary" disabled={aiGenerating} onClick={handleGenerateAI}>
                  {aiGenerating ? 'Generazione in corso…' : '✨ Genera analisi tecnica'}
                </button>
                {aiError && <p className="error" style={{marginTop:8}}>{aiError}</p>}
              </>
            ) : (
              <>
                <textarea
                  className="textarea"
                  rows={10}
                  value={aiCommentary}
                  onChange={e=>setAiCommentary(e.target.value)}
                  style={{lineHeight:1.6}}
                />
                <p className="field-hint">Puoi correggere o perfezionare il testo prima di pubblicarlo — verrà salvato insieme al resto del report quando premi "Salva bozza" o "Pubblica" qui sopra.</p>
              </>
            )}
          </div>

          <div className="card">
            <h2 style={{fontSize:16}}>📋 Timeline della partita</h2>
            <p className="muted" style={{marginBottom:12}}>Controlla ogni episodio registrato e correggi eventuali errori di battitura.</p>
            <Link href={`/dashboard/athlete/${params.id}/match/${params.matchId}/timeline`} className="btn secondary">Apri timeline →</Link>
          </div>

          <div className="card">
            <h2 style={{fontSize:16, color:'var(--danger)'}}>⚠️ Zona pericolosa</h2>
            <p className="muted" style={{marginBottom:12}}>Eliminare questa partita è definitivo: non potrai recuperarla, e sparirà anche dall'elenco dell'allievo.</p>
            <button className="btn danger" onClick={()=>setDeleteStep(1)}>🗑 Elimina partita</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteStep === 1}
        title="Eliminare questa partita?"
        confirmLabel="Continua"
        danger
        onCancel={()=>setDeleteStep(0)}
        onConfirm={()=>setDeleteStep(2)}
      >
        <p>Tutti i dati registrati (punteggi, statistiche, grafici) andranno persi per sempre, per te e per l'allievo.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={deleteStep === 2}
        title="Conferma definitiva"
        confirmLabel="Elimina definitivamente"
        danger
        busy={deleting}
        confirmDisabled={deleteTyped.trim().toUpperCase() !== 'ELIMINA'}
        onCancel={()=>{setDeleteStep(0); setDeleteTyped('');}}
        onConfirm={handleDelete}
      >
        <p className="muted">Per confermare, scrivi <b style={{color:'var(--text)'}}>ELIMINA</b> qui sotto:</p>
        <input
          style={{width:'100%', padding:'12px 14px', borderRadius:10, border:'1px solid var(--line)', background:'var(--surface2)', color:'var(--text)', marginTop:6, fontSize:16}}
          value={deleteTyped}
          onChange={e=>setDeleteTyped(e.target.value)}
          autoFocus
        />
      </ConfirmDialog>
    </>
  );
}
