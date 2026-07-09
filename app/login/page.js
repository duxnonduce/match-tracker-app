'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import Footer from '../../lib/Footer';

const EMPTY_FORM = {
  email: '', password: '',
  firstName: '', lastName: '', phone: '',
  academyName: '', academyCity: '', academyAddress: '',
};

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState(EMPTY_FORM);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { router.replace('/dashboard'); return; }
      setChecking(false);
    })();
  }, []);

  function set(field) {
    return (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (mode === 'signup' && !acceptedTerms) {
      setError('Devi accettare i Termini di Servizio e l\'Informativa Privacy per continuare.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              first_name: form.firstName,
              last_name: form.lastName,
              phone: form.phone,
              academy_name: form.academyName,
              academy_city: form.academyCity,
              academy_address: form.academyAddress,
              terms_accepted_at: new Date().toISOString(),
            },
          },
        });
        if (err) throw err;
        setSuccess('Account creato! Controlla la tua email per confermare, poi accedi.');
        setMode('login');
        setForm(EMPTY_FORM);
        setAcceptedTerms(false);
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (err) throw err;
        router.push('/dashboard');
      }
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
      <div className="card" style={{marginTop:40}}>
        <h1 style={{fontSize:22}}>{mode === 'login' ? 'Bentornato 👋' : 'Crea il tuo account maestro'}</h1>
        {mode === 'signup' && (
          <p className="muted" style={{marginTop:2, marginBottom:18}}>
            Questi dati compariranno sui tuoi report e ci servono per la fatturazione dell'abbonamento.
          </p>
        )}
        <form onSubmit={handleSubmit}>

          {mode === 'signup' && (
            <>
              <div className="fieldset-title">Dati personali</div>
              <div className="field-row2">
                <div className="field"><label>Nome</label><input value={form.firstName} onChange={set('firstName')} required /></div>
                <div className="field"><label>Cognome</label><input value={form.lastName} onChange={set('lastName')} required /></div>
              </div>
              <div className="field"><label>Telefono</label><input type="tel" value={form.phone} onChange={set('phone')} placeholder="+39 ..." /></div>

              <div className="fieldset-title">Accademia / circolo</div>
              <div className="field"><label>Nome dell'accademia</label><input value={form.academyName} onChange={set('academyName')} placeholder="Es. Tennis Club Roma" /></div>
              <div className="field-row2">
                <div className="field"><label>Città</label><input value={form.academyCity} onChange={set('academyCity')} /></div>
                <div className="field"><label>Indirizzo</label><input value={form.academyAddress} onChange={set('academyAddress')} /></div>
              </div>

              <div className="fieldset-title">Accesso</div>
            </>
          )}

          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={set('password')} required minLength={6} />
          </div>

          {mode === 'signup' && (
            <div className="field" style={{display:'flex', alignItems:'flex-start', gap:10}}>
              <input
                type="checkbox"
                id="accept-terms"
                checked={acceptedTerms}
                onChange={e=>setAcceptedTerms(e.target.checked)}
                style={{width:18, height:18, marginTop:2, flexShrink:0}}
                required
              />
              <label htmlFor="accept-terms" style={{fontSize:13, color:'var(--muted)', textTransform:'none', letterSpacing:0, fontWeight:400}}>
                Dichiaro di aver letto e accettato i <Link href="/termini" target="_blank">Termini di Servizio</Link> e
                l'<Link href="/privacy" target="_blank">Informativa Privacy</Link>, e confermo di essere un maestro/istruttore
                maggiorenne. Sono consapevole che, inserendo dati di allievi minorenni, dichiaro di avere il consenso dei
                rispettivi genitori/tutori.
              </label>
            </div>
          )}

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <button className="btn block" type="submit" disabled={loading} style={{marginTop:6}}>
            {loading ? 'Attendere…' : (mode === 'login' ? 'Accedi' : 'Crea account')}
          </button>
        </form>
        <p className="muted" style={{marginTop:16, textAlign:'center'}}>
          {mode === 'login' ? (
            <>Non hai un account? <a onClick={()=>{setMode('signup'); setError(''); setSuccess('');}} style={{cursor:'pointer'}}>Registrati</a></>
          ) : (
            <>Hai già un account? <a onClick={()=>{setMode('login'); setError(''); setSuccess('');}} style={{cursor:'pointer'}}>Accedi</a></>
          )}
        </p>
      </div>
      <Footer />
    </div>
  );
}
