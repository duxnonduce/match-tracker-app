'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabaseClient';

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

      const [{ data: matchRows }, { data: trainingRows }] = await Promise.all([
        supabase.from('matches')
          .select('id, meta, match, published_to_athlete, coach_rating, created_at')
          .eq('athlete_id', params.id)
          .order('created_at', { ascending: false }),
        supabase.from('training_sessions')
          .select('id, shot_type, started_at, episodes, published_to_athlete, coach_rating')
          .eq('athlete_id', params.id)
          .order('started_at', { ascending: false }),
      ]);
      setMatches(matchRows || []);
      setTrainingSessions(trainingRows || []);
      setLoading(false);
    })();
  }, [params.id]);

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
