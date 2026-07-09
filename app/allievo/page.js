'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Footer from '../../lib/Footer';

export default function AthleteLogin() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('athlete_token');
    if (!token) { setChecking(false); return; }
    // C'è già un token salvato: verifichiamolo prima di mostrare di nuovo il PIN.
    (async () => {
      const res = await fetch('/api/athlete/matches', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { router.replace('/allievo/dashboard'); return; }
      localStorage.removeItem('athlete_token');
      localStorage.removeItem('athlete_name');
      setChecking(false);
    })();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/athlete/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'PIN non valido');
      localStorage.setItem('athlete_token', data.token);
      localStorage.setItem('athlete_name', data.athlete.fullName);
      router.push('/allievo/dashboard');
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
        <div style={{fontSize:34, marginBottom:6}}>🎾</div>
        <h1 style={{fontSize:22}}>Accedi con il tuo PIN</h1>
        <p className="muted">Il PIN te lo ha dato il tuo maestro.</p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <input
              value={pin}
              onChange={e=>setPin(e.target.value)}
              inputMode="numeric"
              maxLength={6}
              style={{textAlign:'center', fontSize:24, letterSpacing:8, fontFamily:'Oswald'}}
              required
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn block" type="submit" disabled={loading}>
            {loading ? 'Verifica…' : 'Entra'}
          </button>
        </form>
      </div>
      <Footer />
    </div>
  );
}
