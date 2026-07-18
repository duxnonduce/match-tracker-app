'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

const STATUS_COLORS = { active: 'var(--ok)', suspended: '#e3b23c', blocked: 'var(--danger)' };

export default function AdminAcademiesListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [academies, setAcademies] = useState([]);
  const [search, setSearch] = useState('');
  const [token, setToken] = useState(null);

  async function loadList(accessToken, q) {
    const res = await fetch('/api/admin/academies/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ search: q }),
    });
    if (!res.ok) { router.replace('/admin/login'); return; }
    const data = await res.json();
    setAcademies(data.academies || []);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/admin/login'); return; }
      setToken(session.access_token);
      await loadList(session.access_token, '');
    })();
  }, []);

  useEffect(() => {
    if (!token) return;
    const t = setTimeout(() => loadList(token, search), 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="wrap">
      <Link href="/admin" className="muted">← Panoramica</Link>

      <div className="card" style={{marginTop:14}}>
        <div className="row">
          <h2 style={{fontSize:17}}>🏫 Academy <span className="muted" style={{fontSize:13, fontWeight:400}}>({academies.length})</span></h2>
          <Link href="/admin/academies/new" className="btn secondary">➕ Nuova Academy</Link>
        </div>
        <input
          value={search}
          onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Cerca per nome, email o P.IVA..."
          style={{width:'100%', padding:'11px 14px', borderRadius:10, border:'1px solid var(--line)', background:'var(--surface2)', color:'var(--text)', fontSize:14, marginTop:12}}
        />
      </div>

      <div className="card">
        {loading && <p className="muted">Caricamento…</p>}
        {!loading && academies.length === 0 && <p className="muted">Nessuna Academy trovata.</p>}
        {academies.map(a => (
          <Link key={a.id} href={`/admin/academies/${a.id}`} className="list-item" style={{textDecoration:'none', color:'inherit'}}>
            <div className="li-text">
              <div className="li-title">
                {a.academy_name || '(senza nome)'}
                {a.is_manual_override && <span style={{marginLeft:8, fontSize:10, color:'var(--accent)', border:'1px solid var(--accent)', borderRadius:6, padding:'1px 6px', textTransform:'uppercase'}}>Manuale</span>}
              </div>
              <div className="li-sub">{a.email} · {a.plan_tier} · <span style={{color:STATUS_COLORS[a.admin_status]}}>{a.admin_status}</span></div>
            </div>
            <span className="muted">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
