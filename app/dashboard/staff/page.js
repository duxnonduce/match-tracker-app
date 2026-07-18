'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

const EMPTY_NEW = { fullName: '', pin: '', pinConfirm: '', role: 'staff' };

export default function StaffManagementPage() {
  const router = useRouter();
  const [academyId, setAcademyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notAdmin, setNotAdmin] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newStaff, setNewStaff] = useState(EMPTY_NEW);
  const [addError, setAddError] = useState('');
  const [revealedPin, setRevealedPin] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editPin, setEditPin] = useState('');
  const [busy, setBusy] = useState(false);

  function authHeader() {
    return { Authorization: `Bearer ${localStorage.getItem('staff_token')}` };
  }

  async function loadStaff(id) {
    const res = await fetch('/api/staff/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ academyId: id }),
    });
    if (res.status === 403) { setNotAdmin(true); setLoading(false); return; }
    const data = await res.json();
    setStaffList(data.staff || []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      const staffToken = localStorage.getItem('staff_token');
      if (!staffToken) { router.push('/pin'); return; }
      if (localStorage.getItem('staff_role') !== 'admin') { setNotAdmin(true); setLoading(false); return; }
      setAcademyId(session.user.id);
      await loadStaff(session.user.id);
    })();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setAddError('');
    if (!/^\d{4,6}$/.test(newStaff.pin)) { setAddError('Il PIN deve essere numerico, da 4 a 6 cifre.'); return; }
    if (newStaff.pin !== newStaff.pinConfirm) { setAddError('I due PIN non coincidono.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/staff/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ academyId, fullName: newStaff.fullName, pin: newStaff.pin, role: newStaff.role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      setRevealedPin({ name: newStaff.fullName, pin: newStaff.pin });
      setNewStaff(EMPTY_NEW);
      setShowAddForm(false);
      await loadStaff(academyId);
    } catch (err) {
      setAddError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleActive(member) {
    if (!confirm(`${member.active ? 'Disattivare' : 'Riattivare'} ${member.full_name}?`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/staff/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ academyId, staffId: member.id, active: !member.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      await loadStaff(academyId);
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleRole(member) {
    const newRole = member.role === 'admin' ? 'staff' : 'admin';
    if (!confirm(`${member.full_name} diventerà ${newRole === 'admin' ? 'Super Operatore' : 'maestro normale'}. Continuare?`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/staff/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ academyId, staffId: member.id, role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      await loadStaff(academyId);
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleChangePin(member) {
    if (!/^\d{4,6}$/.test(editPin)) { alert('Il PIN deve essere numerico, da 4 a 6 cifre.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/staff/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({ academyId, staffId: member.id, newPin: editPin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      setEditingId(null);
      setEditPin('');
      alert(`Nuovo PIN per ${member.full_name}: ${editPin} — comunicaglielo ora, non sarà più visibile.`);
    } catch (err) {
      alert('Errore: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="wrap"><p className="muted">Caricamento…</p></div>;

  if (notAdmin) {
    return (
      <div className="wrap">
        <p className="error">Solo il Super Operatore dell'Academy può gestire lo staff.</p>
        <Link href="/dashboard" className="btn secondary">← Torna alla dashboard</Link>
      </div>
    );
  }

  return (
    <div className="wrap">
      <Link href="/dashboard" className="muted">← Torna alla dashboard</Link>

      <div className="card" style={{marginTop:14}}>
        <div className="section-title-row">
          <div className="icon-badge">👥</div>
          <h2>Gestione staff</h2>
        </div>
        <p className="muted">Aggiungi maestri, cambia i loro PIN, promuovi o rimuovi l'accesso — tutti condividono l'accesso email/password dell'Academy, ma si identificano col proprio PIN.</p>

        {!showAddForm && <button className="btn secondary" onClick={()=>setShowAddForm(true)}>➕ Aggiungi maestro</button>}

        {showAddForm && (
          <form onSubmit={handleAdd} style={{marginTop:14}}>
            <div className="field"><label>Nome e cognome</label><input value={newStaff.fullName} onChange={e=>setNewStaff(s=>({...s, fullName:e.target.value}))} required /></div>
            <div className="field-row2">
              <div className="field"><label>PIN</label><input value={newStaff.pin} onChange={e=>setNewStaff(s=>({...s, pin:e.target.value}))} inputMode="numeric" maxLength={6} placeholder="4-6 cifre" required /></div>
              <div className="field"><label>Ripeti PIN</label><input value={newStaff.pinConfirm} onChange={e=>setNewStaff(s=>({...s, pinConfirm:e.target.value}))} inputMode="numeric" maxLength={6} required /></div>
            </div>
            <div className="field">
              <label>Ruolo</label>
              <select value={newStaff.role} onChange={e=>setNewStaff(s=>({...s, role:e.target.value}))}>
                <option value="staff">Maestro (normale)</option>
                <option value="admin">Super Operatore (accesso completo)</option>
              </select>
            </div>
            {addError && <div className="error">{addError}</div>}
            <div className="row" style={{gap:8}}>
              <button className="btn secondary" type="button" style={{flex:1}} onClick={()=>{setShowAddForm(false); setAddError(''); setNewStaff(EMPTY_NEW);}}>Annulla</button>
              <button className="btn" type="submit" style={{flex:1}} disabled={busy}>Aggiungi</button>
            </div>
          </form>
        )}

        {revealedPin && (
          <div className="pin-reveal">
            <div className="muted">PIN generato per <b style={{color:'var(--text)'}}>{revealedPin.name}</b>. Comunicalo ora. Non sarà più visibile.</div>
            <div className="pin">{revealedPin.pin}</div>
            <button className="btn secondary" style={{marginTop:10}} onClick={()=>setRevealedPin(null)}>Ho preso nota, nascondi</button>
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{fontSize:16}}>Staff attuale ({staffList.length})</h2>
        {staffList.map(m => (
          <div key={m.id} className="list-item" style={{flexDirection:'column', alignItems:'stretch'}}>
            <div className="row">
              <div className="li-text">
                <div className="li-title">
                  {m.full_name}
                  {m.role === 'admin' && <span style={{marginLeft:8, fontSize:10, color:'var(--accent)', border:'1px solid var(--accent)', borderRadius:6, padding:'1px 6px', textTransform:'uppercase'}}>Super Operatore</span>}
                  {!m.active && <span style={{marginLeft:8, fontSize:10, color:'var(--muted)', border:'1px solid var(--line)', borderRadius:6, padding:'1px 6px', textTransform:'uppercase'}}>Disattivato</span>}
                </div>
              </div>
            </div>
            <div className="row" style={{gap:6, marginTop:8, flexWrap:'wrap'}}>
              <button className="btn secondary" style={{padding:'7px 10px', fontSize:12}} disabled={busy} onClick={()=>{setEditingId(editingId===m.id?null:m.id); setEditPin('');}}>🔑 Cambia PIN</button>
              <button className="btn secondary" style={{padding:'7px 10px', fontSize:12}} disabled={busy} onClick={()=>handleToggleRole(m)}>{m.role==='admin' ? '↓ Rendi maestro normale' : '↑ Rendi Super Operatore'}</button>
              <button className="btn secondary" style={{padding:'7px 10px', fontSize:12, color: m.active ? 'var(--danger)' : 'var(--ok)'}} disabled={busy} onClick={()=>handleToggleActive(m)}>{m.active ? '⏸ Disattiva' : '↩ Riattiva'}</button>
            </div>
            {editingId === m.id && (
              <div className="row" style={{gap:8, marginTop:8}}>
                <input value={editPin} onChange={e=>setEditPin(e.target.value)} inputMode="numeric" maxLength={6} placeholder="Nuovo PIN" style={{flex:1, padding:'9px 12px', borderRadius:9, border:'1px solid var(--line)', background:'var(--surface2)', color:'var(--text)'}} />
                <button className="btn" style={{padding:'8px 14px'}} disabled={busy} onClick={()=>handleChangePin(m)}>Salva</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
