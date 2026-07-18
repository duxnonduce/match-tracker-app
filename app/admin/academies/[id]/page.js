'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabaseClient';

const PLAN_OPTIONS = [
  { id: 'base10', label: 'Base (10 partite/mese)' },
  { id: 'plus30', label: 'Plus (30 partite/mese)' },
  { id: 'pro50', label: 'Pro (50 partite/mese)' },
  { id: 'oro', label: 'Oro (illimitato)' },
];

export default function AdminAcademyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const [grantPlan, setGrantPlan] = useState('base10');
  const [grantMonths, setGrantMonths] = useState(1);
  const [grantReason, setGrantReason] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  async function authHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` };
  }

  async function load() {
    const headers = await authHeaders();
    const res = await fetch('/api/admin/academies/get', {
      method: 'POST', headers, body: JSON.stringify({ academyId: params.id }),
    });
    if (!res.ok) { router.replace('/admin/login'); return; }
    const json = await res.json();
    setData(json);
    setEditForm({ ...json.academy });
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/admin/login'); return; }
      setToken(session.access_token);
      await load();
    })();
  }, []);

  async function handleSaveEdit() {
    setBusy(true); setMsg('');
    try {
      const headers = await authHeaders();
      const fields = {};
      ['academy_name','academy_city','academy_address','ragione_sociale','partita_iva','codice_fiscale_azienda','codice_sdi','pec','indirizzo','comune','cap','provincia','nazione','email_amministrativa','telefono_amministrativo','internal_notes'].forEach(k => { fields[k] = editForm[k]; });
      const res = await fetch('/api/admin/academies/manage', {
        method: 'POST', headers, body: JSON.stringify({ academyId: params.id, action: 'update', fields }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMsg('✅ Salvato');
      setEditing(false);
      await load();
    } catch (err) { setMsg('Errore: ' + err.message); } finally { setBusy(false); }
  }

  async function handleSetStatus(adminStatus) {
    if (!confirm(`Impostare questa Academy come "${adminStatus}"?`)) return;
    setBusy(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/academies/manage', {
        method: 'POST', headers, body: JSON.stringify({ academyId: params.id, action: 'set-admin-status', adminStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
    } catch (err) { alert('Errore: ' + err.message); } finally { setBusy(false); }
  }

  async function handleGrant() {
    setBusy(true); setMsg('');
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/academies/manage', {
        method: 'POST', headers,
        body: JSON.stringify({ academyId: params.id, action: 'grant-subscription', plan: grantPlan, months: grantMonths, reason: grantReason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMsg('✅ Abbonamento assegnato');
      await load();
    } catch (err) { setMsg('Errore: ' + err.message); } finally { setBusy(false); }
  }

  async function handleEndOverride() {
    if (!confirm('Tornare alla gestione normale via Stripe per questa Academy?')) return;
    setBusy(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/academies/manage', {
        method: 'POST', headers, body: JSON.stringify({ academyId: params.id, action: 'end-manual-override' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
    } catch (err) { alert('Errore: ' + err.message); } finally { setBusy(false); }
  }

  async function handleToggleStaff(staffId) {
    setBusy(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/staff/manage', {
        method: 'POST', headers, body: JSON.stringify({ staffId, action: 'toggle-active' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
    } catch (err) { alert('Errore: ' + err.message); } finally { setBusy(false); }
  }

  async function handleResetStaffPin(staffId, staffName) {
    const newPin = prompt(`Nuovo PIN per ${staffName} (4-6 cifre numeriche):`);
    if (!newPin) return;
    setBusy(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/staff/manage', {
        method: 'POST', headers, body: JSON.stringify({ staffId, action: 'reset-pin', newPin }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      alert(`Nuovo PIN per ${staffName}: ${newPin}`);
    } catch (err) { alert('Errore: ' + err.message); } finally { setBusy(false); }
  }

  async function handleToggleAthlete(athleteId) {
    setBusy(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/athletes/manage', {
        method: 'POST', headers, body: JSON.stringify({ athleteId, action: 'toggle-active' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
    } catch (err) { alert('Errore: ' + err.message); } finally { setBusy(false); }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/admin/academies/manage', {
        method: 'POST', headers, body: JSON.stringify({ academyId: params.id, action: 'delete' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      router.push('/admin/academies');
    } catch (err) { alert('Errore: ' + err.message); setBusy(false); }
  }

  if (loading) return <div className="wrap"><p className="muted" style={{marginTop:60, textAlign:'center'}}>Caricamento…</p></div>;

  const a = data.academy;

  return (
    <div className="wrap">
      <Link href="/admin/academies" className="muted">← Elenco Academy</Link>

      <div className="card" style={{marginTop:14}}>
        <div className="row">
          <h1 style={{fontSize:20}}>{a.academy_name || '(senza nome)'}</h1>
          <span style={{
            fontSize:11, textTransform:'uppercase', padding:'3px 10px', borderRadius:8,
            color: a.admin_status==='active' ? 'var(--ok)' : a.admin_status==='suspended' ? '#e3b23c' : 'var(--danger)',
            border:'1px solid currentColor',
          }}>{a.admin_status}</span>
        </div>
        <p className="muted">{a.email}</p>

        <div className="bento-grid" style={{gridTemplateColumns:'repeat(4,1fr)', marginTop:10}}>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">👥</span><span className="bc-value">{data.staff.length}</span><span className="bc-label">Maestri</span></div>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">🎾</span><span className="bc-value">{data.athletes.length}</span><span className="bc-label">Atleti</span></div>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">📋</span><span className="bc-value">{data.counts.matches}</span><span className="bc-label">Partite</span></div>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">🎯</span><span className="bc-value">{data.counts.trainingSessions}</span><span className="bc-label">Allenamenti</span></div>
        </div>

        <div className="row" style={{gap:8, marginTop:16, flexWrap:'wrap'}}>
          <button className="btn secondary" style={{flex:1}} disabled={busy || a.admin_status==='active'} onClick={()=>handleSetStatus('active')}>✅ Attiva</button>
          <button className="btn secondary" style={{flex:1}} disabled={busy || a.admin_status==='suspended'} onClick={()=>handleSetStatus('suspended')}>⏸ Sospendi</button>
          <button className="btn danger" style={{flex:1}} disabled={busy || a.admin_status==='blocked'} onClick={()=>handleSetStatus('blocked')}>⛔ Blocca</button>
        </div>
      </div>

      <div className="card">
        <div className="row">
          <h2 style={{fontSize:16}}>💳 Abbonamento</h2>
        </div>
        <div className="stat-mini-grid">
          <div className="stat-mini"><div className="v" style={{fontSize:14}}>{a.plan_tier}</div><div className="l">Piano</div></div>
          <div className="stat-mini"><div className="v" style={{fontSize:14}}>{a.subscription_status}</div><div className="l">Stato Stripe</div></div>
          <div className="stat-mini"><div className="v" style={{fontSize:13}}>{a.current_period_end ? new Date(a.current_period_end).toLocaleDateString('it-IT') : '—'}</div><div className="l">Scadenza</div></div>
          <div className="stat-mini"><div className="v" style={{fontSize:13}}>{a.is_manual_override ? '🎁 Manuale' : 'Stripe'}</div><div className="l">Gestione</div></div>
        </div>
        {a.is_manual_override && a.manual_override_reason && (
          <p className="field-hint">Motivo: {a.manual_override_reason} — <a style={{cursor:'pointer'}} onClick={handleEndOverride}>torna alla gestione Stripe</a></p>
        )}

        <div className="fieldset-title" style={{marginTop:16}}>Assegna/proroga manualmente</div>
        <div className="field-row2">
          <div className="field">
            <label>Piano</label>
            <select value={grantPlan} onChange={e=>setGrantPlan(e.target.value)}>
              {PLAN_OPTIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <div className="field"><label>Durata (mesi)</label><input type="number" min="1" value={grantMonths} onChange={e=>setGrantMonths(e.target.value)} /></div>
        </div>
        <div className="field">
          <label>Motivo interno</label>
          <select value={grantReason} onChange={e=>setGrantReason(e.target.value)}>
            <option value="">— seleziona —</option>
            <option value="Omaggio">Omaggio</option>
            <option value="Partner">Partner</option>
            <option value="Test">Test</option>
            <option value="Accordo commerciale">Accordo commerciale</option>
            <option value="Assistenza">Assistenza</option>
          </select>
        </div>
        <button className="btn block" disabled={busy} onClick={handleGrant}>🎁 Assegna abbonamento</button>
        {msg && <p className="muted" style={{marginTop:8}}>{msg}</p>}
      </div>

      <div className="card">
        <div className="row">
          <h2 style={{fontSize:16}}>📋 Dati Academy</h2>
          {!editing && <button className="btn secondary" onClick={()=>setEditing(true)}>Modifica</button>}
        </div>
        {editing ? (
          <>
            <div className="field"><label>Nome Academy</label><input value={editForm.academy_name||''} onChange={e=>setEditForm(f=>({...f, academy_name:e.target.value}))} /></div>
            <div className="field-row2">
              <div className="field"><label>Città</label><input value={editForm.academy_city||''} onChange={e=>setEditForm(f=>({...f, academy_city:e.target.value}))} /></div>
              <div className="field"><label>Indirizzo</label><input value={editForm.academy_address||''} onChange={e=>setEditForm(f=>({...f, academy_address:e.target.value}))} /></div>
            </div>
            <div className="fieldset-title">Fatturazione</div>
            <div className="field"><label>Ragione sociale</label><input value={editForm.ragione_sociale||''} onChange={e=>setEditForm(f=>({...f, ragione_sociale:e.target.value}))} /></div>
            <div className="field-row2">
              <div className="field"><label>Partita IVA</label><input value={editForm.partita_iva||''} onChange={e=>setEditForm(f=>({...f, partita_iva:e.target.value}))} /></div>
              <div className="field"><label>Codice Fiscale</label><input value={editForm.codice_fiscale_azienda||''} onChange={e=>setEditForm(f=>({...f, codice_fiscale_azienda:e.target.value}))} /></div>
            </div>
            <div className="field-row2">
              <div className="field"><label>Codice SDI</label><input value={editForm.codice_sdi||''} onChange={e=>setEditForm(f=>({...f, codice_sdi:e.target.value}))} /></div>
              <div className="field"><label>PEC</label><input value={editForm.pec||''} onChange={e=>setEditForm(f=>({...f, pec:e.target.value}))} /></div>
            </div>
            <div className="field"><label>Indirizzo fatturazione</label><input value={editForm.indirizzo||''} onChange={e=>setEditForm(f=>({...f, indirizzo:e.target.value}))} /></div>
            <div className="field-row2">
              <div className="field"><label>Comune</label><input value={editForm.comune||''} onChange={e=>setEditForm(f=>({...f, comune:e.target.value}))} /></div>
              <div className="field"><label>CAP</label><input value={editForm.cap||''} onChange={e=>setEditForm(f=>({...f, cap:e.target.value}))} /></div>
            </div>
            <div className="field-row2">
              <div className="field"><label>Provincia</label><input value={editForm.provincia||''} onChange={e=>setEditForm(f=>({...f, provincia:e.target.value}))} /></div>
              <div className="field"><label>Nazione</label><input value={editForm.nazione||''} onChange={e=>setEditForm(f=>({...f, nazione:e.target.value}))} /></div>
            </div>
            <div className="field-row2">
              <div className="field"><label>Email amministrativa</label><input value={editForm.email_amministrativa||''} onChange={e=>setEditForm(f=>({...f, email_amministrativa:e.target.value}))} /></div>
              <div className="field"><label>Telefono</label><input value={editForm.telefono_amministrativo||''} onChange={e=>setEditForm(f=>({...f, telefono_amministrativo:e.target.value}))} /></div>
            </div>
            <div className="fieldset-title">Note interne</div>
            <div className="field"><textarea className="textarea" rows={3} value={editForm.internal_notes||''} onChange={e=>setEditForm(f=>({...f, internal_notes:e.target.value}))} placeholder="Visibili solo a te" /></div>
            <div className="row" style={{gap:8}}>
              <button className="btn secondary" style={{flex:1}} onClick={()=>{setEditing(false); setEditForm({...a});}}>Annulla</button>
              <button className="btn" style={{flex:1}} disabled={busy} onClick={handleSaveEdit}>Salva</button>
            </div>
          </>
        ) : (
          <div className="stat-mini-grid">
            <div className="stat-mini"><div className="v" style={{fontSize:13}}>{a.ragione_sociale || '—'}</div><div className="l">Ragione sociale</div></div>
            <div className="stat-mini"><div className="v" style={{fontSize:13}}>{a.partita_iva || '—'}</div><div className="l">P.IVA</div></div>
            <div className="stat-mini"><div className="v" style={{fontSize:13}}>{a.pec || '—'}</div><div className="l">PEC</div></div>
            <div className="stat-mini"><div className="v" style={{fontSize:13}}>{a.telefono_amministrativo || '—'}</div><div className="l">Telefono</div></div>
            {a.internal_notes && <div className="stat-mini" style={{gridColumn:'1/-1'}}><div className="v" style={{fontSize:13, fontFamily:'Inter'}}>{a.internal_notes}</div><div className="l">Note interne</div></div>}
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{fontSize:16}}>👥 Staff ({data.staff.length})</h2>
        {data.staff.map(s => (
          <div key={s.id} className="list-item" style={{flexDirection:'column', alignItems:'stretch'}}>
            <div className="li-text">
              <div className="li-title">
                {s.full_name}
                {s.role==='admin' && <span style={{marginLeft:8, fontSize:10, color:'var(--accent)'}}>SUPER OP.</span>}
                {!s.active && <span style={{marginLeft:8, fontSize:10, color:'var(--muted)'}}>DISATTIVO</span>}
              </div>
            </div>
            <div className="row" style={{gap:6, marginTop:6}}>
              <button className="btn secondary" style={{padding:'6px 10px', fontSize:11.5}} disabled={busy} onClick={()=>handleResetStaffPin(s.id, s.full_name)}>🔑 Reset PIN</button>
              <button className="btn secondary" style={{padding:'6px 10px', fontSize:11.5, color: s.active?'var(--danger)':'var(--ok)'}} disabled={busy} onClick={()=>handleToggleStaff(s.id)}>{s.active ? 'Blocca' : 'Riattiva'}</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 style={{fontSize:16}}>🎾 Atleti ({data.athletes.length})</h2>
        {data.athletes.map(ath => (
          <div key={ath.id} className="list-item">
            <div className="li-text">
              <div className="li-title">{ath.full_name} {!ath.active && <span style={{marginLeft:8, fontSize:10, color:'var(--muted)'}}>DISATTIVO</span>}</div>
            </div>
            <button className="btn secondary" style={{padding:'6px 10px', fontSize:11.5, color: ath.active?'var(--danger)':'var(--ok)'}} disabled={busy} onClick={()=>handleToggleAthlete(ath.id)}>{ath.active ? 'Blocca' : 'Riattiva'}</button>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 style={{fontSize:16}}>Ultime partite registrate</h2>
        {data.recentMatches.length === 0 && <p className="muted">Nessuna partita ancora.</p>}
        {data.recentMatches.map(m => (
          <div key={m.id} className="list-item">
            <div className="li-text">
              <div className="li-title">{m.meta?.allievo} vs {m.meta?.avversario}</div>
              <div className="li-sub">{new Date(m.created_at).toLocaleDateString('it-IT')}{m.recorded_by_name ? ' · ' + m.recorded_by_name : ''}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h2 style={{fontSize:16, color:'var(--danger)'}}>⚠️ Zona pericolosa</h2>
        {!showDelete ? (
          <button className="btn danger" onClick={()=>setShowDelete(true)}>🗑 Elimina Academy</button>
        ) : (
          <>
            <p className="muted">Elimina TUTTO: staff, atleti, partite, allenamenti. Non recuperabile. Scrivi ELIMINA per confermare.</p>
            <input value={deleteConfirm} onChange={e=>setDeleteConfirm(e.target.value)} style={{width:'100%', padding:'11px 14px', borderRadius:10, border:'1px solid var(--line)', background:'var(--surface2)', color:'var(--text)', marginBottom:10}} />
            <div className="row" style={{gap:8}}>
              <button className="btn secondary" style={{flex:1}} onClick={()=>{setShowDelete(false); setDeleteConfirm('');}}>Annulla</button>
              <button className="btn danger" style={{flex:1}} disabled={busy || deleteConfirm.trim().toUpperCase()!=='ELIMINA'} onClick={handleDelete}>Elimina definitivamente</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
