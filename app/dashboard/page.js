'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

const PLANS = [
  { id: 'basic20', label: 'Base', quota: 20 },
  { id: 'plus50', label: 'Plus', quota: 50 },
  { id: 'pro100', label: 'Pro', quota: 100 },
];

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [coach, setCoach] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
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
      body: JSON.stringify({ coachId: session.user.id, fullName: newName }),
    });
    const data = await res.json();
    if (!res.ok) { setAddError(data.error || 'Errore'); return; }
    setRevealedPin({ name: data.athlete.full_name, pin: data.pin });
    setNewName('');
    await loadData(session.user.id);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  if (loading) return <div className="wrap"><p className="muted">Caricamento…</p></div>;

  return (
    <div className="wrap">
      <div className="row" style={{marginBottom:18}}>
        <h1 style={{fontSize:22}}>🎾 La mia dashboard</h1>
        <button className="btn secondary" onClick={handleLogout}>Esci</button>
      </div>

      {coach && coach.subscription_status !== 'active' ? (
        <div className="card">
          <h2 style={{fontSize:17}}>Scegli un pacchetto per iniziare</h2>
          <p className="muted">Il pacchetto determina quanti allievi puoi registrare contemporaneamente.</p>
          <div className="plan-grid">
            {PLANS.map(p => (
              <div key={p.id} className="plan-card">
                <h3>{p.label}</h3>
                <p className="muted">fino a {p.quota} allievi</p>
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
                <div style={{fontFamily:'Oswald', fontSize:18}}>{coach.plan_tier} · {athletes.length}/{coach.athlete_quota} allievi</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 style={{fontSize:17}}>Aggiungi un allievo</h2>
            <form onSubmit={handleAddAthlete} style={{display:'flex', gap:8, alignItems:'flex-end'}}>
              <div className="field" style={{flex:1, marginBottom:0}}>
                <label>Nome e cognome</label>
                <input value={newName} onChange={e=>setNewName(e.target.value)} required />
              </div>
              <button className="btn" type="submit">Aggiungi</button>
            </form>
            {addError && <div className="error">{addError}</div>}
            {revealedPin && (
              <div className="pin-reveal">
                <div className="muted">PIN per {revealedPin.name} — comunicalo ora, non potrai rivederlo</div>
                <div className="pin">{revealedPin.pin}</div>
              </div>
            )}
          </div>

          <div className="card">
            <h2 style={{fontSize:17}}>I tuoi allievi</h2>
            {athletes.length === 0 && <p className="muted">Nessun allievo ancora.</p>}
            {athletes.map(a => (
              <div key={a.id} className="list-item">
                <span>{a.full_name}</span>
                <Link href={`/dashboard/athlete/${a.id}`} className="btn secondary">Vedi partite</Link>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
