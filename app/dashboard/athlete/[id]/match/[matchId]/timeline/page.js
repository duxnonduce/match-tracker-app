'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../../../../lib/supabaseClient';
import {
  rebuildMatchFromLog, pathToLabel, buildPath, gamePointLabel,
  RESULT_TYPES, SUBFASI, GROUPED_SHOTS, SIMPLE_SHOTS,
} from '../../../../../../../lib/matchEngine';

const CATEGORY_OPTIONS = [
  ...GROUPED_SHOTS.map(g => ({ id: g.key, label: g.label, hasSubfase: true })),
  ...SIMPLE_SHOTS.map(s => ({ id: s.key, label: s.label, hasSubfase: false })),
  { id: 'servizio', label: 'Servizio', isServizio: true },
  { id: 'risposta_prima', label: 'Risposta · 1ª Palla', isRisposta: true },
  { id: 'risposta_seconda', label: 'Risposta · 2ª Palla', isRisposta: true },
];

function scoreLabelAt(msBefore) {
  if (!msBefore) return '';
  if (msBefore.format?.matchType === 'tiebreakOnly' || msBefore.inTiebreak) {
    return `TB ${msBefore.tiebreakPoints.allievo}-${msBefore.tiebreakPoints.avversario}`;
  }
  const [la, lv] = gamePointLabel(msBefore.currentGamePoints.allievo, msBefore.currentGamePoints.avversario);
  return `${la}-${lv}`;
}

