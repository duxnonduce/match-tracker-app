export const metadata = { title: 'Cookie Policy · PointLab' };

export default function CookiePage() {
  return (
    <div className="wrap" style={{maxWidth: 760}}>
      <div className="card">
        <div style={{background:'var(--accent-dim)', border:'1px solid var(--accent)', borderRadius:10, padding:'10px 14px', marginBottom:20, fontSize:13}}>
          ⚠️ <b>Bozza da far rivedere da un legale</b> — e da aggiornare se in futuro aggiungi strumenti di analytics/marketing (Google Analytics, pixel pubblicitari, ecc.), che oggi PointLab non usa.
        </div>

        <h1 style={{fontSize:22}}>Cookie Policy</h1>
        <p className="muted">Ultimo aggiornamento: [DATA]</p>

        <h2 style={{fontSize:16, marginTop:24}}>Cosa usiamo davvero</h2>
        <p>
          PointLab, ad oggi, <b>non utilizza cookie di profilazione, tracciamento o marketing</b>. Usa
          solo strumenti tecnici necessari al funzionamento del servizio:
        </p>
        <ul>
          <li>
            <b>Sessione di accesso (maestro)</b> — gestita dal nostro fornitore di autenticazione
            (Supabase), necessaria per rimanere collegato dopo il login. Senza questo, non potresti
            accedere alla dashboard.
          </li>
          <li>
            <b>Sessione di accesso (allievo)</b> — un token salvato nella memoria locale del browser
            dopo l'accesso con PIN, con la stessa funzione tecnica necessaria.
          </li>
        </ul>
        <p>
          Questi elementi rientrano nella categoria dei cookie/strumenti "tecnici" o "strettamente
          necessari", che secondo la normativa vigente (ePrivacy/GDPR) non richiedono un banner di
          consenso preventivo, ma solo un'informativa come questa. [DA CONFERMARE CON UN LEGALE CHE
          NON SIANO STATI INTRODOTTI ALTRI STRUMENTI NEL FRATTEMPO — es. se in futuro aggiungete
          Google Analytics, Meta Pixel, o strumenti simili, questa pagina E il sito vanno aggiornati
          con un vero banner di consenso.]
        </p>

        <h2 style={{fontSize:16, marginTop:24}}>Fornitori terzi coinvolti nel funzionamento del sito</h2>
        <p>
          Il sito carica risorse da: Google Fonts (caratteri tipografici) e dal CDN di Chart.js
          (se non già incluso nel pacchetto). Questi servizi potrebbero tecnicamente ricevere
          l'indirizzo IP del visitatore per servire il file richiesto, ma non sono usati da PointLab
          per profilazione.
        </p>

        <h2 style={{fontSize:16, marginTop:24}}>Come gestire i cookie dal browser</h2>
        <p>
          Puoi cancellare o bloccare i cookie/storage locale dalle impostazioni del tuo browser in
          qualsiasi momento — tieni presente che bloccando quelli tecnici non potrai restare
          collegato a PointLab.
        </p>

        <h2 style={{fontSize:16, marginTop:24}}>Contatti</h2>
        <p><a href="mailto:[EMAIL]">[EMAIL]</a></p>
      </div>
    </div>
  );
}
