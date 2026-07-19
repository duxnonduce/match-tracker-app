'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Chart, registerables } from 'chart.js';
import { supabase } from '../../../lib/supabaseClient';
import { aggregateMatches } from '../../../lib/matchEngine';

Chart.register(...registerables);

const SURFACE_LABELS = { terra: 'Terra rossa', cemento: 'Cemento', erba: 'Erba', indoor: 'Indoor', altro: 'Altro' };

function ChartCanvas({ id, height = 220 }) {
  return <div style={{ position: 'relative', height, width: '100%', overflow: 'hidden' }}><canvas id={id}></canvas></div>;
}

export default function StatistichePage() {
  const router = useRouter();
  const [academyId, setAcademyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [athletes, setAthletes] = useState([]);
  const [staffList, setStaffList] = useState([]);

  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', surface: '', torneo: '', athleteId: '', staffId: '', category: '' });
  const [querying, setQuerying] = useState(false);
  const [result, setResult] = useState(null);
  const [matchCount, setMatchCount] = useState(0);
  const [error, setError] = useState('');

  const chartsRef = useRef([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      if (!localStorage.getItem('staff_token')) { router.push('/pin'); return; }
      setAcademyId(session.user.id);

      const [{ data: athletesData }, { data: staffData }] = await Promise.all([
        supabase.from('athletes').select('id, full_name, category').eq('academy_id', session.user.id).order('full_name'),
        supabase.from('staff').select('id, full_name').eq('academy_id', session.user.id).eq('active', true).order('full_name'),
      ]);
      setAthletes(athletesData || []);
      setStaffList(staffData || []);
      setLoading(false);
    })();
  }, []);

  const categories = [...new Set(athletes.map(a => a.category).filter(Boolean))];

  function destroyCharts() {
    chartsRef.current.forEach(c => c.destroy());
    chartsRef.current = [];
  }

  async function handleQuery() {
    setQuerying(true);
    setError('');
    destroyCharts();
    try {
      let query = supabase
        .from('matches')
        .select('id, meta, stats, log, match, coach_rating, athlete_id, staff_id, athletes(category)')
        .eq('academy_id', academyId);

      if (filters.dateFrom) query = query.gte('meta->>data', filters.dateFrom);
      if (filters.dateTo) query = query.lte('meta->>data', filters.dateTo);
      if (filters.surface) query = query.eq('meta->>superficie', filters.surface);
      if (filters.torneo.trim()) query = query.ilike('meta->>torneo', `%${filters.torneo.trim()}%`);
      if (filters.athleteId) query = query.eq('athlete_id', filters.athleteId);
      if (filters.staffId) query = query.eq('staff_id', filters.staffId);

      const { data, error: err } = await query;
      if (err) throw err;

      let records = data || [];
      if (filters.category) records = records.filter(r => r.athletes?.category === filters.category);

      setMatchCount(records.length);
      if (records.length === 0) {
        setResult(null);
        setQuerying(false);
        return;
      }

      const agg = aggregateMatches(records);
      setResult(agg);
      setQuerying(false);

      // I grafici vanno disegnati DOPO che React ha messo i canvas nel DOM
      setTimeout(() => renderCharts(agg), 0);
    } catch (err) {
      setError(err.message);
      setQuerying(false);
    }
  }

  function renderCharts(agg) {
    const shotCtx = document.getElementById('c-shots');
    if (shotCtx) {
      chartsRef.current.push(new Chart(shotCtx, {
        type: 'bar',
        data: {
          labels: agg.shotBreakdown.map(r => r.label),
          datasets: [
            { label: 'Winner', data: agg.shotBreakdown.map(r => r.winner), backgroundColor: '#d7ff4e' },
            { label: 'Err. forzati', data: agg.shotBreakdown.map(r => r.errori_forzati), backgroundColor: '#e08a6b' },
            { label: 'Err. non forzati', data: agg.shotBreakdown.map(r => r.errori_non_forzati), backgroundColor: '#e05b5b' },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: false }, y: { beginAtZero: true } } },
      }));
    }

    const trendCtx = document.getElementById('c-trend');
    if (trendCtx && agg.ratingTrend.length >= 2) {
      chartsRef.current.push(new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: agg.ratingTrend.map(r => r.date),
          datasets: [{ label: 'Voto', data: agg.ratingTrend.map(r => r.rating), borderColor: '#d7ff4e', backgroundColor: 'rgba(215,255,78,0.15)', fill: true, tension: 0.3 }],
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 1, max: 10 } } },
      }));
    }

    if (agg.zoneErrori) {
      const zoneCtx = document.getElementById('c-zones');
      if (zoneCtx) {
        const labels = Object.keys(agg.zoneErrori.conteggio).map(k => SURFACE_LABELS[k] || k);
        chartsRef.current.push(new Chart(zoneCtx, {
          type: 'doughnut',
          data: { labels, datasets: [{ data: Object.values(agg.zoneErrori.conteggio), backgroundColor: ['#e05b5b', '#e08a6b', '#59a6ff', '#d7ff4e'] }] },
          options: { responsive: true, maintainAspectRatio: false },
        }));
      }
    }
  }

  if (loading) return <div className="wrap"><p className="muted" style={{marginTop:60, textAlign:'center'}}>Caricamento…</p></div>;

  return (
    <div className="wrap">
      <Link href="/dashboard" className="muted">← Torna alla dashboard</Link>

      <div className="card" style={{marginTop:14}}>
        <div className="section-title-row">
          <div className="icon-badge blue">📊</div>
          <h2>Analisi avanzate</h2>
        </div>
        <p className="muted">Filtra le partite registrate dall'Academy per periodo, superficie, torneo, atleta, maestro o categoria — i grafici si aggiornano in base a cosa selezioni. Al momento copre le partite; gli allenamenti restano nella scheda del singolo atleta.</p>

        <div className="field-row2">
          <div className="field"><label>Dal</label><input type="date" value={filters.dateFrom} onChange={e=>setFilters(f=>({...f, dateFrom:e.target.value}))} /></div>
          <div className="field"><label>Al</label><input type="date" value={filters.dateTo} onChange={e=>setFilters(f=>({...f, dateTo:e.target.value}))} /></div>
        </div>
        <div className="field-row2">
          <div className="field">
            <label>Superficie</label>
            <select value={filters.surface} onChange={e=>setFilters(f=>({...f, surface:e.target.value}))}>
              <option value="">Tutte</option>
              {Object.entries(SURFACE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field"><label>Torneo / Contesto</label><input value={filters.torneo} onChange={e=>setFilters(f=>({...f, torneo:e.target.value}))} placeholder="Cerca..." /></div>
        </div>
        <div className="field-row2">
          <div className="field">
            <label>Atleta</label>
            <select value={filters.athleteId} onChange={e=>setFilters(f=>({...f, athleteId:e.target.value}))}>
              <option value="">Tutti</option>
              {athletes.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Maestro</label>
            <select value={filters.staffId} onChange={e=>setFilters(f=>({...f, staffId:e.target.value}))}>
              <option value="">Tutti</option>
              {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
        </div>
        {categories.length > 0 && (
          <div className="field">
            <label>Categoria atleta</label>
            <select value={filters.category} onChange={e=>setFilters(f=>({...f, category:e.target.value}))}>
              <option value="">Tutte</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}

        <button className="btn block" onClick={handleQuery} disabled={querying}>{querying ? 'Ricerca…' : '🔍 Applica filtri'}</button>
        {error && <p className="error" style={{marginTop:8}}>{error}</p>}
      </div>

      {result === null && matchCount === 0 && !querying && (
        <div className="card"><p className="muted">Imposta i filtri e premi "Applica filtri" per vedere i risultati. Se hai già cercato, nessuna partita corrisponde ai criteri scelti.</p></div>
      )}

      {result && (
        <>
          <div className="card">
            <h2 style={{fontSize:16}}>Riepilogo — {matchCount} partit{matchCount===1?'a':'e'}</h2>
            <div className="bento-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
              <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">🏆</span><span className="bc-value" style={{color:'var(--ok)'}}>{result.wins}</span><span className="bc-label">Vittorie</span></div>
              <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">❌</span><span className="bc-value" style={{color:'var(--danger)'}}>{result.losses}</span><span className="bc-label">Sconfitte</span></div>
              <div className="bento-cell" style={{cursor:'default'}}><span className="bc-icon">⭐</span><span className="bc-value">{result.avgRating != null ? result.avgRating.toFixed(1) : '—'}</span><span className="bc-label">Media voto</span></div>
            </div>
          </div>

          <div className="card">
            <h2 style={{fontSize:16}}>Rendimento per colpo</h2>
            <ChartCanvas id="c-shots" height={260} />
          </div>

          {result.ratingTrend.length >= 2 && (
            <div className="card">
              <h2 style={{fontSize:16}}>Andamento voto nel periodo</h2>
              <ChartCanvas id="c-trend" />
            </div>
          )}

          {result.zoneErrori && (
            <div className="card">
              <h2 style={{fontSize:16}}>Zona degli errori</h2>
              <ChartCanvas id="c-zones" />
            </div>
          )}

          {result.serveStatsAvanzate && (
            <div className="card">
              <h2 style={{fontSize:16}}>Servizio</h2>
              <div className="stat-mini-grid">
                <div className="stat-mini"><div className="v">{result.servizio.ace}</div><div className="l">Ace totali</div></div>
                <div className="stat-mini"><div className="v">{result.servizio.doppiFalli}</div><div className="l">Doppi falli</div></div>
                <div className="stat-mini"><div className="v">{result.serveStatsAvanzate.firstInPct ?? '—'}%</div><div className="l">Prima in campo</div></div>
                <div className="stat-mini"><div className="v">{result.serveStatsAvanzate.wonOnFirstPct ?? '—'}%</div><div className="l">Punti vinti c/1ª</div></div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="card">
        <div className="section-title-row">
          <div className="icon-badge pink">⚖️</div>
          <h2>Confronta due partite</h2>
        </div>
        <p className="muted">Scegli due partite dello stesso atleta e vedi cosa è migliorato e cosa è peggiorato tra una e l'altra.</p>
        <Link href="/dashboard/statistiche/confronta" className="btn block">Apri confronto →</Link>
      </div>
    </div>
  );
}
