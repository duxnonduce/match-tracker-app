'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

const PLANS = [
  { id: 'basic20', label: 'Base', quota: 20, icon: '🌱', tagline: 'per iniziare' },
  { id: 'plus50', label: 'Plus', quota: 50, icon: '🚀', tagline: 'più richiesto', featured: true },
  { id: 'pro100', label: 'Pro', quota: 100, icon: '🏆', tagline: 'accademie grandi' },
];

const EMPTY_ATHLETE = { fullName: '', birthDate: '', phone: '', email: '', notes: '' };

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [coach, setCoach] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAthlete, setNewAthlete] = useState(EMPTY_ATHLETE);
  const [showAthleteForm, setShowAthleteForm] = useState(false);
  const [addError, setAddError] = useState('');
  const [revealedPin, setRevealedPin] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setSession(session);
      await loadData(session.user.id);
      setLoading(false);
    })();
  }, []);

  async function loadData(coachId) {
    const { data: coachRow } = await supabase.from('coaches').select('*').eq('id', coachId).single();
    setCoach(coachRow);
    if (coachRow && coachRow.subscription_status === 'active') {
      const { data: athleteRows } = await supabase
        .from('athletes')
        .select('*')
        .eq('coach_id', coachId)
        .eq('active', true)
        .order('created_at', { ascending: false });
      setAthletes(athleteRows || []);
    }
  }

  async function handleBuyPlan(planId) {
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: session.user.id, coachEmail: session.user.email, plan: planId }),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); }
      catch (e) { throw new Error('Risposta inattesa dal server: ' + text.slice(0, 200)); }
      if (!res.ok) throw new Error(data.error || 'Errore avvio pagamento');
      if (data.url) window.location.href = data.url;
      else throw new Error('Nessun link di pagamento ricevuto');
    } catch (err) {
      alert('Errore: ' + err.message);
    }
  }

  async function handleAddAthlete(e) {
    e.preventDefault();
    setAddError('');
    setRevealedPin(null);
    const res = await fetch('/api/coach/athletes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coachId: session.user.id,
        fullName: newAthlete.fullName,
        birthDate: newAthlete.birthDate,
        phone: newAthlete.phone,
        email: newAthlete.email,
        notes: newAthlete.notes,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setAddError(data.error || 'Errore'); return; }
    setRevealedPin({ name: data.athlete.full_name, pin: data.pin });
    setNewAthlete(EMPTY_ATHLETE);
    setShowAthleteForm(false);
    await loadData(session.user.id);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) return <div className="wrap"><p className="muted">Caricamento…</p></div>;

  const usagePct = coach && coach.athlete_quota ? Math.min(100, Math.round(100 * athletes.length / coach.athlete_quota)) : 0;

  return (
    <div className="wrap">
      <div className="app-header">
        <div className="brand">
          <div className="brand-dot"></div>
          <div>
            <h1>{coach?.academy_name || 'La mia dashboard'}</h1>
            {coach?.first_name && <div className="sub">{coach.first_name} {coach.last_name}{coach.academy_city ? ' · ' + coach.academy_city : ''}</div>}
          </div>
        </div>
        <button className="btn secondary" onClick={handleLogout}>Esci</button>
      </div>

      {coach && coach.subscription_status !== 'active' ? (
        <div className="card">
          <h2 style={{fontSize:17}}>💳 Scegli un pacchetto per iniziare</h2>
          <p className="muted">Il pacchetto determina quanti allievi puoi registrare contemporaneamente.</p>
          <div className="plan-grid">
            {PLANS.map(p => (
              <div key={p.id} className={'plan-card' + (p.featured ? ' featured' : '')}>
                {p.featured && <div className="ribbon">TOP</div>}
                <div className="icon">{p.icon}</div>
                <h3>{p.label}</h3>
                <div className="price">fino a {p.quota} allievi</div>
                <p className="muted" style={{fontSize:12, marginBottom:14}}>{p.tagline}</p>
                <button className="btn block" onClick={()=>handleBuyPlan(p.id)}>Acquista</button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="row">
              <div>
                <div className="muted">Pacchetto attuale</div>
                <div style={{fontFamily:'Oswald', fontSize:19, marginTop:2}}>
                  {PLANS.find(p=>p.id===coach.plan_tier)?.icon || '🎾'} {coach.plan_tier}
                </div>
              </div>
              <div style={{textAlign:'right'}}>
                <div className="muted">Allievi</div>
                <div style={{fontFamily:'Oswald', fontSize:19, marginTop:2, color:'var(--accent)'}}>{athletes.length}/{coach.athlete_quota}</div>
              </div>
            </div>
            <div style={{background:'var(--surface2)', borderRadius:20, height:8, marginTop:14, overflow:'hidden'}}>
              <div style={{width:usagePct+'%', height:'100%', background:'var(--accent)', borderRadius:20, transition:'width .3s'}}></div>
            </div>
          </div>

          <div className="card">
            <div className="row" style={{marginBottom: showAthleteForm ? 16 : 0}}>
              <h2 style={{fontSize:17}}>➕ Aggiungi un allievo</h2>
              {!showAthleteForm && <button className="btn secondary" onClick={()=>setShowAthleteForm(true)}>Nuovo allievo</button>}
            </div>

            {showAthleteForm && (
              <form onSubmit={handleAddAthlete}>
                <div className="field"><label>Nome e cognome</label><input value={newAthlete.fullName} onChange={e=>setNewAthlete(a=>({...a, fullName:e.target.value}))} required /></div>
                <div className="field-row2">
                  <div className="field"><label>Data di nascita</label><input type="date" value={newAthlete.birthDate} onChange={e=>setNewAthlete(a=>({...a, birthDate:e.target.value}))} /></div>
                  <div className="field"><label>Telefono</label><input type="tel" value={newAthlete.phone} onChange={e=>setNewAthlete(a=>({...a, phone:e.target.value}))} placeholder="Allievo o genitore" /></div>
                </div>
                <div className="field"><label>Email</label><input type="email" value={newAthlete.email} onChange={e=>setNewAthlete(a=>({...a, email:e.target.value}))} /></div>
                <div className="field"><label>Note</label><input value={newAthlete.notes} onChange={e=>setNewAthlete(a=>({...a, notes:e.target.value}))} placeholder="Categoria, obiettivi, infortuni..." /></div>
                <div className="row" style={{gap:8}}>
                  <button className="btn secondary" type="button" onClick={()=>{setShowAthleteForm(false); setAddError('');}} style={{flex:1}}>Annulla</button>
                  <button className="btn" type="submit" style={{flex:1}}>Aggiungi</button>
                </div>
                {addError && <div className="error">{addError}</div>}
              </form>
            )}

            {revealedPin && (
              <div className="pin-reveal">
                <div className="muted">PIN per {revealedPin.name} — comunicalo ora, non potrai rivederlo</div>
                <div className="pin">{revealedPin.pin}</div>
              </div>
            )}
          </div>

          <div className="card">
            <h2 style={{fontSize:17}}>👥 I tuoi allievi</h2>
            {athletes.length === 0 && <p className="muted" style={{marginTop:8}}>Nessun allievo ancora — aggiungine uno qui sopra.</p>}
            {athletes.map(a => (
              <Link key={a.id} href={`/dashboard/athlete/${a.id}`} className="list-item" style={{textDecoration:'none', color:'inherit'}}>
                <div className="li-main">
                  <div className="avatar">{initials(a.full_name)}</div>
                  <div className="li-text">
                    <div className="li-title">{a.full_name}</div>
                    {a.birth_date && <div className="li-sub">Nato/a il {new Date(a.birth_date).toLocaleDateString('it-IT')}</div>}
                  </div>
                </div>
                <span className="muted">→</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
