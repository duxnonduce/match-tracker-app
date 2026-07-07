'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../lib/supabaseClient';

export default function AthleteMatches() {
  const router = useRouter();
  const params = useParams();
  const [athlete, setAthlete] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const { data: athleteRow } = await supabase.from('athletes').select('*').eq('id', params.id).single();
      setAthlete(athleteRow);

      const { data: matchRows } = await supabase
        .from('matches')
        .select('id, meta, created_at')
        .eq('athlete_id', params.id)
        .order('created_at', { ascending: false });
      setMatches(matchRows || []);
      setLoading(false);
    })();
  }, [params.id]);

  if (loading) return <div className="wrap"><p className="muted">Caricamento…</p></div>;

  return (
    <div className="wrap">
      <Link href="/dashboard" className="muted">← Torna alla dashboard</Link>
      <div className="row" style={{marginTop:10, marginBottom:18}}>
        <h1 style={{fontSize:22}}>{athlete ? athlete.full_name : 'Allievo'}</h1>
        <Link href={`/tracker?athleteId=${params.id}`} className="btn">＋ Nuova partita</Link>
      </div>

      <div className="card">
        <h2 style={{fontSize:17}}>Partite registrate</h2>
        {matches.length === 0 && <p className="muted">Nessuna partita registrata ancora.</p>}
        {matches.map(m => (
          <Link key={m.id} href={`/dashboard/athlete/${params.id}/match/${m.id}`} className="list-item" style={{textDecoration:'none', color:'inherit'}}>
            <span>{m.meta?.torneo ? m.meta.torneo + ' · ' : ''}{m.meta?.data}</span>
            <span className="muted">{m.meta?.formatLabel} →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
