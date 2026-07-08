export const metadata = { title: 'Informativa Privacy · PointLab' };

export default function PrivacyPage() {
  return (
    <div className="wrap" style={{maxWidth: 760}}>
      <div className="card">
        <div style={{background:'var(--accent-dim)', border:'1px solid var(--accent)', borderRadius:10, padding:'10px 14px', marginBottom:20, fontSize:13}}>
          ⚠️ <b>Bozza da far rivedere da un legale</b> prima della pubblicazione, in particolare per le parti su minori e dati particolari. I campi tra parentesi quadre <code>[così]</code> vanno completati con i tuoi dati reali.
        </div>

        <h1 style={{fontSize:22}}>Informativa sulla Privacy</h1>
        <p className="muted">Ultimo aggiornamento: [DATA]</p>

        <h2 style={{fontSize:16, marginTop:24}}>1. Titolare del trattamento</h2>
        <p>
          [RAGIONE SOCIALE / NOME E COGNOME], con sede in [INDIRIZZO], P.IVA/C.F. [NUMERO],
          email di contatto <a href="mailto:[EMAIL]">[EMAIL]</a> ("PointLab", "noi"), è il titolare
          del trattamento per i dati descritti al punto 3.a. Per i dati descritti al punto 3.b,
          il titolare del trattamento è il singolo maestro che li inserisce — vedi punto 2.
        </p>

        <h2 style={{fontSize:16, marginTop:24}}>2. Due ruoli distinti: attenzione, è importante</h2>
        <p>
          PointLab è una piattaforma usata da maestri di tennis per registrare partite dei propri
          allievi. Questo comporta due situazioni diverse dal punto di vista della privacy:
        </p>
        <ul>
          <li><b>Dati del maestro</b> (account, fatturazione): qui PointLab è <b>titolare del trattamento</b>.</li>
          <li>
            <b>Dati degli allievi</b> (inseriti dal maestro): qui il <b>maestro è titolare del trattamento</b>
            e PointLab agisce come <b>responsabile del trattamento</b> (fornisce lo strumento tecnico, non decide
            per quali finalità i dati dell'allievo vengono raccolti). <b>È responsabilità del maestro</b> informare
            l'allievo (o, se minorenne, il genitore/tutore) e raccogliere il consenso necessario prima di inserire
            i suoi dati in PointLab.
          </li>
        </ul>

        <h2 style={{fontSize:16, marginTop:24}}>3. Dati raccolti</h2>
        <p><b>3.a — Dati dell'account maestro</b> (titolare: PointLab):</p>
        <ul>
          <li>Email e password (gestite dal nostro fornitore di autenticazione, Supabase)</li>
          <li>Nome, cognome, telefono</li>
          <li>Nome, città e indirizzo dell'accademia/circolo</li>
          <li>Dati dell'abbonamento e di fatturazione (gestiti da Stripe — non memorizziamo i numeri di carta)</li>
        </ul>
        <p><b>3.b — Dati degli allievi</b> (titolare: il maestro che li inserisce):</p>
        <ul>
          <li>Nome, cognome, data di nascita</li>
          <li>Telefono ed email (facoltativi)</li>
          <li>Mano preferita</li>
          <li>Codice fiscale</li>
          <li>Note libere inserite dal maestro (che non dovrebbero contenere dati sanitari — vedi punto 4)</li>
          <li>Un PIN di accesso, salvato solo in forma crittografata (mai in chiaro)</li>
          <li>Dati delle partite giocate: punteggi, statistiche, e l'eventuale commento/voto del maestro</li>
        </ul>

        <h2 style={{fontSize:16, marginTop:24}}>4. Minori e dati particolari</h2>
        <p>
          Molti allievi registrati su PointLab sono minorenni. Il maestro che li inserisce dichiara,
          al momento dell'inserimento, di avere il consenso del genitore o tutore legale al trattamento
          dei loro dati. PointLab non raccoglie dati sanitari (categoria particolare di dati ai sensi
          dell'art. 9 GDPR): il campo "Note" non deve essere usato per infortuni, condizioni mediche o
          altre informazioni sulla salute, che richiederebbero una base giuridica e misure di sicurezza
          ulteriori.
        </p>

        <h2 style={{fontSize:16, marginTop:24}}>5. Finalità e base giuridica</h2>
        <ul>
          <li><b>Erogazione del servizio</b> (creare l'account, registrare le partite, mostrare i report) — esecuzione del contratto</li>
          <li><b>Fatturazione e gestione abbonamento</b> — esecuzione del contratto / obblighi di legge</li>
          <li><b>Comunicazioni di servizio</b> (conferma abbonamento, promemoria rinnovo, avviso nuova partita) — esecuzione del contratto / legittimo interesse</li>
          <li><b>Sicurezza e prevenzione abusi</b> — legittimo interesse</li>
        </ul>

        <h2 style={{fontSize:16, marginTop:24}}>6. A chi vengono comunicati i dati (sub-responsabili)</h2>
        <p>Per far funzionare PointLab, alcuni dati vengono trattati da questi fornitori, in qualità di responsabili del trattamento:</p>
        <ul>
          <li><b>Supabase</b> — database e autenticazione</li>
          <li><b>Stripe</b> — pagamenti e fatturazione (dati della carta gestiti direttamente da loro, mai da noi)</li>
          <li><b>Resend</b> — invio delle email di servizio</li>
          <li><b>Vercel</b> — hosting dell'applicazione</li>
        </ul>
        <p>
          Alcuni di questi fornitori possono trattare dati anche fuori dallo Spazio Economico Europeo
          (es. Stati Uniti), sulla base di clausole contrattuali standard o di framework di adeguatezza
          riconosciuti (es. EU-U.S. Data Privacy Framework). [VERIFICARE CON UN LEGALE LA REGIONE
          DI HOSTING SCELTA E I MECCANISMI DI TRASFERIMENTO ATTUALI DI CIASCUN FORNITORE].
        </p>

        <h2 style={{fontSize:16, marginTop:24}}>7. Conservazione dei dati</h2>
        <p>
          I dati vengono conservati per tutta la durata dell'account e, dopo la chiusura, per il tempo
          necessario ad adempiere obblighi di legge (es. fiscali) o a far valere/difendere un diritto in
          sede giudiziaria. Il maestro può eliminare i dati di un allievo o di una partita in qualsiasi
          momento dalla propria area riservata.
        </p>

        <h2 style={{fontSize:16, marginTop:24}}>8. Diritti dell'interessato</h2>
        <p>
          Chiunque abbia dati trattati tramite PointLab può richiedere l'accesso, la rettifica, la
          cancellazione, la limitazione del trattamento, la portabilità dei dati o opporsi al trattamento,
          scrivendo a <a href="mailto:[EMAIL]">[EMAIL]</a>. Se i dati riguardano un allievo, la richiesta va
          indirizzata anche al maestro (titolare per quei dati). È inoltre possibile proporre reclamo al
          Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noreferrer">garanteprivacy.it</a>).
        </p>

        <h2 style={{fontSize:16, marginTop:24}}>9. Sicurezza</h2>
        <p>
          Le password non sono mai salvate in chiaro; i PIN degli allievi sono salvati solo come hash
          crittografico; le connessioni al sito avvengono in HTTPS; l'accesso ai dati nel database è
          limitato per ciascun maestro ai soli propri allievi (Row Level Security).
        </p>

        <h2 style={{fontSize:16, marginTop:24}}>10. Modifiche</h2>
        <p>Questa informativa può essere aggiornata; la data in cima alla pagina indica l'ultima revisione.</p>

        <h2 style={{fontSize:16, marginTop:24}}>11. Contatti</h2>
        <p>Per qualsiasi domanda su questa informativa: <a href="mailto:[EMAIL]">[EMAIL]</a></p>
      </div>
    </div>
  );
}
