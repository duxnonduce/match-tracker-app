# InsideMatch — checklist burocratica e legale

Questa è la parte che nessun codice può fare al posto tuo. Te la riassumo in ordine pratico.
**Non è consulenza legale/fiscale** — è una mappa di cosa verificare, con chi.

---

## 1. Prima di tutto: forma giuridica e fisco

Per emettere fatture e incassare abbonamenti in modo legale in Italia, ti serve quasi certamente
una **Partita IVA** (a meno che tu non stia già operando tramite una società esistente). Le opzioni
tipiche per un progetto come questo:

- **Regime forfettario** (se sei sotto la soglia di ricavi, oggi 85.000€/anno) — tassazione
  semplificata, aliquota agevolata, adatto per iniziare da solo/a.
- **Ditta individuale in regime ordinario** o **SRL** — se prevedi volumi più alti, soci, o vuoi
  limitare la responsabilità personale (la SRL protegge il tuo patrimonio personale in caso di
  problemi legali/debiti del progetto).

**Parla con un commercialista** per la scelta giusta per la tua situazione — cambia le tasse che
paghi e la responsabilità legale che ti assumi. Chiedigli anche di:
- registrarti per la fatturazione elettronica (obbligatoria in Italia)
- capire se serve un codice ATECO specifico per "servizi software/SaaS"
- valutare se conviene fatturare in regime IVA standard o forfettario visto anche che Stripe/Resend/Vercel sono servizi esteri (reverse charge)

## 2. Prima di aprire al pubblico: revisione legale

Le tre bozze che ho scritto (`Privacy Policy`, `Termini di Servizio`, `Cookie Policy` — già online
su `/privacy`, `/termini`, `/cookie`) vanno **fatte leggere e correggere da un avvocato**, in
particolare per:

- **La parte sui minori**: il maestro raccoglie dati (nome, data di nascita, codice fiscale) di
  ragazzi che spesso sono minorenni. La normativa italiana ed europea ha regole specifiche sul
  consenso dei genitori che un legale deve confermare per il tuo caso concreto — io ho messo una
  dichiarazione del maestro ("confermo di avere il consenso"), ma un avvocato potrebbe consigliarti
  un meccanismo più solido (es. raccogliere direttamente il consenso firmato dal genitore fuori
  dall'app, e farlo caricare/archiviare).
- **Il diritto di recesso** sugli abbonamenti (14 giorni, B2C vs B2B) — l'ho segnalato come "da
  verificare" nella bozza perché dipende da come si registrano davvero i tuoi utenti.
- **Foro competente e legge applicabile**.

## 3. Registro dei trattamenti (GDPR)

Se tratti dati di minori e li strutturi in modo sistematico (che è esattamente il caso di
InsideMatch), è buona pratica — e in alcuni casi obbligatorio — tenere un **Registro delle attività
di trattamento** (art. 30 GDPR): un documento interno (non pubblico) che elenca quali dati tratti,
per quale scopo, dove sono conservati, per quanto tempo. Un consulente privacy/legale può aiutarti
a compilarlo in un paio d'ore.

Valuta anche se ti serve nominare un **DPO (Responsabile della Protezione dei Dati)** — di norma
non obbligatorio per una piccola startup, ma dipende dalla scala a cui arrivi; fattelo confermare
da un legale quando il numero di maestri/allievi cresce.

## 4. Contratti con i fornitori (sub-responsabili)

Supabase, Stripe, Resend e Vercel trattano dati per tuo conto. Verifica che tutti e quattro abbiano
un **DPA (Data Processing Agreement)** disponibile — di solito è già incluso nei loro termini
standard, ma un legale può controllare che copra correttamente il tuo caso, specialmente per il
trasferimento dati fuori UE (Stati Uniti). Su Supabase, se non l'hai già fatto, verifica in che
**regione** hai creato il progetto (Project Settings → General → Region) — se possibile, tienila in
UE per semplificare la conformità.

## 5. Cose pratiche da sistemare subito nel sito

- [ ] Nei file `app/privacy/page.js`, `app/termini/page.js`, `app/cookie/page.js`: sostituisci tutti
      i placeholder tra parentesi quadre (`[RAGIONE SOCIALE]`, `[EMAIL]`, `[P.IVA]`, `[INDIRIZZO]`,
      `[DATA]`) con i tuoi dati reali, una volta che hai la Partita IVA.
- [ ] Esegui `migration-5.sql` su Supabase (nuove colonne per tracciare i consensi).
- [ ] Verifica che l'email di contatto che metti nei documenti sia una che controlli davvero
      (per richieste di cancellazione dati, reclami, ecc. — hai un obbligo di risposta).

## 6. Assicurazione (facoltativo ma da considerare)

Se il progetto cresce e gestisci dati sensibili di minori e pagamenti, molti freelance/piccole
aziende italiane stipulano una **polizza di responsabilità civile professionale** che copre anche
rischi legati a data breach. Chiedi un preventivo quando il progetto ha utenti paganti reali.

---

## Riepilogo: cosa ho già fatto io nel codice

- Pagine `/privacy`, `/termini`, `/cookie` con bozze specifiche per come funziona davvero InsideMatch
- Checkbox obbligatoria di accettazione Termini+Privacy alla registrazione del maestro (con data/ora salvata)
- Checkbox obbligatoria di conferma consenso genitoriale all'inserimento di ogni allievo (con data/ora salvata, controllata anche lato server — non solo nel browser)
- Rimosso dal form allievo il suggerimento a inserire dati sanitari ("infortuni") nelle note libere, con un avviso esplicito
- Rinominata l'app in "InsideMatch" ovunque nel codice

## Cosa resta da fare (solo tu/un professionista)

- [ ] Aprire Partita IVA (commercialista)
- [ ] Far rivedere le 3 bozze legali da un avvocato
- [ ] Compilare il Registro dei trattamenti
- [ ] Verificare i DPA dei fornitori e la regione Supabase
- [ ] Sostituire i placeholder nei documenti con i dati reali
- [ ] (Facoltativo) valutare un'assicurazione professionale
