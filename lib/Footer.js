import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{textAlign:'center', padding:'28px 16px', fontSize:12, color:'var(--muted)'}}>
      <div style={{display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap', marginBottom:6}}>
        <Link href="/privacy" style={{color:'var(--muted)'}}>Privacy</Link>
        <Link href="/termini" style={{color:'var(--muted)'}}>Termini di servizio</Link>
        <Link href="/cookie" style={{color:'var(--muted)'}}>Cookie</Link>
      </div>
      <div>© {new Date().getFullYear()} InsideMatch</div>
      <div style={{marginTop:14, display:'inline-flex', alignItems:'center', gap:8, background:'var(--surface2)', border:'1px solid var(--line)', borderRadius:20, padding:'8px 16px'}}>
        <span style={{fontSize:12, color:'var(--muted)'}}>Tecnologia by</span>
        <img src="/branding/pointlab-logo.png" alt="PointLab" style={{height:26, width:'auto', display:'block'}} />
      </div>
    </footer>
  );
}