function EpisodeEditForm({ entry, meta, onSave, onCancel }) {
  const initialCategory = entry.path[0] === 'servizio' ? 'servizio'
    : entry.path[0] === 'risposta' ? `risposta_${entry.path[1]}`
    : entry.path[0];
  const [player, setPlayer] = useState(entry.player);
  const [category, setCategory] = useState(initialCategory);
  const [subfase, setSubfase] = useState(entry.path[0] === 'diritto' || entry.path[0] === 'rovescio' ? entry.path[1] : 'attacco');
  const [result, setResult] = useState(entry.path[entry.path.length - 1]);

  const catInfo = CATEGORY_OPTIONS.find(c => c.id === category);

  function currentResultOptions() {
    if (catInfo?.isServizio) return [{ key: 'ace', label: 'Ace' }, { key: 'doppio_fallo', label: 'Doppio Fallo' }];
    return RESULT_TYPES;
  }

  function handleSave() {
    const path = buildPath({
      category: catInfo?.isServizio ? 'servizio' : catInfo?.isRisposta ? category : category,
      subfase,
      result,
    });
    onSave({ ...entry, path, player });
  }

  return (
    <div style={{background:'var(--surface2)', borderRadius:10, padding:14, marginTop:8}}>
      <div className="field-row2">
        <div className="field">
          <label>Giocatore</label>
          <select value={player} onChange={e=>setPlayer(e.target.value)}>
            <option value="allievo">{meta.allievo}</option>
            <option value="avversario">{meta.avversario}</option>
          </select>
        </div>
        <div className="field">
          <label>Colpo</label>
          <select value={category} onChange={e=>{ setCategory(e.target.value); setResult('winner'); }}>
            {CATEGORY_OPTIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
      </div>
      <div className="field-row2">
        {catInfo?.hasSubfase && (
          <div className="field">
            <label>Fase</label>
            <select value={subfase} onChange={e=>setSubfase(e.target.value)}>
              {SUBFASI.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <label>Esito</label>
          <select value={result} onChange={e=>setResult(e.target.value)}>
            {currentResultOptions().map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </div>
      </div>
      <div className="row" style={{gap:8}}>
        <button className="btn secondary" style={{flex:1}} onClick={onCancel}>Annulla</button>
        <button className="btn" style={{flex:1}} onClick={handleSave}>Salva correzione</button>
      </div>
    </div>
  );
}

export default function MatchTimeline() {
  const router = useRouter();
  const params = useParams();
  const [meta, setMeta] = useState(null);
  const [format, setFormat] = useState(null);
  const [rebuilt, setRebuilt] = useState(null); // {stats, match, log}
  const [error, setError] = useState('');
  const [editingIdx, setEditingIdx] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const { data, error: err } = await supabase
        .from('matches')
        .select('meta, log, match')
        .eq('id', params.matchId)
        .single();

      if (err || !data) { setError('Partita non trovata.'); return; }
      setMeta(data.meta);
      setFormat(data.match.format);
      setRebuilt(rebuildMatchFromLog(data.match.format, data.log));
    })();
  }, [params.matchId]);

  async function persist(newLogRaw) {
    setSaving(true);
    try {
      const result = rebuildMatchFromLog(format, newLogRaw);
      const { error: err } = await supabase
        .from('matches')
        .update({ stats: result.stats, log: result.log, match: result.match })
        .eq('id', params.matchId);
      if (err) throw err;
      setRebuilt(result);
      setEditingIdx(null);
    } catch (e) {
      alert('Errore nel salvare la correzione: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleSaveEdit(idx, updatedEntry) {
    const rawLog = rebuilt.log.map((e, i) => i === idx ? { path: updatedEntry.path, player: updatedEntry.player, ts: e.ts } : { path: e.path, player: e.player, ts: e.ts });
    persist(rawLog);
  }

  function handleDelete(idx) {
    if (!confirm('Eliminare questo episodio? Il punteggio verrà ricalcolato da quel momento in poi.')) return;
    const rawLog = rebuilt.log.filter((_, i) => i !== idx).map(e => ({ path: e.path, player: e.player, ts: e.ts }));
    persist(rawLog);
  }

  if (error) {
    return (
      <div className="wrap">
        <p className="error">{error}</p>
        <Link href={`/dashboard/athlete/${params.id}/match/${params.matchId}`} className="btn secondary">← Torna al report</Link>
      </div>
    );
  }
  if (!rebuilt) return <div className="wrap"><p className="muted">Caricamento…</p></div>;

  return (
    <div className="wrap">
      <Link href={`/dashboard/athlete/${params.id}/match/${params.matchId}`} className="muted">← Torna al report</Link>

      <div className="card" style={{marginTop:14}}>
        <h1 style={{fontSize:19}}>📋 Timeline della partita</h1>
        <p className="muted" style={{marginBottom:4}}>
          {rebuilt.log.length} episodi registrati. Correggi un episodio sbagliato o eliminalo — il punteggio si ricalcola da solo.
        </p>
      </div>

      <div className="card">
        {rebuilt.log.length === 0 && <p className="muted">Nessun episodio registrato.</p>}
        {rebuilt.log.map((entry, idx) => (
          <div key={idx} style={{borderBottom: idx < rebuilt.log.length - 1 ? '1px solid var(--line)' : 'none', padding:'10px 0'}}>
            <div className="row">
              <div className="li-text">
                <div className="li-title" style={{fontSize:13.5}}>
                  <span className="muted">#{idx + 1} · Set {entry.set} Game {entry.game} · {scoreLabelAt(entry.msBefore)}</span>
                </div>
                <div style={{marginTop:2}}>
                  <b>{meta[entry.player]}</b> — {pathToLabel(entry.path)}
                </div>
              </div>
              <div style={{display:'flex', gap:6, flexShrink:0}}>
                <button className="btn secondary" style={{padding:'7px 10px', fontSize:12}} onClick={()=>setEditingIdx(editingIdx === idx ? null : idx)}>✏️</button>
                <button className="btn secondary" style={{padding:'7px 10px', fontSize:12, color:'var(--danger)'}} onClick={()=>handleDelete(idx)} disabled={saving}>🗑</button>
              </div>
            </div>
            {editingIdx === idx && (
              <EpisodeEditForm
                entry={entry}
                meta={meta}
                onCancel={()=>setEditingIdx(null)}
                onSave={(updated)=>handleSaveEdit(idx, updated)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
