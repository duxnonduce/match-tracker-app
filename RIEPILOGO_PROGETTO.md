# InsideMatch — Riepilogo completo del progetto

*Piattaforma per Academy di tennis: tracking partite, analisi, gestione staff/atleti, abbonamenti.*

---

## 1. Il modello: Academy, non più singolo maestro

L'architettura di fondo è stata rifatta da zero: l'account non appartiene più a un singolo maestro, ma all'**Academy** (la società sportiva).

- **Login a due passaggi**: email + password dell'Academy (condivise da tutto lo staff) → poi il **PIN personale** del singolo maestro, che identifica chi sta usando l'app in quel momento
- **Ruoli**: un **Super Operatore** (PIN admin, creato alla registrazione) gestisce abbonamento, staff e dati fiscali; i **maestri normali** gestiscono atleti, partite, analisi — ma non l'amministrazione
- **Archivio condiviso**: atleti, partite, storici appartengono all'Academy — qualsiasi maestro può cercare, aprire, registrare per qualsiasi atleta
- **Attribuzione**: ogni partita/allenamento/obiettivo registra chi l'ha fatto ("Registrata da: Andrea Rossi"), visibile nel report
- **Registrazione Academy**: modulo completo con dati di fatturazione (ragione sociale, P.IVA, codice fiscale, SDI, PEC, indirizzo, email amministrativa)
- **Gestione staff**: pagina dedicata (solo admin) per aggiungere maestri, cambiare PIN, promuovere/retrocedere, disattivare — con protezione contro il restare senza nessun Super Operatore

---

## 2. Tracking partite (il cuore dell'app)

- Motore di punteggio completo per **39+ formati di partita** (set singoli, doppi, match tiebreak, no-ad, ecc.)
- Registrazione colpo per colpo con terminologia italiana: 8 categorie di colpo (dritto, rovescio, volée, smash, ecc.), per ciascuna: winner / errore forzato / errore non forzato
- **Selettore zona campo**: un vero disegno SVG di campo da tennis (non caselle generiche) per indicare dove finisce ogni errore — lunga, larga sx/dx, in rete
- **Direzione del colpo** (lungolinea/diagonale) tracciata separatamente
- Servizio: ace, doppi falli, 1ª/2ª, statistiche avanzate (% prima in campo, punti vinti su 1ª/2ª, palle break salvate/convertite)
- **Statistiche live durante la partita**: pannello con rendimento per colpo aggiornato in tempo reale, non solo a fine partita
- Editor della timeline: modificare o cancellare qualsiasi punto già registrato, con ricalcolo automatico del punteggio

---

## 3. Report e analisi

- Report completo a fine partita: grafici (Chart.js) per servizio, risposta, colpi speciali, overview winner/errori
- **Mappa del campo con intensità**: la stessa immagine SVG del campo, questa volta colorata in base a dove si concentrano gli errori, con conteggi
- **Analisi tecnica generata da AI** (OpenAI): commento tattico approfondito (200-320 parole, 2-3 paragrafi) basato *esclusivamente* sui dati reali della partita — non un riassunto numerico, ma un'analisi da allenatore vero (pattern di gioco, gestione dei momenti chiave, indicazioni pratiche per l'allenamento). Generata una sola volta su richiesta del maestro (non automatica, per controllare i costi), **modificabile prima della pubblicazione**, etichettata "AI, supervisionata dal maestro"
- Report narrativo del maestro: sintesi, punti di forza, aree di miglioria, prossimo obiettivo, voto 1-10
- Pubblicazione controllata: il maestro decide quando un report diventa visibile all'atleta

---

## 4. Gestione atleti

- Scheda tecnica completa: livello, categoria, punti di forza/debolezza, mano dominante, codice fiscale (con validazione)
- Storico progressi: grafico andamento voto nel tempo (con area sfumata), colpo migliore/da migliorare aggregato su tutte le partite
- **Obiettivi strutturati**: max 3 attivi per atleta, con stato (in corso/raggiunto), gate di pubblicazione
- Accesso atleta via PIN personale (non email/password) — dashboard separata dove vede le proprie partite pubblicate, allenamenti, obiettivi
- Consenso genitori per minorenni tracciato esplicitamente
- Ricerca, disattivazione/riattivazione atleti

---

## 5. Modalità allenamento

