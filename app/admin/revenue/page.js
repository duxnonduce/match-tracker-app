'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';

const PLAN_LABELS = { base10: 'Base', plus30: 'Plus', pro50: 'Pro', oro: 'Oro', sconosciuto: 'Sconosciuto' };
const STATUS_LABELS = { paid: 'Pagata', open: 'Da pagare', draft: 'Bozza', uncollectible: 'Fallita', void: 'Annullata' };
const STATUS_COLORS = { paid: 'var(--ok)', open: '#e3b23c', draft: 'var(--muted)', uncollectible: 'var(--danger)', void: 'var(--muted)' };

function fmtMoney(n) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n || 0);
}

export default function AdminRevenuePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/admin/login'); return; }
      try {
        const res = await fetch('/api/admin/revenue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ period: 'default' }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Errore');
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="wrap"><p className="muted" style={{marginTop:60, textAlign:'center'}}>Caricamento dati da Stripe…</p></div>;

  if (error) {
    return (
      <div className="wrap">
        <Link href="/admin" className="muted">← Panoramica</Link>
        <p className="error" style={{marginTop:14}}>{error}</p>
      </div>
    );
  }

  const filteredTransactions = data.transactions.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search.trim() && !t.academyName.toLowerCase().includes(search.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <div className="wrap">
      <Link href="/admin" className="muted">← Panoramica</Link>

      <div className="tab-bar-v4" style={{marginTop:14, marginBottom:16}}>
        <Link href="/admin" className="tab-btn-v4">📊 Panoramica</Link>
        <Link href="/admin/academies" className="tab-btn-v4">🏫 Academy</Link>
        <Link href="/admin/revenue" className="tab-btn-v4 active">💰 Incassi</Link>
      </div>

      <div className="card">
        <h2 style={{fontSize:17}}>💰 Incassi</h2>
        <p className="field-hint">Dati presi in tempo reale da Stripe (ultimi 15 mesi). "Fatture" qui = i pagamenti registrati da Stripe, non fatture elettroniche italiane — quelle restano da gestire separatamente se le emetti.</p>
        <div className="bento-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">💶</span><span className="bc-value" style={{fontSize:16}}>{fmtMoney(data.totals.total)}</span><span className="bc-label">Incasso totale</span></div>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">📅</span><span className="bc-value" style={{fontSize:16}}>{fmtMoney(data.totals.month)}</span><span className="bc-label">Questo mese</span></div>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">📆</span><span className="bc-value" style={{fontSize:16}}>{fmtMoney(data.totals.year)}</span><span className="bc-label">Quest'anno</span></div>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">✅</span><span className="bc-value">{data.totals.payingCount}</span><span className="bc-label">Abbonamenti paganti</span></div>
          <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">🎁</span><span className="bc-value">{data.totals.freeCount}</span><span className="bc-label">Abbonamenti gratuiti</span></div>
        </div>
      </div>

      <div className="card">
        <h2 style={{fontSize:16}}>Incasso per piano</h2>
        {Object.keys(data.byPlan).length === 0 && <p className="muted">Nessun incasso registrato ancora.</p>}
        {Object.entries(data.byPlan).sort((a,b)=>b[1]-a[1]).map(([plan, amount]) => (
          <div key={plan} className="row" style={{padding:'8px 0', borderBottom:'1px solid var(--line)'}}>
            <span className="muted">{PLAN_LABELS[plan] || plan}</span>
            <span style={{fontFamily:'Oswald', fontWeight:700}}>{fmtMoney(amount)}</span>
          </div>
        ))}
      </div>

      {data.openInvoices.length > 0 && (
        <div className="card">
          <h2 style={{fontSize:16, color:'#e3b23c'}}>⏳ Fatture da pagare ({data.openInvoices.length})</h2>
          {data.openInvoices.map(t => (
            <div key={t.id} className="list-item">
              <div className="li-text"><div className="li-title">{t.academyName}</div><div className="li-sub">{new Date(t.date).toLocaleDateString('it-IT')} · {fmtMoney(t.amount)}</div></div>
            </div>
          ))}
        </div>
      )}

      {data.failedInvoices.length > 0 && (
        <div className="card">
          <h2 style={{fontSize:16, color:'var(--danger)'}}>⚠️ Pagamenti falliti ({data.failedInvoices.length})</h2>
          {data.failedInvoices.map(t => (
            <div key={t.id} className="list-item">
              <div className="li-text"><div className="li-title">{t.academyName}</div><div className="li-sub">{new Date(t.date).toLocaleDateString('it-IT')} · {fmtMoney(t.amount)}</div></div>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h2 style={{fontSize:16}}>🎁 Abbonamenti gratuiti/manuali ({data.freeAcademies.length})</h2>
        {data.freeAcademies.length === 0 && <p className="muted">Nessuno al momento.</p>}
        {data.freeAcademies.map(a => (
          <Link key={a.id} href={`/admin/academies/${a.id}`} className="list-item" style={{textDecoration:'none', color:'inherit'}}>
            <div className="li-text"><div className="li-title">{a.academy_name}</div><div className="li-sub">{PLAN_LABELS[a.plan_tier] || a.plan_tier} · {a.manual_override_reason || '—'}</div></div>
            <span className="muted">→</span>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="row">
          <h2 style={{fontSize:16}}>📄 Tutte le fatture ({filteredTransactions.length})</h2>
        </div>
        <div className="field-row2" style={{marginTop:10}}>
          <div className="field">
            <label>Stato</label>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
              <option value="all">Tutte</option>
              <option value="paid">Pagate</option>
              <option value="open">Da pagare</option>
              <option value="uncollectible">Fallite</option>
              <option value="draft">Bozza</option>
              <option value="void">Annullate</option>
            </select>
          </div>
          <div className="field">
            <label>Cerca Academy</label>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Nome Academy..." />
          </div>
        </div>

        {filteredTransactions.length === 0 && <p className="muted" style={{marginTop:10}}>Nessuna fattura corrisponde ai filtri.</p>}
        {filteredTransactions.map(t => (
          <div key={t.id} className="list-item">
            <div className="li-text">
              <div className="li-title">{t.academyName}</div>
              <div className="li-sub">{new Date(t.date).toLocaleDateString('it-IT')} · {PLAN_LABELS[t.plan] || '—'} · {fmtMoney(t.amount)}</div>
            </div>
            <span style={{fontSize:11, color:STATUS_COLORS[t.status], border:'1px solid currentColor', borderRadius:8, padding:'2px 8px', textTransform:'uppercase', flexShrink:0}}>{STATUS_LABELS[t.status] || t.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
