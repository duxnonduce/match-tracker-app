'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function PinPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [academyId, setAcademyId] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      // Se c'è già un token staff valido su questo dispositivo, non serve
      // richiedere di nuovo il PIN: passa dritto alla dashboard.
      const existingToken = localStorage.getItem('staff_token');
      if (existingToken) {
        router.replace('/dashboard');
        return;
      }

      setAcademyId(session.user.id);
      setChecking(false);
    })();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ academyId, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'PIN non valido');
      localStorage.setItem('staff_token', data.token);
      localStorage.setItem('staff_id', data.staff.id);
      localStorage.setItem('staff_name', data.staff.fullName);
      localStorage.setItem('staff_role', data.staff.role);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return <div className="wrap"><p className="muted" style={{marginTop:60, textAlign:'center'}}>Caricamento…</p></div>;
  }

  return (
    <div className="wrap">
      <div className="card" style={{marginTop:60, textAlign:'center'}}>
        <div style={{fontSize:34, marginBottom:6}}>🔐</div>
        <h1 style={{fontSize:22}}>Chi sta usando l'app?</h1>
        <p className="muted">Inserisci il tuo PIN personale per identificarti — serve per sapere chi ha registrato ogni partita e ogni analisi.</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <input
              value={pin}
              onChange={e=>setPin(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              style={{textAlign:'center', fontSize:24, letterSpacing:8, fontFamily:'Oswald'}}
              autoFocus
              required
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn block" type="submit" disabled={loading}>
            {loading ? 'Verifica…' : 'Entra'}
          </button>
        </form>
        <p className="field-hint" style={{marginTop:16}}>Non hai ancora un PIN personale? Chiedilo al Super Operatore della tua Academy.</p>
      </div>
    </div>
  );
}
