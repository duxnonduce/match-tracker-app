'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const res = await fetch('/api/admin/overview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) { router.replace('/admin'); return; }
        await supabase.auth.signOut(); // sessione di un'Academy, non di un admin: non deve restare "loggata" qui
      }
      setChecking(false);
    })();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;

      const res = await fetch('/api/admin/overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
      });
      if (!res.ok) {
        await supabase.auth.signOut();
        throw new Error('Queste credenziali non hanno accesso al pannello amministrativo.');
      }
      router.push('/admin');
    } catch (err) {
      setError(err.message || 'Errore, riprova.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <div className="wrap"><p className="muted" style={{marginTop:60, textAlign:'center'}}>Caricamento…</p></div>;
  }

  return (
    <div className="wrap">
      <div className="card" style={{marginTop:60}}>
        <h1 style={{fontSize:22}}>🔐 Pannello amministrativo</h1>
        <p className="muted">Accesso riservato — non è collegato agli account delle Academy.</p>
        <form onSubmit={handleSubmit}>
          <div className="field"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
          <div className="field"><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
          {error && <div className="error">{error}</div>}
          <button className="btn block" type="submit" disabled={loading}>{loading ? 'Verifica…' : 'Accedi'}</button>
        </form>
      </div>
    </div>
  );
}
