'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { validateCodiceFiscale } from '../../lib/codiceFiscale';
import ConfirmDialog from '../../lib/ConfirmDialog';
import { enablePushNotifications, checkPushEnabled } from '../../lib/pushClient';

const PLANS = [
  { id: 'base10', label: 'Base', quota: 10, icon: '🌱', tagline: 'per iniziare' },
  { id: 'plus30', label: 'Plus', quota: 30, icon: '🚀', tagline: 'più richiesto', featured: true },
  { id: 'pro50', label: 'Pro', quota: 50, icon: '🏆', tagline: 'per chi lavora sul serio' },
  { id: 'oro', label: 'Oro', quota: null, icon: '👑', tagline: 'partite illimitate' },
];
function quotaText(quota) { return quota == null ? 'partite illimitate' : `fino a ${quota} partite/mese`; }
function effectiveQuota(quota) { return quota == null ? Infinity : quota; }

const EMPTY_ATHLETE = { firstName: '', lastName: '', birthDate: '', phone: '', email: '', notes: '', dominantHand: '', fiscalCode: '', parentalConsent: false };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Buongiorno';
  if (h < 18) return 'Buon pomeriggio';
  return 'Buonasera';
}

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
}
function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}
function priceLabel(planPrices, planId) {
  const p = planPrices?.[planId];
  if (!p) return '';
  return `${p.formatted}${p.interval === 'month' ? '/mese' : p.interval === 'year' ? '/anno' : ''}`;
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
  const [planPrices, setPlanPrices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newAthlete, setNewAthlete] = useState(EMPTY_ATHLETE);
  const [showAthleteForm, setShowAthleteForm] = useState(false);
  const [addError, setAddError] = useState('');
  const [cfWarning, setCfWarning] = useState('');
  const [revealedPin, setRevealedPin] = useState(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [showPlanSwitch, setShowPlanSwitch] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);
  const [athleteSearch, setAthleteSearch] = useState('');
  const [pushStatus, setPushStatus] = useState('');
  const [inactiveAthletes, setInactiveAthletes] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [reactivating, setReactivating] = useState(null);
  const [matchCount, setMatchCount] = useState(0);
  const [activeTab, setActiveTab] = useState('allievi'); // 'allievi' | 'abbonamento' — solo per il layout, nessuna logica esistente tocca questo
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState('staff');

  // dialog di conferma per il cambio pacchetto (con differenza prezzo)
  const [planChangeTarget, setPlanChangeTarget] = useState(null);

  // dialog a doppia conferma per l'annullamento
  const [cancelStep, setCancelStep] = useState(0); // 0=chiuso, 1=avviso, 2=conferma scritta
  const [cancelTyped, setCancelTyped] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const staffToken = localStorage.getItem('staff_token');
      if (!staffToken) { router.push('/pin'); return; }
      setStaffName(localStorage.getItem('staff_name') || '');
      setStaffRole(localStorage.getItem('staff_role') || 'staff');
      setSession(session);
      await loadData(session.user.id);
      setLoading(false);
      fetch('/api/billing/plans').then(r => r.json()).then(d => setPlanPrices(d.plans || {})).catch(() => {});
      checkPushEnabled().then(enabled => { if (enabled) setPushStatus('✅ Notifiche attive'); });
    })();
  }, []);

  useEffect(() => {
    if (!newAthlete.fiscalCode || newAthlete.fiscalCode.length < 16) { setCfWarning(''); return; }
    const { valid, errors } = validateCodiceFiscale(newAthlete.fiscalCode, {
      firstName: newAthlete.firstName, lastName: newAthlete.lastName, birthDate: newAthlete.birthDate,
    });
    setCfWarning(valid ? '' : errors.join(' '));
  }, [newAthlete.fiscalCode, newAthlete.firstName, newAthlete.lastName, newAthlete.birthDate]);

  async function loadData(academyId) {
    const { data: coachRow } = await supabase.from('academies').select('*').eq('id', academyId).single();
    setCoach(coachRow);
    if (coachRow && coachRow.subscription_status === 'active') {
      const { data: athleteRows } = await supabase
        .from('athletes')
        .select('*')
        .eq('academy_id', academyId)
        .eq('active', true)
        .order('created_at', { ascending: false });
      setAthletes(athleteRows || []);

      const { data: inactiveRows } = await supabase
        .from('athletes')
        .select('id, full_name')
        .eq('academy_id', academyId)
        .eq('active', false)
        .order('created_at', { ascending: false });
      setInactiveAthletes(inactiveRows || []);

      let matchCountQuery = supabase.from('matches').select('*', { count: 'exact', head: true }).eq('academy_id', academyId);
      if (coachRow.current_period_start) matchCountQuery = matchCountQuery.gte('created_at', coachRow.current_period_start);
      const { count: matchCountResult } = await matchCountQuery;
      setMatchCount(matchCountResult || 0);
    }
  }

  async function handleBuyPlan(planId) {
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('staff_token')}` },
        body: JSON.stringify({ academyId: session.user.id, coachEmail: session.user.email, plan: planId }),
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

  async function confirmChangePlan() {
    if (!planChangeTarget) return;
    setBillingBusy(true);
    try {
      const res = await fetch('/api/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('staff_token')}` },
        body: JSON.stringify({ academyId: session.user.id, newPlan: planChangeTarget }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore cambio pacchetto');
      await loadData(session.user.id);
      setShowPlanSwitch(false);
      setPlanChangeTarget(null);
    } catch (err) {
      alert('Errore: ' + err.message);
      setPlanChangeTarget(null);
    } finally {
      setBillingBusy(false);
    }
  }

  async function confirmCancel() {
    setBillingBusy(true);
    try {
      const res = await fetch('/api/billing/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('staff_token')}` },
        body: JSON.stringify({ academyId: session.user.id, action: 'cancel' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      await loadData(session.user.id);
      setCancelStep(0);
      setCancelTyped('');
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setBillingBusy(false);
    }
  }

  async function handleOpenPortal() {
    setPortalBusy(true);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('staff_token')}` },
        body: JSON.stringify({ academyId: session.user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      window.location.href = data.url;
    } catch (err) {
      alert('Errore: ' + err.message);
      setPortalBusy(false);
    }
  }

  async function handleSyncSubscription() {
    setSyncing(true);
    try {
      const res = await fetch('/api/billing/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('staff_token')}` },
        body: JSON.stringify({ academyId: session.user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      await loadData(session.user.id);
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setSyncing(false);
    }
  }

  async function handleReactivate() {
    setBillingBusy(true);
    try {
      const res = await fetch('/api/billing/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('staff_token')}` },
        body: JSON.stringify({ academyId: session.user.id, action: 'reactivate' }),
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
    if (!newAthlete.parentalConsent) {
      setAddError('Devi confermare di avere il consenso del genitore/tutore (se l\'allievo è minorenne) prima di procedere.');
      return;
    }
    const res = await fetch('/api/coach/athletes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ academyId: session.user.id, ...newAthlete, parentalConsentConfirmed: true }),
    });
    const data = await res.json();
    if (!res.ok) { setAddError(data.error || 'Errore'); return; }
    setRevealedPin({ name: data.athlete.full_name, pin: data.pin });
    setNewAthlete(EMPTY_ATHLETE);
    setShowAthleteForm(false);
    await loadData(session.user.id);
  }

  async function handleLogout() {
    localStorage.removeItem('staff_token');
    localStorage.removeItem('staff_id');
    localStorage.removeItem('staff_name');
    localStorage.removeItem('staff_role');
    await supabase.auth.signOut();
    router.push('/login');
  }

  function handleSwitchOperator() {
    // Esce dal maestro corrente ma non dall'Academy: torna alla schermata
    // PIN per farsi identificare di nuovo — comodo quando più maestri usano
    // lo stesso dispositivo a turno (es. reception del circolo).
    localStorage.removeItem('staff_token');
    localStorage.removeItem('staff_id');
    localStorage.removeItem('staff_name');
    localStorage.removeItem('staff_role');
    router.push('/pin');
  }

  async function handleReactivateAthlete(athleteId) {
    setReactivating(athleteId);
    try {
      const { error } = await supabase.from('athletes').update({ active: true }).eq('id', athleteId);
      if (error) throw error;
      await loadData(session.user.id);
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setReactivating(null);
    }
  }

  async function handleEnablePush() {
    setPushStatus('Attivazione…');
    const result = await enablePushNotifications({
      endpoint: '/api/push/subscribe-coach',
      extraBody: { academyId: session.user.id },
    });
    setPushStatus(result.ok ? '✅ Notifiche attive' : `⚠️ ${result.reason}`);
  }

  if (loading) return <div className="wrap"><p className="muted">Caricamento…</p></div>;

  const usagePct = coach && coach.match_quota ? Math.min(100, Math.round(100 * matchCount / coach.match_quota)) : 0;
  const filteredAthletes = athleteSearch.trim()
    ? athletes.filter(a => a.full_name.toLowerCase().includes(athleteSearch.trim().toLowerCase()))
    : athletes;
  const statusInfo = coach ? (STATUS_LABELS[coach.subscription_status] || STATUS_LABELS.inactive) : STATUS_LABELS.inactive;
  const coachDisplayName = coach?.academy_name || coach?.email || '';
  const currentPlan = PLANS.find(p => p.id === coach?.plan_tier);
  const targetPlan = PLANS.find(p => p.id === planChangeTarget);

  return (
    <div className="wrap has-bottom-nav">
      <div className="hero-card-glow">
        <div className="hh-top">
          <div className="hh-who">
            <div className="avatar-orb"><div className="avatar-orb-inner">{initials(coachDisplayName)}</div></div>
            <div className="who-text">
              <div className="greeting-caps">{greeting()}</div>
              <h1 style={{fontSize:20}}>{coachDisplayName || 'Il mio profilo'}</h1>
              <div className="hh-sub">
                {coach?.academy_city || 'Academy'} ·{' '}
                <a style={{cursor:'pointer', textDecoration:'underline'}} onClick={handleSwitchOperator}>
                  {staffName || 'Operatore'}{staffRole === 'admin' ? ' (Super Operatore)' : ''}
                </a>
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={handleLogout} title="Esci">⏻</button>
        </div>

        <div className="pulse-graphic">
          <svg viewBox="0 0 300 60" preserveAspectRatio="none">
            <polyline
              fill="none" stroke="var(--accent)" strokeWidth="2" opacity="0.85"
              points="0,30 60,30 78,30 92,8 106,52 120,30 145,30 300,30"
            />
          </svg>
          <div className="pulse-ball"></div>
        </div>

        {coach && (
          <div className="bento-grid">
            <div className="bento-cell" onClick={()=>setActiveTab('allievi')}>
              <span className="bc-icon">👥</span>
              <span className="bc-value">{athletes.length}</span>
              <span className="bc-label">Allievi</span>
            </div>
            <div className={'bento-cell' + (coach.match_quota != null && matchCount >= coach.match_quota ? ' warn' : '')} onClick={()=>setActiveTab('abbonamento')}>
              <span className="bc-icon">🎾</span>
              <span className="bc-value">{matchCount}{coach.match_quota != null ? `/${coach.match_quota}` : ''}</span>
              <span className="bc-label">Partite/mese</span>
            </div>
            <div className={'bento-cell' + (coach.subscription_status !== 'active' ? ' warn' : '')} onClick={()=>setActiveTab('abbonamento')}>
              <span className="bc-icon">{currentPlan?.icon || '🎾'}</span>
              <span className="bc-value" style={{fontSize:14, textTransform:'capitalize'}}>{coach.plan_tier}</span>
              <span className="bc-label" style={{color:statusInfo.color}}>{statusInfo.label}</span>
            </div>
          </div>
        )}
      </div>

      <div className="notif-row" onClick={handleEnablePush}>
        <div className="icon-badge">🔔</div>
        <div className="nr-text">{pushStatus || 'Attiva notifiche'}</div>
        <span className="nr-arrow">›</span>
      </div>

      {coach && coach.subscription_status !== 'active' ? (
        <div className="card">
          <h2 style={{fontSize:17}}>💳 {coach.subscription_status === 'inactive' ? 'Scegli un pacchetto per iniziare' : 'Il tuo abbonamento non è attivo'}</h2>
          {coach.subscription_status !== 'inactive' && (
            <p className="error" style={{marginTop:4}}>Stato: {statusInfo.label}. Tu e i tuoi allievi siete bloccati finché non risolvi il pagamento o scegli un nuovo pacchetto.</p>
          )}
          <p className="muted">Il pacchetto determina quante partite puoi registrare in totale (nessun limite sul numero di allievi).</p>
          <div className="plan-grid">
            {PLANS.map(p => (
              <div key={p.id} className={'plan-card' + (p.featured ? ' featured' : '')}>
                {p.featured && <div className="ribbon">TOP</div>}
                <div className="icon">{p.icon}</div>
                <h3>{p.label}</h3>
                <div className="price">{quotaText(p.quota)}</div>
                {planPrices && <div style={{fontFamily:'Oswald', fontSize:16, marginBottom:4}}>{priceLabel(planPrices, p.id)}</div>}
                <p className="muted" style={{fontSize:12, marginBottom:14}}>{p.tagline}</p>
                <button className="btn block" onClick={()=>handleBuyPlan(p.id)}>Acquista</button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'abbonamento' && staffRole !== 'admin' && (
          <div className="card">
            <a style={{cursor:'pointer', fontSize:13}} className="muted" onClick={()=>setActiveTab('allievi')}>← Torna agli allievi</a>
            <div className="section-title-row" style={{marginTop:14}}>
              <div className="icon-badge gold">🔒</div>
              <h2>Accesso riservato</h2>
            </div>
            <p className="muted">Solo il Super Operatore dell'Academy può gestire l'abbonamento, lo staff e i dati amministrativi.</p>
          </div>
          )}

          {activeTab === 'abbonamento' && staffRole === 'admin' && (
          <div className="card">
            <a style={{cursor:'pointer', fontSize:13}} className="muted" onClick={()=>setActiveTab('allievi')}>← Torna agli allievi</a>
            <div className="section-title-row" style={{marginTop:14}}>
              <div className="icon-badge gold">💳</div>
              <h2>Il tuo abbonamento</h2>
            </div>
            <div className="row">
              <div>
                <div className="muted">Pacchetto attuale</div>
                <div style={{fontFamily:'Oswald', fontSize:19, marginTop:2}}>
                  {currentPlan?.icon || '🎾'} {coach.plan_tier}
                  {planPrices && <span style={{fontSize:13, marginLeft:8, color:'var(--muted)', fontFamily:'Inter'}}>{priceLabel(planPrices, coach.plan_tier)}</span>}
                  <span style={{color:statusInfo.color, fontSize:12, marginLeft:8, fontFamily:'Inter'}}>● {statusInfo.label}</span>
                </div>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <div style={{textAlign:'right'}}>
                  <div className="muted">Partite questo mese</div>
                  <div style={{fontFamily:'Oswald', fontSize:19, marginTop:2, color:'var(--accent)'}}>
                    {matchCount}{coach.match_quota != null ? `/${coach.match_quota}` : ' (illimitate)'}
                  </div>
                </div>
                {coach.match_quota != null && (
                  <div className="ring-progress" style={{'--pct': usagePct, '--ring-color': usagePct>=100 ? 'var(--danger)' : 'var(--accent)'}}>
                    <div className="ring-inner">{usagePct}%</div>
                  </div>
                )}
              </div>
            </div>
            {coach.match_quota != null && matchCount >= coach.match_quota && (
              <p className="error" style={{marginTop:10, marginBottom:0}}>Hai raggiunto il limite di partite del tuo pacchetto. Fai upgrade per registrarne altre.</p>
            )}

            {(coach.current_period_end && coach.current_period_start) ? (
              <p className="muted" style={{marginTop:12, marginBottom:0}}>
                {coach.cancel_at_period_end
                  ? <>⚠️ Annullamento programmato: accesso attivo fino al <b style={{color:'var(--text)'}}>{formatDate(coach.current_period_end)}</b>, poi non verrà rinnovato.</>
                  : <>Rinnovo automatico il <b style={{color:'var(--text)'}}>{formatDate(coach.current_period_end)}</b>. Le partite di questo mese si azzerano da lì.</>
                }
              </p>
            ) : (
              <p className="muted" style={{marginTop:12, marginBottom:0}}>
                Dati di fatturazione da aggiornare (serve per calcolare correttamente il limite mensile).{' '}
                <a style={{cursor:'pointer'}} onClick={handleSyncSubscription}>{syncing ? 'Sincronizzazione…' : 'Sincronizza con Stripe'}</a>
              </p>
            )}

            <div className="row" style={{gap:8, marginTop:16}}>
              <button className="btn secondary" style={{flex:1}} disabled={billingBusy} onClick={()=>setShowPlanSwitch(s=>!s)}>
                {showPlanSwitch ? 'Chiudi' : '🔁 Cambia pacchetto'}
              </button>
              <button className="btn secondary" style={{flex:1}} disabled={portalBusy} onClick={handleOpenPortal}>
                {portalBusy ? 'Apertura…' : '📄 Fatture e pagamento'}
              </button>
              {coach.cancel_at_period_end ? (
                <button className="btn secondary" style={{flex:1}} disabled={billingBusy} onClick={handleReactivate}>↩ Riattiva</button>
              ) : (
                <button className="btn danger" style={{flex:1}} disabled={billingBusy} onClick={()=>setCancelStep(1)}>Annulla abbonamento</button>
              )}
            </div>

            {showPlanSwitch && (
              <div className="plan-grid" style={{marginTop:16}}>
                {PLANS.filter(p=>p.id!==coach.plan_tier).map(p => (
                  <div key={p.id} className="plan-card">
                    <div className="icon">{p.icon}</div>
                    <h3>{p.label}</h3>
                    <div className="price">{quotaText(p.quota)}</div>
                    {planPrices && <div style={{fontFamily:'Oswald', fontSize:15, marginBottom:8}}>{priceLabel(planPrices, p.id)}</div>}
                    <button className="btn block" disabled={billingBusy} onClick={()=>setPlanChangeTarget(p.id)}>
                      {effectiveQuota(p.quota) > effectiveQuota(coach.match_quota) ? '↑ Upgrade' : '↓ Downgrade'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{marginTop:20, paddingTop:16, borderTop:'1px solid var(--line)'}}>
              <Link href="/dashboard/staff" className="btn secondary block">👥 Gestisci staff</Link>
            </div>
          </div>
          )}

          {activeTab === 'allievi' && (
          <>
          {!showAthleteForm && (
            <div className="add-athlete-row" onClick={()=>setShowAthleteForm(true)}>
              <div className="aa-plus">+</div>
              <div className="aa-text">
                <div className="aa-title">Aggiungi un allievo</div>
                <div className="aa-sub">Crea un nuovo profilo</div>
              </div>
              <button className="btn" onClick={(e)=>{e.stopPropagation(); setShowAthleteForm(true);}}>Nuovo allievo ›</button>
            </div>
          )}

          {showAthleteForm && (
          <div className="card">
            <div className="section-title-row">
              <div className="icon-badge">➕</div>
              <h2>Aggiungi un allievo</h2>
            </div>

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
                <div className="field">
                  <label>Note</label>
                  <input value={newAthlete.notes} onChange={e=>setNewAthlete(a=>({...a, notes:e.target.value}))} placeholder="Categoria, obiettivi tecnici..." />
                  <div className="field-hint">Evita di inserire qui dati sanitari (es. infortuni, condizioni mediche): richiedono un consenso specifico che questo campo non raccoglie.</div>
                </div>
                <div className="field" style={{display:'flex', alignItems:'flex-start', gap:10, background:'var(--surface2)', padding:'12px 14px', borderRadius:10}}>
                  <input
                    type="checkbox"
                    id="parental-consent"
                    checked={newAthlete.parentalConsent}
                    onChange={e=>setNewAthlete(a=>({...a, parentalConsent:e.target.checked}))}
                    style={{width:18, height:18, marginTop:2, flexShrink:0}}
                  />
                  <label htmlFor="parental-consent" style={{fontSize:13, color:'var(--text)', textTransform:'none', letterSpacing:0, fontWeight:400}}>
                    Confermo di avere il diritto di inserire questi dati e, se l'allievo è minorenne,
                    il consenso del genitore/tutore legale al trattamento (vedi <a href="/privacy" target="_blank">Informativa Privacy</a>).
                  </label>
                </div>
                <div className="row" style={{gap:8}}>
                  <button className="btn secondary" type="button" onClick={()=>{setShowAthleteForm(false); setAddError(''); setNewAthlete(EMPTY_ATHLETE);}} style={{flex:1}}>Annulla</button>
                  <button className="btn" type="submit" style={{flex:1}}>Aggiungi</button>
                </div>
                {addError && <div className="error">{addError}</div>}
            </form>
          </div>
          )}

          {revealedPin && (
            <div className="card">
              <div className="pin-reveal">
                <div className="muted">PIN generato per <b style={{color:'var(--text)'}}>{revealedPin.name}</b>. Comunicalo ora all'allievo. Non sarà più visibile.</div>
                <div className="pin">{revealedPin.pin}</div>
                <button className="btn secondary" style={{marginTop:10}} onClick={()=>setRevealedPin(null)}>Ho preso nota, nascondi</button>
              </div>
            </div>
          )}

          <div className="card" style={{marginTop:14}}>
            <div className="section-title-row">
              <div className="icon-badge blue">👥</div>
              <h2>I tuoi allievi</h2>
              <span className="stc">{athletes.length}</span>
            </div>
            {athletes.length > 5 && (
              <input
                value={athleteSearch}
                onChange={e=>setAthleteSearch(e.target.value)}
                placeholder="🔍 Cerca per nome..."
                style={{width:'100%', padding:'11px 14px', borderRadius:10, border:'1px solid var(--line)', background:'var(--surface2)', color:'var(--text)', fontSize:14, marginBottom:10}}
              />
            )}
            {athletes.length === 0 && <p className="muted" style={{marginTop:8}}>Nessun allievo ancora — aggiungine uno qui sopra.</p>}
            {athletes.length > 0 && filteredAthletes.length === 0 && <p className="muted" style={{marginTop:8}}>Nessun allievo trovato per "{athleteSearch}".</p>}
            <div className="athlete-grid">
              {filteredAthletes.map(a => (
                <Link key={a.id} href={`/dashboard/athlete/${a.id}`} className="athlete-card-v3">
                  <div className="avatar-orb" style={{width:44, height:44}}><div className="avatar-orb-inner" style={{fontSize:14}}>{initials(a.full_name)}</div></div>
                  <div className="li-text">
                    <div className="li-title">{a.full_name}</div>
                    {a.birth_date && <div className="li-sub">Nato/a il {new Date(a.birth_date).toLocaleDateString('it-IT')}</div>}
                  </div>
                  <span className="arrow">›</span>
                </Link>
              ))}
            </div>
          </div>

          {inactiveAthletes.length > 0 && (
            <div className="card">
              <a style={{cursor:'pointer', fontSize:14}} onClick={()=>setShowInactive(s=>!s)}>
                {showInactive ? '▾' : '▸'} Allievi disattivati ({inactiveAthletes.length})
              </a>
              {showInactive && inactiveAthletes.map(a => (
                <div key={a.id} className="list-item">
                  <div className="li-text"><div className="li-title" style={{color:'var(--muted)'}}>{a.full_name}</div></div>
                  <button className="btn secondary" style={{padding:'8px 12px', fontSize:12.5}} disabled={reactivating===a.id} onClick={()=>handleReactivateAthlete(a.id)}>
                    {reactivating===a.id ? 'Attendere…' : '↩ Riattiva'}
                  </button>
                </div>
              ))}
            </div>
          )}
          </>
          )}
        </>
      )}

      {/* ---- Conferma cambio pacchetto, con differenza di prezzo ---- */}
      <ConfirmDialog
        open={!!planChangeTarget}
        title="Confermi il cambio pacchetto?"
        confirmLabel="Conferma cambio pacchetto"
        busy={billingBusy}
        onCancel={()=>setPlanChangeTarget(null)}
        onConfirm={confirmChangePlan}
      >
        <div className="price-compare">
          <div className="pc-item">
            <div className="label">Attuale</div>
            <div className="amount">{currentPlan?.label}</div>
            <div className="muted" style={{fontSize:12}}>{priceLabel(planPrices, coach?.plan_tier)}</div>
          </div>
          <div className="arrow">→</div>
          <div className="pc-item">
            <div className="label">Nuovo</div>
            <div className="amount" style={{color:'var(--accent)'}}>{targetPlan?.label}</div>
            <div className="muted" style={{fontSize:12}}>{priceLabel(planPrices, planChangeTarget)}</div>
          </div>
        </div>
        <p className="muted" style={{fontSize:13}}>
          Stripe addebiterà o accrediterà automaticamente la differenza proporzionale ai giorni rimanenti del periodo in corso. La quota allievi passerà a {targetPlan?.quota}.
        </p>
      </ConfirmDialog>

      {/* ---- Annullamento: passo 1, avviso ---- */}
      <ConfirmDialog
        open={cancelStep === 1}
        title="Annullare l'abbonamento?"
        confirmLabel="Continua"
        danger
        onCancel={()=>setCancelStep(0)}
        onConfirm={()=>setCancelStep(2)}
      >
        <p>
          Il tuo accesso resterà attivo fino al <b>{formatDate(coach?.current_period_end)}</b> (già pagato).
          Da quel momento, <b>tu e i tuoi {athletes.length} allievi</b> non potrete più accedere ai dati finché non riattivi un pacchetto.
        </p>
      </ConfirmDialog>

      {/* ---- Annullamento: passo 2, conferma scritta ---- */}
      <ConfirmDialog
        open={cancelStep === 2}
        title="Conferma definitiva"
        confirmLabel="Annulla abbonamento"
        danger
        busy={billingBusy}
        confirmDisabled={cancelTyped.trim().toUpperCase() !== 'ANNULLA'}
        onCancel={()=>{setCancelStep(0); setCancelTyped('');}}
        onConfirm={confirmCancel}
      >
        <p className="muted">Per confermare, scrivi <b style={{color:'var(--text)'}}>ANNULLA</b> qui sotto:</p>
        <input
          className="field-hint"
          style={{width:'100%', padding:'12px 14px', borderRadius:10, border:'1px solid var(--line)', background:'var(--surface2)', color:'var(--text)', marginTop:6, fontSize:16}}
          value={cancelTyped}
          onChange={e=>setCancelTyped(e.target.value)}
          autoFocus
        />
        {cancelTyped && cancelTyped.trim().toUpperCase() !== 'ANNULLA' && (
          <div className="error">Scrivi esattamente "ANNULLA" per abilitare il pulsante.</div>
        )}
      </ConfirmDialog>

      <nav className="bottom-nav">
        <button className={'bottom-nav-item' + (activeTab==='allievi' ? ' active' : '')} onClick={()=>{setActiveTab('allievi'); window.scrollTo({top:0, behavior:'smooth'});}}><span className="bn-icon">🏠</span>Home</button>
        <button className={'bottom-nav-item' + (activeTab==='abbonamento' ? ' active' : '')} onClick={()=>{setActiveTab('abbonamento'); window.scrollTo({top:0, behavior:'smooth'});}}><span className="bn-icon">⚙️</span>Impostazioni</button>
      </nav>
    </div>
  );
}
