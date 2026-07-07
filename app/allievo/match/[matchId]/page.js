'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ReportViewer from '../../../../lib/ReportViewer';

export default function AthleteMatchDetail() {
  const router = useRouter();
  const params = useParams();
  const [record, setRecord] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const token = localStorage.getItem('athlete_token');
      if (!token) { router.push('/allievo'); return; }

      const res = await fetch(`/api/athlete/matches/${params.matchId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        localStorage.removeItem('athlete_token');
        router.push('/allievo');
        return;
      }
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Errore'); return; }
      setRecord(data.match);
    })();
  }, [params.matchId]);

  if (error) {
    return (
      <div className="wrap">
        <p className="error">{error}</p>
        <Link href="/allievo/dashboard" className="btn secondary">← Torna alla dashboard</Link>
      </div>
    );
  }

  return <ReportViewer record={record} />;
}
