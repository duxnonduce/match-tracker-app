import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{textAlign:'center', padding:'28px 16px', fontSize:12, color:'var(--muted)'}}>
      <div style={{display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', marginBottom:6}}>
        <Link href="/privacy" style={{color:'var(--muted)'}}>Privacy</Link>
        <Link href="/termini" style={{color:'var(--muted)'}}>Termini di servizio</Link>
        <Link href="/cookie" style={{color:'var(--muted)'}}>Cookie</Link>
      </div>
      <div>© {new Date().getFullYear()} PointLab</div>
    </footer>
  );
}
