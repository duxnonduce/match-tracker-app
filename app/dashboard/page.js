'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { validateCodiceFiscale } from '../../lib/codiceFiscale';

const PLANS = [
  { id: 'basic20', label: 'Base', quota: 20, icon: '🌱', tagline: 'per iniziare' },
  { id: 'plus50', label: 'Plus', quota: 50, icon: '🚀', tagline: 'più richiesto', featured: true },
  { id: 'pro100', label: 'Pro', quota: 100, icon: '🏆', tagline: 'accademie grandi' },
];

const EMPTY_ATHLETE = { firstName: '', lastName: '', birthDate: '', phone: '', email: '', notes: '', dominantHand: '', fiscalCode: '' };

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

const STATUS_LABELS = {
  active: { label: 'Attivo', color: 'var(--ok)' },
  past_due: { label: 'Pagamento in ritardo', color: 'var(--danger)' },
  canceled: { label: 'Annullato', color: 'var(--danger)' },
  unpaid: { label: 'Non pagato', color: 'var(--danger)' },
  inactive: { label: 'Non attivo', color: 'var(--muted)' },
};

export default function Dashboard() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [coach, setCoach] = useState(null);
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newAthlete, setNewAthlete] = useState(EMPTY_ATHLETE);
  const [showAthleteForm, setShowAthleteForm] = useState(false);
  const [addError, setAddError] = useState('');
  const [cfWarning, setCfWarning] = useState('');
  const [revealedPin, setRevealedPin] = useState(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [showPlanSwitch, setShowPlanSwitch] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setSession(session);
      await loadData(session.user.id);
      setLoading(false);
    })();
  }, []);

  // Validazione live del codice fiscale mentre il maestro digita
  useEffect(() => {
    if (!newAthlete.fiscalCode) { setCfWarning(''); return; }
    if (newAthlete.fiscalCode.length < 16) { setCfWarning(''); return; }
    const { valid, errors } = validateCodiceFiscale(newAthlete.fiscalCode, {
      firstName: newAthlete.firstName, lastName: newAthlete.lastName, birthDate: newAthlete.birthDate,
    });
    setCfWarning(valid ? '' : errors.join(' '));
  }, [newAthlete.fiscalCode, newAthlete.firstName, newAthlete.lastName, newAthlete.birthDate]);

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

  async function handleChangePlan(newPlan) {
    setBillingBusy(true);
    try {
      const res = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: session.user.id, newPlan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore cambio pacchetto');
      await loadData(session.user.id);
      setShowPlanSwitch(false);
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setBillingBusy(false);
    }
  }

  async function handleCancelOrReactivate(action) {
    if (action === 'cancel' && !confirm('Annullare l\'abbonamento a fine periodo? Potrai continuare a usarlo fino alla scadenza già pagata, poi tu e i tuoi allievi perderete l\'accesso.')) return;
    setBillingBusy(true);
    try {
      const res = await fetch('/api/billing/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coachId: session.user.id, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      await loadData(session.user.id);
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setBillingBusy(false);
    }
  }

  async function handleAddAthlete(e) {
    e.preventDefault();
    setAddError('');
    setRevealedPin(null);
    const res = await fetch('/api/coach/athletes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coachId: session.user.id, ...newAthlete }),
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
  const statusInfo = coach ? (STATUS_LABELS[coach.subscription_status] || STATUS_LABELS.inactive) : STATUS_LABELS.inactive;
  const coachDisplayName = coach?.first_name ? `${coach.first_name} ${coach.last_name || ''}`.trim() : (coach?.email || '');

  return (
    <div className="wrap">
      <div className="app-header">
        <div className="brand">
          <div className="avatar lg">{initials(coachDisplayName)}</div>
          <div>
            <h1>{coachDisplayName || 'Il mio profilo'}</h1>
            <div className="sub">{coach?.academy_name || 'Maestro di tennis'}{coach?.academy_city ? ' · ' + coach.academy_city : ''}</div>
          </div>
        </div>
        <button className="btn secondary" onClick={handleLogout}>Esci</button>
      </div>

      {coach && coach.subscription_status !== 'active' && !showPlanSwitch ? (
        <div className="card">
          <h2 style={{fontSize:17}}>💳 {coach.subscription_status === 'inactive' ? 'Scegli un pacchetto per iniziare' : 'Il tuo abbonamento non è attivo'}</h2>
          {coach.subscription_status !== 'inactive' && (
            <p className="error" style={{marginTop:4}}>Stato: {statusInfo.label}. Tu e i tuoi allievi siete bloccati finché non risolvi il pagamento o scegli un nuovo pacchetto.</p>
          )}
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
                  <span style={{color:statusInfo.color, fontSize:12, marginLeft:8, fontFamily:'Inter'}}>● {statusInfo.label}</span>
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

            {coach.current_period_end && (
              <p className="muted" style={{marginTop:12, marginBottom:0}}>
                {coach.cancel_at_period_end
                  ? <>⚠️ Annullamento programmato: accesso attivo fino al <b style={{color:'var(--text)'}}>{formatDate(coach.current_period_end)}</b>, poi non verrà rinnovato.</>
                  : <>Rinnovo automatico il <b style={{color:'var(--text)'}}>{formatDate(coach.current_period_end)}</b>.</>
                }
              </p>
            )}

            <div className="row" style={{gap:8, marginTop:16}}>
              <button className="btn secondary" style={{flex:1}} disabled={billingBusy} onClick={()=>setShowPlanSwitch(s=>!s)}>
                {showPlanSwitch ? 'Chiudi' : '🔁 Cambia pacchetto'}
              </button>
              {coach.cancel_at_period_end ? (
                <button className="btn secondary" style={{flex:1}} disabled={billingBusy} onClick={()=>handleCancelOrReactivate('reactivate')}>↩ Riattiva</button>
              ) : (
                <button className="btn danger" style={{flex:1}} disabled={billingBusy} onClick={()=>handleCancelOrReactivate('cancel')}>Annulla abbonamento</button>
              )}
            </div>

            {showPlanSwitch && (
              <div className="plan-grid" style={{marginTop:16}}>
                {PLANS.filter(p=>p.id!==coach.plan_tier).map(p => (
                  <div key={p.id} className="plan-card">
                    <div className="icon">{p.icon}</div>
                    <h3>{p.label}</h3>
                    <div className="price">fino a {p.quota} allievi</div>
                    <button className="btn block" disabled={billingBusy} onClick={()=>handleChangePlan(p.id)}>
                      {p.quota > coach.athlete_quota ? '↑ Upgrade' : '↓ Downgrade'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="row" style={{marginBottom: showAthleteForm ? 16 : 0}}>
              <h2 style={{fontSize:17}}>➕ Aggiungi un allievo</h2>
              {!showAthleteForm && <button className="btn secondary" onClick={()=>setShowAthleteForm(true)}>Nuovo allievo</button>}
            </div>

            {showAthleteForm && (
              <form onSubmit={handleAddAthlete}>
                <div className="field-row2">
                  <div className="field"><label>Nome</label><input value={newAthlete.firstName} onChange={e=>setNewAthlete(a=>({...a, firstName:e.target.value}))} required /></div>
                  <div className="field"><label>Cognome</label><input value={newAthlete.lastName} onChange={e=>setNewAthlete(a=>({...a, lastName:e.target.value}))} required /></div>
                </div>
                <div className="field-row2">
                  <div className="field"><label>Data di nascita</label><input type="date" value={newAthlete.birthDate} onChange={e=>setNewAthlete(a=>({...a, birthDate:e.target.value}))} /></div>
                  <div className="field">
                    <label>Mano preferita</label>
                    <select value={newAthlete.dominantHand} onChange={e=>setNewAthlete(a=>({...a, dominantHand:e.target.value}))}>
                      <option value="">—</option>
                      <option value="destra">Destra</option>
                      <option value="sinistra">Sinistra</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Codice fiscale</label>
                  <input
                    value={newAthlete.fiscalCode}
                    onChange={e=>setNewAthlete(a=>({...a, fiscalCode:e.target.value.toUpperCase()}))}
                    maxLength={16}
                    style={{textTransform:'uppercase', letterSpacing:1}}
                    placeholder="RSSMRA85M01H501Z"
                  />
                  {cfWarning && <div className="field-hint" style={{color:'var(--danger)'}}>⚠️ {cfWarning}</div>}
                </div>
                <div className="field-row2">
                  <div className="field"><label>Telefono</label><input type="tel" value={newAthlete.phone} onChange={e=>setNewAthlete(a=>({...a, phone:e.target.value}))} placeholder="Allievo o genitore" /></div>
                  <div className="field"><label>Email</label><input type="email" value={newAthlete.email} onChange={e=>setNewAthlete(a=>({...a, email:e.target.value}))} /></div>
                </div>
                <div className="field"><label>Note</label><input value={newAthlete.notes} onChange={e=>setNewAthlete(a=>({...a, notes:e.target.value}))} placeholder="Categoria, obiettivi, infortuni..." /></div>
                <div className="row" style={{gap:8}}>
                  <button className="btn secondary" type="button" onClick={()=>{setShowAthleteForm(false); setAddError(''); setNewAthlete(EMPTY_ATHLETE);}} style={{flex:1}}>Annulla</button>
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
