export const metadata = { title: 'Termini di Servizio · InsideMatch' };

export default function TerminiPage() {
  return (
    <div className="wrap" style={{maxWidth: 760}}>
      <div className="card">
        <div style={{background:'var(--accent-dim)', border:'1px solid var(--accent)', borderRadius:10, padding:'10px 14px', marginBottom:20, fontSize:13}}>
          ⚠️ <b>Bozza da far rivedere da un legale</b> prima della pubblicazione. I campi tra parentesi quadre <code>[così]</code> vanno completati.
        </div>

        <h1 style={{fontSize:22}}>Termini di Servizio</h1>
        <p className="muted">Ultimo aggiornamento: [DATA]</p>

        <h2 style={{fontSize:16, marginTop:24}}>1. Il servizio</h2>
        <p>
          InsideMatch è una piattaforma che consente a maestri di tennis di registrare partite dei
          propri allievi durante lo svolgimento, e di ottenere statistiche, grafici e report a fine
          partita. Il servizio è fornito da [RAGIONE SOCIALE], P.IVA [NUMERO], [INDIRIZZO]
          ("InsideMatch", "noi").
        </p>

        <h2 style={{fontSize:16, marginTop:24}}>2. Chi può registrarsi</h2>
        <p>
          Il servizio è destinato a maestri/istruttori di tennis maggiorenni. Gli allievi non creano
          un proprio account: accedono in sola lettura tramite un PIN fornito dal maestro, che li
          inserisce a nome loro.
        </p>

        <h2 style={{fontSize:16, marginTop:24}}>3. Responsabilità del maestro sui dati degli allievi</h2>
        <p>
          Registrandosi, il maestro dichiara e garantisce di:
        </p>
        <ul>
          <li>avere il diritto di raccogliere e inserire in InsideMatch i dati di ciascun allievo che registra;</li>
          <li>aver ottenuto, se l'allievo è minorenne, il consenso del genitore o tutore legale al trattamento dei suoi dati tramite InsideMatch;</li>
          <li>non inserire nei campi liberi (es. "Note") dati sanitari o altre categorie particolari di dati ai sensi dell'art. 9 GDPR;</li>
          <li>essere l'unico responsabile, in qualità di titolare del trattamento, dei dati degli allievi che inserisce (vedi Informativa Privacy).</li>
        </ul>
        <p>InsideMatch si riserva il diritto di sospendere account che violano questi impegni.</p>

        <h2 style={{fontSize:16, marginTop:24}}>4. Abbonamenti e pagamenti</h2>
        <ul>
          <li>Il servizio richiede un abbonamento a pagamento, in uno dei pacchetti disponibili (differenziati per numero massimo di allievi).</li>
          <li>Gli abbonamenti si rinnovano automaticamente al termine di ogni periodo, salvo disdetta prima della scadenza.</li>
          <li>I pagamenti sono gestiti da Stripe; InsideMatch non ha accesso ai dati completi della carta di pagamento.</li>
          <li>In caso di mancato pagamento, l'accesso al servizio (per il maestro e per i suoi allievi) viene sospeso fino alla regolarizzazione.</li>
          <li>Il cambio di pacchetto (upgrade/downgrade) comporta un addebito o accredito proporzionale calcolato automaticamente da Stripe.</li>
          <li>La disdetta ha effetto dalla fine del periodo già pagato: l'accesso resta attivo fino a quella data.</li>
        </ul>

        <h2 style={{fontSize:16, marginTop:24}}>5. Diritto di recesso</h2>
        <p>
          Se il maestro si registra come consumatore (persona fisica che non agisce nell'ambito di
          un'attività professionale), ha diritto di recedere dal contratto entro 14 giorni dalla
          sottoscrizione, ai sensi del Codice del Consumo, salvo che abbia espressamente richiesto
          l'esecuzione immediata del servizio rinunciando a tale diritto. [DA VERIFICARE E DETTAGLIARE
          CON UN LEGALE IN BASE ALLA FORMA GIURIDICA EFFETTIVA DEGLI UTENTI TIPO — B2B/B2C.]
        </p>

        <h2 style={{fontSize:16, marginTop:24}}>6. Limitazioni di responsabilità</h2>
        <p>
          InsideMatch è uno strumento di supporto per l'allenamento: statistiche, punteggi e report
          dipendono dai dati inseriti manualmente dal maestro durante la partita e possono contenere
          imprecisioni. InsideMatch non fornisce consulenza medica, sportiva o professionale, e non è
          responsabile di decisioni prese sulla base dei dati registrati. Nei limiti consentiti dalla
          legge, la responsabilità di InsideMatch per eventuali danni è limitata all'importo pagato dal
          maestro negli ultimi 12 mesi.
        </p>

        <h2 style={{fontSize:16, marginTop:24}}>7. Proprietà intellettuale</h2>
        <p>
          Il software, il marchio "InsideMatch" e i contenuti della piattaforma sono di proprietà di
          [RAGIONE SOCIALE] o concessi in licenza. I dati inseriti da ciascun maestro (allievi,
          partite) restano di sua proprietà; InsideMatch li tratta solo per fornire il servizio.
        </p>

        <h2 style={{fontSize:16, marginTop:24}}>8. Sospensione e chiusura dell'account</h2>
        <p>
          InsideMatch può sospendere o chiudere un account in caso di violazione di questi termini, uso
          fraudolento, o mancato pagamento prolungato, con preavviso quando ragionevolmente possibile.
          Il maestro può chiedere la chiusura del proprio account e la cancellazione dei dati in
          qualsiasi momento, scrivendo a <a href="mailto:[EMAIL]">[EMAIL]</a>.
        </p>

        <h2 style={{fontSize:16, marginTop:24}}>9. Modifiche al servizio e ai termini</h2>
        <p>
          InsideMatch può aggiornare funzionalità, prezzi e questi termini. Le modifiche sostanziali
          verranno comunicate con ragionevole anticipo; l'uso continuato del servizio dopo la modifica
          costituisce accettazione.
        </p>

        <h2 style={{fontSize:16, marginTop:24}}>10. Legge applicabile</h2>
        <p>
          Questi termini sono regolati dalla legge italiana. Per le controversie con consumatori resta
          fermo il foro del consumatore; per gli altri casi, foro competente [CITTÀ]. [DA CONFERMARE
          CON UN LEGALE.]
        </p>

        <h2 style={{fontSize:16, marginTop:24}}>11. Contatti</h2>
        <p><a href="mailto:[EMAIL]">[EMAIL]</a></p>
      </div>
    </div>
  );
}
