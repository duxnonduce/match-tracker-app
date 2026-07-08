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

  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [deleteStep, setDeleteStep] = useState(0); // 0=chiuso, 1=avviso, 2=conferma scritta
  const [deleteTyped, setDeleteTyped] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const { data, error: err } = await supabase
        .from('matches')
        .select('meta, stats, log, match, coach_rating, coach_comment, published_to_athlete')
        .eq('id', params.matchId)
        .single();

      if (err || !data) {
        setError('Partita non trovata (o non appartiene ai tuoi allievi).');
        return;
      }
      setRecord(data);
      setRating(data.coach_rating || null);
      setComment(data.coach_comment || '');
      setPublished(!!data.published_to_athlete);
    })();
  }, [params.matchId]);

  async function handleSaveReview(publishNow) {
    setSaving(true);
    setSaveMsg('');
    try {
      const { error } = await supabase
        .from('matches')
        .update({ coach_rating: rating, coach_comment: comment.trim() || null, published_to_athlete: publishNow })
        .eq('id', params.matchId);
      if (error) throw error;
      setPublished(publishNow);
      setRecord(r => ({ ...r, coach_rating: rating, coach_comment: comment.trim() || null, published_to_athlete: publishNow }));
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
            <h2 style={{fontSize:16}}>👨‍🏫 Valutazione e commento</h2>
            <p className="muted" style={{marginBottom:12}}>Visibile all'allievo solo dopo che pubblichi. Puoi salvarla come bozza e pubblicarla più tardi.</p>
            <div className="rating-picker" style={{marginBottom:12}}>
              {Array.from({length:10}, (_, i) => i+1).map(n => (
                <button key={n} type="button" className={'rating-btn' + (rating===n ? ' selected' : '')} onClick={()=>setRating(rating===n ? null : n)}>{n}</button>
              ))}
            </div>
            <textarea className="textarea" rows={3} placeholder="Commento personale (facoltativo)" value={comment} onChange={e=>setComment(e.target.value)} />
            <div className="row" style={{gap:8, marginTop:12}}>
              <button className="btn secondary" style={{flex:1}} disabled={saving} onClick={()=>handleSaveReview(false)}>💾 Salva bozza</button>
              <button className="btn" style={{flex:1}} disabled={saving} onClick={()=>handleSaveReview(true)}>📤 {published ? 'Aggiorna pubblicato' : 'Pubblica per l\'allievo'}</button>
            </div>
            {saveMsg && <p className="muted" style={{marginTop:8}}>{saveMsg}</p>}
            {published && <p className="success" style={{marginTop:4}}>Questa partita è visibile all'allievo.</p>}
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
