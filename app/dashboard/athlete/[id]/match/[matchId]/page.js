'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../../../../lib/supabaseClient';
import ReportViewer from '../../../../../../lib/ReportViewer';

export default function CoachMatchDetail() {
  const router = useRouter();
  const params = useParams();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const { data, error: err } = await supabase
        .from('matches')
        .select('meta, stats, log, match')
        .eq('id', params.matchId)
        .single();

      if (err || !data) {
        setError('Partita non trovata (o non appartiene ai tuoi allievi).');
        return;
      }
      setRecord(data);
    })();
  }, [params.matchId]);

  if (error) {
    return (
      <div className="wrap">
        <p className="error">{error}</p>
        <Link href={`/dashboard/athlete/${params.id}`} className="btn secondary">← Torna alla scheda allievo</Link>
      </div>
    );
  }

  return <ReportViewer record={record} />;
}
