'use client';
import { useState } from 'react';

export default function BootstrapPage() {
  const [email, setEmail] = useState('pointlabtennis@gmail.com');
  const [fullName, setFullName] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName }),
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

  return (
    <div className="wrap">
      <div className="card" style={{marginTop:60}}>
        <h1 style={{fontSize:22}}>🔧 Configurazione pannello amministrativo</h1>
        <p className="muted">Questa pagina crea il primo (e unico) accesso amministratore della piattaforma. Funziona una sola volta.</p>

        {!result ? (
          <>
            <div className="field"><label>Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
            <div className="field"><label>Il tuo nome (facoltativo)</label><input value={fullName} onChange={e=>setFullName(e.target.value)} /></div>
            {error && <div className="error">{error}</div>}
            <button className="btn block" onClick={handleCreate} disabled={loading}>
              {loading ? 'Creazione…' : 'Crea il mio accesso amministratore'}
            </button>
          </>
        ) : (
          <div className="pin-reveal">
            <div className="muted">Accesso creato. Salvalo ora in un posto sicuro (es. un password manager) — la password non sarà più mostrata.</div>
            <div style={{marginTop:12, fontSize:14}}><b>Email:</b> {result.email}</div>
            <div className="pin" style={{marginTop:8}}>{result.password}</div>
            <a href="/admin/login" className="btn block" style={{marginTop:16}}>Vai al login →</a>
          </div>
        )}
      </div>
    </div>
  );
}
