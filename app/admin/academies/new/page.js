'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabaseClient';

export default function NewAcademyPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', academyName: '', adminFullName: '', adminPin: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  function set(field) { return (e) => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/academies/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="wrap">
        <div className="card" style={{marginTop:14}}>
          <h1 style={{fontSize:20}}>✅ Academy creata</h1>
          <div className="pin-reveal">
            <div className="muted">Comunica queste credenziali all'Academy. La password non sarà più mostrata.</div>
            <div style={{marginTop:12, fontSize:14}}><b>Email:</b> {result.email}</div>
            <div className="pin" style={{marginTop:8}}>{result.password}</div>
          </div>
          <div className="row" style={{gap:8, marginTop:16}}>
            <Link href="/admin/academies" className="btn secondary" style={{flex:1, textAlign:'center'}}>← Elenco Academy</Link>
            <Link href={`/admin/academies/${result.academyId}`} className="btn" style={{flex:1, textAlign:'center'}}>Apri scheda →</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <Link href="/admin/academies" className="muted">← Elenco Academy</Link>
      <div className="card" style={{marginTop:14}}>
        <h1 style={{fontSize:20}}>➕ Nuova Academy</h1>
        <p className="muted">Crea manualmente un'Academy — utile per collaborazioni, prove o quando registri tu stesso un cliente al telefono.</p>
        <form onSubmit={handleSubmit}>
          <div className="field"><label>Email di accesso</label><input type="email" value={form.email} onChange={set('email')} required /></div>
          <div className="field"><label>Nome dell'Academy</label><input value={form.academyName} onChange={set('academyName')} required /></div>
          <div className="fieldset-title">Primo membro dello staff (Super Operatore)</div>
          <div className="field"><label>Nome e cognome</label><input value={form.adminFullName} onChange={set('adminFullName')} required /></div>
          <div className="field"><label>PIN personale</label><input value={form.adminPin} onChange={set('adminPin')} inputMode="numeric" maxLength={6} placeholder="4-6 cifre" required /></div>
          {error && <div className="error">{error}</div>}
          <button className="btn block" type="submit" disabled={loading}>{loading ? 'Creazione…' : 'Crea Academy'}</button>
        </form>
      </div>
    </div>
  );
}
