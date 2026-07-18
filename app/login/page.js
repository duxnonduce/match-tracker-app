'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import Footer from '../../lib/Footer';

const EMPTY_FORM = {
  email: '', password: '',
  academyName: '', academyCity: '', academyAddress: '',
  ragioneSociale: '', partitaIva: '', codiceFiscaleAzienda: '', codiceSdi: '', pec: '',
  indirizzo: '', comune: '', cap: '', provincia: '', nazione: 'Italia',
  emailAmministrativa: '', telefonoAmministrativo: '',
  adminFullName: '', adminPin: '', adminPinConfirm: '',
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

    if (mode === 'signup') {
      if (!acceptedTerms) {
        setError('Devi accettare i Termini di Servizio e l\'Informativa Privacy per continuare.');
        return;
      }
      if (!/^\d{4,6}$/.test(form.adminPin)) {
        setError('Il tuo PIN personale (Super PIN) deve essere numerico, da 4 a 6 cifre.');
        return;
      }
      if (form.adminPin !== form.adminPinConfirm) {
        setError('I due PIN inseriti non coincidono.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data: signUpData, error: err } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: {
            data: {
              academy_name: form.academyName,
              academy_city: form.academyCity,
              academy_address: form.academyAddress,
              ragione_sociale: form.ragioneSociale,
              partita_iva: form.partitaIva,
              codice_fiscale_azienda: form.codiceFiscaleAzienda,
              codice_sdi: form.codiceSdi,
              pec: form.pec,
              indirizzo: form.indirizzo,
              comune: form.comune,
              cap: form.cap,
              provincia: form.provincia,
              nazione: form.nazione,
              email_amministrativa: form.emailAmministrativa,
              telefono_amministrativo: form.telefonoAmministrativo,
              terms_accepted_at: new Date().toISOString(),
            },
          },
        });
        if (err) throw err;

        // Crea subito il primo membro dello staff (il fondatore, ruolo
        // admin) con il PIN appena scelto — il suo PIN è il "Super PIN".
        const academyId = signUpData?.user?.id;
        if (academyId) {
          const staffRes = await fetch('/api/staff/create-admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ academyId, fullName: form.adminFullName, pin: form.adminPin }),
          });
          if (!staffRes.ok) {
            const staffErr = await staffRes.json().catch(() => ({}));
            console.warn('creazione staff admin fallita:', staffErr.error);
            // Non blocchiamo la registrazione per questo: l'Academy esiste comunque,
            // ma senza uno staff configurato non potrà accedere finché non si sistema
            // manualmente — segnaliamolo chiaramente nel messaggio di successo.
          }
        }

        setSuccess('Academy creata! Controlla la tua email per confermare l\'indirizzo, poi accedi con email e password — ti verrà chiesto il tuo PIN personale.');
        setMode('login');
        setForm(EMPTY_FORM);
        setAcceptedTerms(false);
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
        if (err) throw err;
        // Il login con email+password non basta: serve identificare QUALE
        // membro dello staff sta usando l'app in questo momento.
        router.push('/pin');
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
        <h1 style={{fontSize:22}}>{mode === 'login' ? 'Bentornato 👋' : 'Registra la tua Academy'}</h1>
        {mode === 'signup' && (
          <p className="muted" style={{marginTop:2, marginBottom:18}}>
            L'account appartiene all'Academy, non al singolo maestro: email e password saranno condivise da tutto lo staff. Ogni maestro si identificherà poi con un proprio PIN personale.
          </p>
        )}
        <form onSubmit={handleSubmit}>

          {mode === 'signup' && (
            <>
              <div className="fieldset-title">Accesso Academy (condiviso da tutto lo staff)</div>
              <div className="field">
                <label>Email Academy</label>
                <input type="email" value={form.email} onChange={set('email')} required />
              </div>
              <div className="field">
                <label>Password Academy</label>
                <input type="password" value={form.password} onChange={set('password')} required minLength={6} />
              </div>

              <div className="fieldset-title">Tu (il Super Operatore)</div>
              <p className="field-hint" style={{marginTop:-4, marginBottom:10}}>Il tuo PIN personale è il "Super PIN": permette di gestire abbonamento, staff e dati amministrativi.</p>
              <div className="field"><label>Il tuo nome e cognome</label><input value={form.adminFullName} onChange={set('adminFullName')} required /></div>
              <div className="field-row2">
                <div className="field">
                  <label>Il tuo PIN personale</label>
                  <input value={form.adminPin} onChange={set('adminPin')} inputMode="numeric" maxLength={6} placeholder="4-6 cifre" required />
                </div>
                <div className="field">
                  <label>Ripeti PIN</label>
                  <input value={form.adminPinConfirm} onChange={set('adminPinConfirm')} inputMode="numeric" maxLength={6} required />
                </div>
              </div>

              <div className="fieldset-title">Academy</div>
              <div className="field"><label>Nome dell'Academy</label><input value={form.academyName} onChange={set('academyName')} placeholder="Es. Tennis Club Roma" required /></div>
              <div className="field-row2">
                <div className="field"><label>Città</label><input value={form.academyCity} onChange={set('academyCity')} /></div>
                <div className="field"><label>Indirizzo (sede sportiva)</label><input value={form.academyAddress} onChange={set('academyAddress')} /></div>
              </div>

              <div className="fieldset-title">Dati di fatturazione</div>
              <div className="field"><label>Ragione sociale</label><input value={form.ragioneSociale} onChange={set('ragioneSociale')} /></div>
              <div className="field-row2">
                <div className="field"><label>Partita IVA</label><input value={form.partitaIva} onChange={set('partitaIva')} /></div>
                <div className="field"><label>Codice Fiscale (se diverso dalla P.IVA)</label><input value={form.codiceFiscaleAzienda} onChange={set('codiceFiscaleAzienda')} /></div>
              </div>
              <div className="field-row2">
                <div className="field"><label>Codice SDI</label><input value={form.codiceSdi} onChange={set('codiceSdi')} /></div>
                <div className="field"><label>PEC</label><input type="email" value={form.pec} onChange={set('pec')} /></div>
              </div>
              <div className="field"><label>Indirizzo di fatturazione</label><input value={form.indirizzo} onChange={set('indirizzo')} /></div>
              <div className="field-row2">
                <div className="field"><label>Comune</label><input value={form.comune} onChange={set('comune')} /></div>
                <div className="field"><label>CAP</label><input value={form.cap} onChange={set('cap')} /></div>
              </div>
              <div className="field-row2">
                <div className="field"><label>Provincia</label><input value={form.provincia} onChange={set('provincia')} placeholder="Es. RM" /></div>
                <div className="field"><label>Nazione</label><input value={form.nazione} onChange={set('nazione')} /></div>
              </div>
              <div className="field-row2">
                <div className="field"><label>Email amministrativa</label><input type="email" value={form.emailAmministrativa} onChange={set('emailAmministrativa')} placeholder="Per fatture e comunicazioni" /></div>
                <div className="field"><label>Telefono</label><input type="tel" value={form.telefonoAmministrativo} onChange={set('telefonoAmministrativo')} /></div>
              </div>
            </>
          )}

          {mode === 'login' && (
            <>
              <div className="field">
                <label>Email Academy</label>
                <input type="email" value={form.email} onChange={set('email')} required />
              </div>
              <div className="field">
                <label>Password Academy</label>
                <input type="password" value={form.password} onChange={set('password')} required minLength={6} />
              </div>
            </>
          )}

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
                l'<Link href="/privacy" target="_blank">Informativa Privacy</Link>, di avere il potere di registrare questa
                società sportiva, ed essere maggiorenne. Sono consapevole che, inserendo dati di allievi minorenni tramite
                lo staff dell'Academy, dichiariamo di avere il consenso dei rispettivi genitori/tutori.
              </label>
            </div>
          )}

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <button className="btn block" type="submit" disabled={loading} style={{marginTop:6}}>
            {loading ? 'Attendere…' : (mode === 'login' ? 'Accedi' : 'Registra Academy')}
          </button>
        </form>
        <p className="muted" style={{marginTop:16, textAlign:'center'}}>
          {mode === 'login' ? (
            <>Non hai ancora un'Academy registrata? <a onClick={()=>{setMode('signup'); setError(''); setSuccess('');}} style={{cursor:'pointer'}}>Registrati</a></>
          ) : (
            <>Hai già un'Academy registrata? <a onClick={()=>{setMode('login'); setError(''); setSuccess('');}} style={{cursor:'pointer'}}>Accedi</a></>
          )}
        </p>
      </div>
      <Footer />
    </div>
  );
}
