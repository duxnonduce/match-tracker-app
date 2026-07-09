'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabaseClient';
import { aggregateShotPerformance } from '../../../../lib/matchEngine';

const SHOT_LABELS = {
  dritto: 'Diritto', rovescio: 'Rovescio', servizio: 'Servizio', volee: 'Volée',
  smash: 'Smash', dropshot: 'Drop Shot', back: 'Back', cesto: 'Cesto/Multipalla',
};

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

function maskFiscalCode(cf) {
  if (!cf || cf.length < 10) return cf;
  return cf.slice(0, 6) + '•'.repeat(cf.length - 9) + cf.slice(-3);
}

function formatMatchScore(m) {
  if (!m.match) return '';
  if (m.match.format?.matchType === 'tiebreakOnly') {
    const tb = m.match.completedSets?.[0];
    return tb ? `${tb.allievo}-${tb.avversario}` : '';
  }
  return m.match.setsWon ? `${m.match.setsWon.allievo}-${m.match.setsWon.avversario}` : '';
}

export default function AthleteMatches() {
  const router = useRouter();
  const params = useParams();
  const [session, setSession] = useState(null);
  const [athlete, setAthlete] = useState(null);
  const [matches, setMatches] = useState([]);
  const [trainingSessions, setTrainingSessions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [goalBusy, setGoalBusy] = useState(false);
  const [goalError, setGoalError] = useState('');
  const [showAchievedGoals, setShowAchievedGoals] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ level: '', category: '', strengths: '', weaknesses: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [newPin, setNewPin] = useState(null);
  const [showFiscalCode, setShowFiscalCode] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setSession(session);

      const { data: athleteRow } = await supabase.from('athletes').select('*').eq('id', params.id).single();
      setAthlete(athleteRow);
      if (athleteRow) {
        setProfileForm({
          level: athleteRow.level || '',
          category: athleteRow.category || '',
          strengths: athleteRow.strengths || '',
          weaknesses: athleteRow.weaknesses || '',
        });
      }

      const [{ data: matchRows }, { data: trainingRows }, { data: goalRows }] = await Promise.all([
        supabase.from('matches')
          .select('id, meta, match, stats, published_to_athlete, coach_rating, created_at')
          .eq('athlete_id', params.id)
          .order('created_at', { ascending: false }),
        supabase.from('training_sessions')
          .select('id, shot_type, started_at, episodes, published_to_athlete, coach_rating')
          .eq('athlete_id', params.id)
          .order('started_at', { ascending: false }),
        supabase.from('athlete_goals')
          .select('id, title, status, published_to_athlete, created_at, achieved_at')
          .eq('athlete_id', params.id)
          .order('created_at', { ascending: false }),
      ]);
      setMatches(matchRows || []);
      setTrainingSessions(trainingRows || []);
      setGoals(goalRows || []);
      setLoading(false);
    })();
  }, [params.id]);

  async function loadGoals() {
    const { data } = await supabase.from('athlete_goals')
      .select('id, title, status, published_to_athlete, created_at, achieved_at')
      .eq('athlete_id', params.id)
      .order('created_at', { ascending: false });
    setGoals(data || []);
  }

  const activeGoals = goals.filter(g => g.status === 'in_corso');
  const achievedGoals = goals.filter(g => g.status === 'raggiunto');

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const { error } = await supabase.from('athletes').update(profileForm).eq('id', params.id);
      if (error) throw error;
      setAthlete(a => ({ ...a, ...profileForm }));
      setEditingProfile(false);
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  // ---- Storico progressi: calcolato dalle partite già caricate ----
  const ratedMatches = matches.filter(m => m.coach_rating != null).slice().reverse(); // ordine cronologico
  const avgRating = ratedMatches.length ? (ratedMatches.reduce((s, m) => s + m.coach_rating, 0) / ratedMatches.length) : null;
  const shotAggregate = matches.length ? aggregateShotPerformance(matches.map(m => m.stats)) : null;
  const recentForSparkline = ratedMatches.slice(-10);

  async function handleAddGoal(e) {
    e.preventDefault();
    setGoalError('');
    if (activeGoals.length >= 3) {
      setGoalError('Puoi avere al massimo 3 obiettivi attivi contemporaneamente. Segnane uno come raggiunto per aggiungerne un altro.');
      return;
    }
    if (!newGoalTitle.trim()) return;
    setGoalBusy(true);
    try {
      const { error } = await supabase.from('athlete_goals').insert({
        coach_id: session.user.id,
        athlete_id: params.id,
        title: newGoalTitle.trim(),
      });
      if (error) throw error;
      setNewGoalTitle('');
      await loadGoals();
    } catch (err) {
      setGoalError('Errore: ' + err.message);
    } finally {
      setGoalBusy(false);
    }
  }

  async function handleMarkAchieved(goalId) {
    setGoalBusy(true);
    try {
      const { error } = await supabase.from('athlete_goals')
        .update({ status: 'raggiunto', achieved_at: new Date().toISOString() })
        .eq('id', goalId);
      if (error) throw error;
      await loadGoals();
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setGoalBusy(false);
    }
  }

  async function handlePublishGoal(goalId) {
    setGoalBusy(true);
    try {
      const { error } = await supabase.from('athlete_goals')
        .update({ published_to_athlete: true })
        .eq('id', goalId);
      if (error) throw error;
      await loadGoals();
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setGoalBusy(false);
    }
  }

  async function handleDeleteGoal(goalId) {
    if (!confirm('Eliminare questo obiettivo?')) return;
    setGoalBusy(true);
    try {
      const { error } = await supabase.from('athlete_goals').delete().eq('id', goalId);
      if (error) throw error;
      await loadGoals();
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setGoalBusy(false);
    }
  }

  async function handleRegeneratePin() {
    if (!confirm(`Generare un nuovo PIN per ${athlete.full_name}? Il PIN attuale smetterà di funzionare subito.`)) return;
    setRegenerating(true);
    setNewPin(null);
    try {
      const res = await fetch(`/api/coach/athletes/${params.id}/regenerate-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: session.user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      setNewPin(data.pin);
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) return <div className="wrap"><p className="muted">Caricamento…</p></div>;

  return (
    <div className="wrap">
      <Link href="/dashboard" className="muted">← Torna alla dashboard</Link>

      <div className="card" style={{marginTop:14}}>
        <div className="row" style={{alignItems:'flex-start'}}>
          <div className="li-main">
            <div className="avatar lg">{initials(athlete?.full_name)}</div>
            <div>
              <h1 style={{fontSize:20, margin:0}}>{athlete ? athlete.full_name : 'Allievo'}</h1>
              {athlete?.birth_date && <div className="muted" style={{marginTop:3}}>Nato/a il {new Date(athlete.birth_date).toLocaleDateString('it-IT')}{athlete?.dominant_hand && ` · ${athlete.dominant_hand === 'sinistra' ? 'Mancino' : 'Destro'}`}</div>}
            </div>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            <Link href={`/tracker?athleteId=${params.id}`} className="btn">＋ Nuova partita</Link>
            <Link href={`/training?athleteId=${params.id}`} className="btn secondary">🎯 Nuovo allenamento</Link>
          </div>
        </div>

        {(athlete?.phone || athlete?.email || athlete?.fiscal_code || athlete?.notes) && (
          <div className="stat-mini-grid" style={{marginTop:16}}>
            {athlete?.phone && <div className="stat-mini"><div className="v" style={{fontSize:13}}>{athlete.phone}</div><div className="l">Telefono</div></div>}
            {athlete?.email && <div className="stat-mini"><div className="v" style={{fontSize:13}}>{athlete.email}</div><div className="l">Email</div></div>}
            {athlete?.fiscal_code && (
              <div className="stat-mini">
                <div className="v" style={{fontSize:11.5, letterSpacing:.5, cursor:'pointer'}} onClick={()=>setShowFiscalCode(s=>!s)}>
                  {showFiscalCode ? athlete.fiscal_code : maskFiscalCode(athlete.fiscal_code)}
                </div>
                <div className="l">Codice fiscale · <a style={{cursor:'pointer'}} onClick={()=>setShowFiscalCode(s=>!s)}>{showFiscalCode ? 'nascondi' : 'mostra'}</a></div>
              </div>
            )}
            {athlete?.notes && <div className="stat-mini" style={{gridColumn:'1/-1'}}><div className="v" style={{fontSize:13, fontFamily:'Inter', fontWeight:500}}>{athlete.notes}</div><div className="l">Note</div></div>}
          </div>
        )}

        <div style={{marginTop:16, paddingTop:16, borderTop:'1px solid var(--line)'}}>
          <button className="btn secondary" onClick={handleRegeneratePin} disabled={regenerating}>
            🔑 {regenerating ? 'Generazione…' : 'Rigenera PIN'}
          </button>
          <p className="field-hint">Usa questo se l'allievo ha perso o dimenticato il PIN. Quello vecchio smette subito di funzionare.</p>
          {newPin && (
            <div className="pin-reveal">
              <div className="muted">PIN generato. Comunicalo ora all'allievo. Non sarà più visibile.</div>
              <div className="pin">{newPin}</div>
              <button className="btn secondary" style={{marginTop:10}} onClick={()=>setNewPin(null)}>Ho preso nota, nascondi</button>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="row" style={{marginBottom: editingProfile ? 14 : 0}}>
          <h2 style={{fontSize:17}}>📋 Scheda tecnica</h2>
          {!editingProfile && <button className="btn secondary" onClick={()=>setEditingProfile(true)}>Modifica</button>}
        </div>

        {editingProfile ? (
          <form onSubmit={handleSaveProfile}>
            <div className="field-row2">
              <div className="field">
                <label>Livello</label>
                <select value={profileForm.level} onChange={e=>setProfileForm(f=>({...f, level:e.target.value}))}>
                  <option value="">—</option>
                  <option value="Principiante">Principiante</option>
                  <option value="Intermedio">Intermedio</option>
                  <option value="Avanzato">Avanzato</option>
                  <option value="Agonista">Agonista</option>
                </select>
              </div>
              <div className="field"><label>Categoria</label><input value={profileForm.category} onChange={e=>setProfileForm(f=>({...f, category:e.target.value}))} placeholder="Es. Under 12" /></div>
            </div>
            <div className="field"><label>Punti forti</label><textarea className="textarea" rows={2} value={profileForm.strengths} onChange={e=>setProfileForm(f=>({...f, strengths:e.target.value}))} /></div>
            <div className="field"><label>Punti deboli</label><textarea className="textarea" rows={2} value={profileForm.weaknesses} onChange={e=>setProfileForm(f=>({...f, weaknesses:e.target.value}))} /></div>
            <div className="row" style={{gap:8}}>
              <button className="btn secondary" type="button" style={{flex:1}} onClick={()=>setEditingProfile(false)}>Annulla</button>
              <button className="btn" type="submit" style={{flex:1}} disabled={savingProfile}>{savingProfile ? 'Salvataggio…' : 'Salva'}</button>
            </div>
          </form>
        ) : (
          <div className="stat-mini-grid" style={{marginTop:12}}>
            <div className="stat-mini"><div className="v" style={{fontSize:14}}>{athlete?.dominant_hand === 'sinistra' ? 'Mancino' : athlete?.dominant_hand === 'destra' ? 'Destro' : '—'}</div><div className="l">Mano</div></div>
            <div className="stat-mini"><div className="v" style={{fontSize:14}}>{athlete?.level || '—'}</div><div className="l">Livello</div></div>
            <div className="stat-mini"><div className="v" style={{fontSize:14}}>{athlete?.category || '—'}</div><div className="l">Categoria</div></div>
            {athlete?.strengths && <div className="stat-mini" style={{gridColumn:'1/-1'}}><div className="v" style={{fontSize:13, fontFamily:'Inter', fontWeight:500}}>{athlete.strengths}</div><div className="l">Punti forti</div></div>}
            {athlete?.weaknesses && <div className="stat-mini" style={{gridColumn:'1/-1'}}><div className="v" style={{fontSize:13, fontFamily:'Inter', fontWeight:500}}>{athlete.weaknesses}</div><div className="l">Punti deboli</div></div>}
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{fontSize:17}}>📈 Storico progressi</h2>
        {matches.length === 0 ? (
          <p className="muted" style={{marginTop:8}}>Nessuna partita ancora — i progressi compariranno qui.</p>
        ) : (
          <>
            <div className="stat-mini-grid" style={{marginTop:12}}>
              <div className="stat-mini"><div className="v">{matches.length}</div><div className="l">Partite giocate</div></div>
              <div className="stat-mini"><div className="v">{avgRating != null ? avgRating.toFixed(1) : '—'}</div><div className="l">Media voto</div></div>
              <div className="stat-mini"><div className="v" style={{fontSize:14, color:'var(--ok)'}}>{shotAggregate?.best?.net > 0 ? shotAggregate.best.label : '—'}</div><div className="l">Colpo migliore</div></div>
              <div className="stat-mini"><div className="v" style={{fontSize:14, color:'var(--danger)'}}>{shotAggregate?.worst?.net < 0 ? shotAggregate.worst.label : '—'}</div><div className="l">Colpo da migliorare</div></div>
            </div>

            {recentForSparkline.length >= 2 && (
              <div style={{marginTop:18}}>
                <div className="muted" style={{fontSize:12, marginBottom:6}}>Andamento voto — ultime {recentForSparkline.length} partite valutate</div>
                <svg viewBox="0 0 300 60" style={{width:'100%', height:60}} preserveAspectRatio="none">
                  <polyline
                    fill="none" stroke="var(--accent)" strokeWidth="2"
                    points={recentForSparkline.map((m, i) => {
                      const x = (i / (recentForSparkline.length - 1)) * 300;
                      const y = 55 - ((m.coach_rating - 1) / 9) * 50;
                      return `${x},${y}`;
                    }).join(' ')}
                  />
                  {recentForSparkline.map((m, i) => {
                    const x = (i / (recentForSparkline.length - 1)) * 300;
                    const y = 55 - ((m.coach_rating - 1) / 9) * 50;
                    return <circle key={i} cx={x} cy={y} r="3" fill="var(--accent)" />;
                  })}
                </svg>
              </div>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h2 style={{fontSize:17}}>🎯 Obiettivi <span className="muted" style={{fontSize:13, fontWeight:400}}>({activeGoals.length}/3 attivi)</span></h2>

        {activeGoals.length === 0 && <p className="muted" style={{marginTop:8, marginBottom:12}}>Nessun obiettivo attivo — aggiungine uno qui sotto.</p>}
        {activeGoals.map(g => (
          <div key={g.id} className="list-item">
            <div className="li-text">
              <div className="li-title">
                {g.title}
                {!g.published_to_athlete && <span style={{marginLeft:8, fontSize:10.5, color:'var(--muted)', border:'1px solid var(--line)', borderRadius:6, padding:'1px 6px', textTransform:'uppercase', letterSpacing:.5}}>Bozza</span>}
              </div>
            </div>
            <div style={{display:'flex', gap:6, flexShrink:0}}>
              {!g.published_to_athlete && (
                <button className="btn secondary" style={{padding:'8px 12px', fontSize:12.5}} disabled={goalBusy} onClick={()=>handlePublishGoal(g.id)}>📤 Pubblica</button>
              )}
              <button className="btn secondary" style={{padding:'8px 12px', fontSize:12.5}} disabled={goalBusy} onClick={()=>handleMarkAchieved(g.id)}>✓ Raggiunto</button>
              <button className="btn secondary" style={{padding:'8px 10px', fontSize:12.5, color:'var(--danger)'}} disabled={goalBusy} onClick={()=>handleDeleteGoal(g.id)}>🗑</button>
            </div>
          </div>
        ))}

        {activeGoals.length < 3 && (
          <form onSubmit={handleAddGoal} className="row" style={{gap:8, marginTop:8}}>
            <input
              value={newGoalTitle}
              onChange={e=>setNewGoalTitle(e.target.value)}
              placeholder="Es. Ridurre i doppi falli"
              style={{flex:1, padding:'11px 14px', borderRadius:10, border:'1px solid var(--line)', background:'var(--surface2)', color:'var(--text)', fontSize:14}}
            />
            <button className="btn" type="submit" disabled={goalBusy || !newGoalTitle.trim()}>Aggiungi</button>
          </form>
        )}
        <p className="field-hint">I nuovi obiettivi restano in bozza finché non premi "Pubblica" — l'allievo non li vede prima.</p>
        {goalError && <div className="error">{goalError}</div>}

        {achievedGoals.length > 0 && (
          <div style={{marginTop:16, paddingTop:14, borderTop:'1px solid var(--line)'}}>
            <a style={{cursor:'pointer', fontSize:13, color:'var(--muted)'}} onClick={()=>setShowAchievedGoals(s=>!s)}>
              {showAchievedGoals ? '▾' : '▸'} Storico obiettivi raggiunti ({achievedGoals.length})
            </a>
            {showAchievedGoals && achievedGoals.map(g => (
              <div key={g.id} className="row" style={{fontSize:13, padding:'8px 0', borderBottom:'1px solid var(--line)'}}>
                <span style={{color:'var(--muted)', textDecoration:'line-through'}}>✓ {g.title}</span>
                <span className="muted" style={{fontSize:11.5}}>{g.achieved_at ? new Date(g.achieved_at).toLocaleDateString('it-IT') : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{fontSize:17}}>🎾 Partite registrate <span className="muted" style={{fontSize:13, fontWeight:400}}>({matches.length})</span></h2>
        {matches.length === 0 && <p className="muted" style={{marginTop:8}}>Nessuna partita registrata ancora.</p>}
        {matches.map(m => (
          <Link key={m.id} href={`/dashboard/athlete/${params.id}/match/${m.id}`} className="list-item" style={{textDecoration:'none', color:'inherit'}}>
            <div className="li-text">
              <div className="li-title">
                {m.meta?.torneo ? m.meta.torneo + ' · ' : ''}{m.meta?.data}
                {!m.published_to_athlete && <span style={{marginLeft:8, fontSize:10.5, color:'var(--muted)', border:'1px solid var(--line)', borderRadius:6, padding:'1px 6px', textTransform:'uppercase', letterSpacing:.5}}>Bozza</span>}
              </div>
              <div className="li-sub">{m.meta?.formatLabel}{m.coach_rating ? ` · ⭐ ${m.coach_rating}/10` : ''}</div>
            </div>
            <span style={{fontFamily:'Oswald', color:'var(--accent)', fontSize:15, flexShrink:0}}>{formatMatchScore(m)}</span>
          </Link>
        ))}
      </div>

      <div className="card">
        <h2 style={{fontSize:17}}>🎯 Allenamenti <span className="muted" style={{fontSize:13, fontWeight:400}}>({trainingSessions.length})</span></h2>
        {trainingSessions.length === 0 && <p className="muted" style={{marginTop:8}}>Nessun allenamento registrato ancora.</p>}
        {trainingSessions.map(t => {
          const ep = t.episodes || [];
          const riusciti = ep.filter(e => e.result === 'riuscito').length;
          return (
            <Link key={t.id} href={`/dashboard/athlete/${params.id}/training/${t.id}`} className="list-item" style={{textDecoration:'none', color:'inherit'}}>
              <div className="li-text">
                <div className="li-title">
                  {SHOT_LABELS[t.shot_type] || t.shot_type}
                  {!t.published_to_athlete && <span style={{marginLeft:8, fontSize:10.5, color:'var(--muted)', border:'1px solid var(--line)', borderRadius:6, padding:'1px 6px', textTransform:'uppercase', letterSpacing:.5}}>Bozza</span>}
                </div>
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
