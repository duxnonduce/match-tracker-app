'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function AdminOverviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [adminName, setAdminName] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/admin/login'); return; }
      const res = await fetch('/api/admin/overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { router.replace('/admin/login'); return; }
      const json = await res.json();
      setData(json);
      setAdminName(session.user.email);
      setLoading(false);
    })();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/admin/login');
  }

  if (loading) return <div className="wrap"><p className="muted" style={{marginTop:60, textAlign:'center'}}>Caricamento…</p></div>;

  return (
    <div className="wrap">
      <div className="topbar-slim">
        <div className="who">
          <div className="avatar">🛡️</div>
          <div className="who-text">
            <h1>Pannello Amministrativo</h1>
            <div className="sub">{adminName}</div>
          </div>
        </div>
        <button className="icon-btn" onClick={handleLogout} title="Esci">⏻</button>
      </div>

      <div className="tab-bar-v4" style={{marginBottom:16}}>
        <Link href="/admin" className="tab-btn-v4 active">📊 Panoramica</Link>
        <Link href="/admin/academies" className="tab-btn-v4">🏫 Academy</Link>
        <Link href="/admin/revenue" className="tab-btn-v4">💰 Incassi</Link>
      </div>

      <div className="card">
        <h2 style={{fontSize:16}}>Academy</h2>
        <div className="bento-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">🏫</span><span className="bc-value">{data.academies.total}</span><span className="bc-label">Totali</span></div>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">✅</span><span className="bc-value" style={{color:'var(--ok)'}}>{data.academies.active}</span><span className="bc-label">Attive</span></div>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">⏸</span><span className="bc-value" style={{color:'#e3b23c'}}>{data.academies.suspended}</span><span className="bc-label">Sospese</span></div>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">⛔</span><span className="bc-value" style={{color:'var(--danger)'}}>{data.academies.blocked}</span><span className="bc-label">Bloccate</span></div>
        </div>
      </div>

      <div className="card">
        <h2 style={{fontSize:16}}>Persone</h2>
        <div className="bento-grid" style={{gridTemplateColumns:'repeat(2,1fr)'}}>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">👥</span><span className="bc-value">{data.staff.total}</span><span className="bc-label">Maestri totali</span></div>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">🎾</span><span className="bc-value">{data.athletes.total}</span><span className="bc-label">Atleti totali</span></div>
        </div>
      </div>

      <div className="card">
        <h2 style={{fontSize:16}}>Abbonamenti</h2>
        <div className="bento-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">💳</span><span className="bc-value" style={{color:'var(--ok)'}}>{data.subscriptions.active}</span><span className="bc-label">Attivi</span></div>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">⚠️</span><span className="bc-value" style={{color:'var(--danger)'}}>{data.subscriptions.pastDue}</span><span className="bc-label">Pagamento fallito</span></div>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">🚫</span><span className="bc-value">{data.subscriptions.canceled}</span><span className="bc-label">Annullati</span></div>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">➖</span><span className="bc-value">{data.subscriptions.inactive}</span><span className="bc-label">Inattivi</span></div>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">🎁</span><span className="bc-value">{data.subscriptions.manualOverrides}</span><span className="bc-label">Gratuiti/manuali</span></div>
        </div>
      </div>

      <div className="card">
        <h2 style={{fontSize:16}}>Nuove registrazioni</h2>
        <div className="bento-grid" style={{gridTemplateColumns:'repeat(2,1fr)'}}>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">🆕</span><span className="bc-value">{data.registrations.last7Days}</span><span className="bc-label">Ultimi 7 giorni</span></div>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">🆕</span><span className="bc-value">{data.registrations.last30Days}</span><span className="bc-label">Ultimi 30 giorni</span></div>
        </div>
      </div>

      {data.attention.length > 0 && (
        <div className="card">
          <h2 style={{fontSize:16, color:'var(--danger)'}}>⚠️ Da controllare — pagamento fallito</h2>
          {data.attention.map(a => (
            <Link key={a.id} href={`/admin/academies/${a.id}`} className="list-item" style={{textDecoration:'none', color:'inherit'}}>
              <div className="li-text"><div className="li-title">{a.academy_name || a.email}</div><div className="li-sub">{a.email}</div></div>
              <span className="muted">→</span>
            </Link>
          ))}
        </div>
      )}

      <div className="card">
        <h2 style={{fontSize:16}}>Ultime registrazioni</h2>
        {data.recentSignups.map(a => (
          <Link key={a.id} href={`/admin/academies/${a.id}`} className="list-item" style={{textDecoration:'none', color:'inherit'}}>
            <div className="li-text">
              <div className="li-title">{a.academy_name || a.email}</div>
              <div className="li-sub">{new Date(a.created_at).toLocaleDateString('it-IT')} · {a.subscription_status}</div>
            </div>
            <span className="muted">→</span>
          </Link>
        ))}
      </div>

      <Link href="/admin/academies" className="btn block">🏫 Vedi tutte le Academy →</Link>
    </div>
  );
}
