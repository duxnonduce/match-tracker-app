'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        setError('Account creato! Controlla la tua email per confermare, poi accedi.');
        setMode('login');
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Errore, riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap">
      <div className="card" style={{marginTop:60}}>
        <h1 style={{fontSize:22}}>{mode === 'login' ? 'Accedi' : 'Crea il tuo account maestro'}</h1>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={6} />
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn block" type="submit" disabled={loading}>
            {loading ? 'Attendere…' : (mode === 'login' ? 'Accedi' : 'Crea account')}
          </button>
        </form>
        <p className="muted" style={{marginTop:16, textAlign:'center'}}>
          {mode === 'login' ? (
            <>Non hai un account? <a onClick={()=>setMode('signup')} style={{cursor:'pointer'}}>Registrati</a></>
          ) : (
            <>Hai già un account? <a onClick={()=>setMode('login')} style={{cursor:'pointer'}}>Accedi</a></>
          )}
        </p>
      </div>
    </div>
  );
}