Tracker separato dalla partita: si sceglie un tipo di colpo, si registrano gli episodi (riuscito/errore), poi lo stesso sistema di report narrativo (voto, sintesi, punti di forza/miglioria, obiettivo) usato per le partite.

---

## 6. Notifiche e comunicazioni

- **Push notification** (Web Push, VAPID): promemoria abbonamento in scadenza, bozze da pubblicare, nuovo contenuto pubblicato — per singolo membro dello staff (non per l'account condiviso)
- **Email transazionali** (Resend): conferma abbonamento, promemoria rinnovo, notifica partita/allenamento pubblicati
- 2 cron job giornalieri automatici (promemoria rinnovo, promemoria coach)

---

## 7. Abbonamenti e fatturazione (Stripe)

- 4 piani: Base (10 partite/mese), Plus (30), Pro (50), Oro (illimitato) — mensili e annuali
- Quota mensile con reset automatico al rinnovo (bug storico del conteggio "a vita" risolto)
- Cambio piano, annullamento con doppia conferma, riattivazione, portale fatture Stripe
- **Permessi reali**: solo il Super Operatore può gestire l'abbonamento — verificato lato server, non solo nascosto nell'interfaccia

---

## 8. Design

- Redesign completo più volte iterato: da interfaccia funzionale a un vero linguaggio visivo (hero con bagliore, card statistiche stile bento, menu di navigazione in basso stile app nativa) — costruito anche interpretando un mockup fornito dall'utente
- Tema scuro "campo da tennis", palette verde/lime coerente in tutta l'app

---

## 9. Pannello amministrativo della piattaforma (solo per te)

Completamente separato dalle Academy — login proprio, non raggiungibile da nessun cliente:

- **Panoramica**: Academy totali/attive/sospese/bloccate, maestri e atleti totali, abbonamenti per stato, nuove registrazioni, pagamenti falliti da controllare
- **Gestione Academy**: crea manualmente, modifica dati, sospendi/blocca/riattiva/elimina, vedi staff e atleti di ognuna, blocca singoli maestri o atleti
- **Abbonamenti manuali**: attiva gratis, assegna mesi di prova, proroga, cambia piano — senza passare da Stripe, con motivo interno (omaggio/partner/test/accordo commerciale)
- **Incassi**: dati reali presi da Stripe in tempo reale — incasso totale/mensile/annuale, per piano, abbonamenti paganti vs gratuiti, elenco fatture con filtri per stato e ricerca per Academy

---

## 10. Conformità legale

- Pagine Privacy, Termini, Cookie (bozze — da far rivedere a un legale, specialmente sui minori)
- Checkbox obbligatoria di accettazione termini alla registrazione
- Consenso genitoriale tracciato per ogni atleta minorenne
- Nessun dato sanitario raccolto nei campi note (rimosso esplicitamente "infortuni" dai placeholder)

---

## 11. Infrastruttura tecnica

- **Stack**: Next.js 14 (App Router) · Supabase (Postgres + Auth + RLS) · Stripe · Resend · OpenAI · Vercel
- PWA installabile (manifest, service worker, icone)
- 16 migrazioni database, dalla prima versione a oggi
- Codebase organizzato: motore di punteggio condiviso e testato (`matchEngine.js`), pattern di sicurezza consistente (client lazy-init per evitare errori di build, autenticazione a più livelli — Supabase Auth per l'Academy, PIN+JWT per lo staff, PIN+JWT per gli atleti, Supabase Auth separato per l'admin di piattaforma)

---

## 12. Dove siamo ora — prossimo passo in corso

Abbiamo appena iniziato la preparazione per pubblicare l'app su **Google Play Store e Apple App Store**, partendo da quella che è già una PWA funzionante:

- Verificato lo stato attuale: manifest, icone (192px, 512px, 512px maskable), service worker già a posto come base
- Da qui si procede con: irrobustimento del manifest per gli store, generazione di tutte le dimensioni di icone richieste da Android/iOS, preparazione del pacchetto Android (via PWABuilder — il percorso più adatto a un profilo non tecnico, nessun software da installare), e la guida chiara per iOS (che richiederà comunque un Mac con Xcode e un account Apple Developer, requisito di Apple stesso, non aggirabile da nessuno strumento)

---

*Documento generato il 19 luglio 2026, a partire dalla cronologia completa dello sviluppo.*
