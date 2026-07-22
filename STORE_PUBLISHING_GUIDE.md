# InsideMatch — Guida alla pubblicazione sugli store

Questa guida presume che tu non abbia Android Studio, Xcode, né altri strumenti
di programmazione — usiamo solo strumenti online. Segui i passaggi in ordine.

---

## PARTE 1 — Android (Google Play) — si comincia da qui

### Passo 1: account sviluppatore Google Play
- Vai su https://play.google.com/console/signup
- Costo: **25$ una tantum** (non è un abbonamento, si paga una volta sola per sempre)
- Serve una carta di credito/debito e un documento d'identità
- L'approvazione può richiedere da poche ore a 2-3 giorni

### Passo 2: genera il pacchetto Android — con PWABuilder (nessuna installazione)
1. Vai su **https://www.pwabuilder.com**
2. Incolla l'indirizzo del tuo sito (es. `https://tuosito.vercel.app`) e premi Start
3. PWABuilder analizza il sito automaticamente — grazie al lavoro già fatto (manifest, icone, service worker) dovrebbe già dare un punteggio alto
4. Clicca su **"Package for stores"** → scegli **Android**
5. Ti chiederà alcune opzioni — lascia quelle di default, tranne:
   - **Package ID**: scrivi `com.insidematch.app` (deve corrispondere esattamente a quello che ho già scritto nel file di verifica — vedi Passo 3)
   - **Signing key**: scegli **"Generate new signing key"** e SALVA il file che ti fa scaricare (`signing.jks` o simile) in un posto sicuro — ti servirà per ogni futuro aggiornamento dell'app, se mai dovesse servire
6. Scarica il pacchetto generato (un file `.aab`)

### Passo 3: completa la verifica del dominio (un file che ho già preparato)
PWABuilder, nella stessa schermata del Passo 2, ti mostra anche una **"SHA-256 fingerprint"** (una lunga sequenza di lettere/numeri separati da `:`).

1. Copiala
2. Apri il file `public/.well-known/assetlinks.json` che trovi nel pacchetto che ti ho consegnato
3. Sostituisci la scritta `SOSTITUISCI_CON_LA_TUA_IMPRONTA_SHA256` con quella copiata
4. Rimandami quel file (o dimmi il valore) e lo sistemo io nel progetto, poi redeploy

Senza questo passaggio l'app funziona comunque, ma mostra una sottile barra con l'indirizzo del sito in alto — con il file corretto, sparisce e sembra un'app vera al 100%.

### Passo 4: carica su Google Play Console
1. Su https://play.google.com/console → **Crea app**
2. Nome: "InsideMatch" (o quello che preferisci mostrare)
3. Categoria: Sport
4. Carica il file `.aab` del Passo 2
5. Compila le sezioni obbligatorie:
   - **Descrizione breve/lunga** (te le preparo io su richiesta, quando arriviamo qui)
   - **Screenshot**: almeno 2, presi dal telefono con l'app aperta (te li faccio sapere quando siamo pronti)
   - **Icona** (già pronta, 512×512, è quella che uso già nel sito)
   - **Informativa privacy**: usa l'indirizzo della pagina `/privacy` del tuo sito
   - **Questionario sui contenuti**: risposte guidate da Google, per un'app come questa è quasi sempre tutto "No"
6. Invia in revisione — di solito 1-3 giorni

### Da lì in poi
Come ti ho spiegato: **quasi ogni modifica che facciamo insieme non richiede di ripetere questi passaggi.** Carico lo zip, tu fai redeploy, e chi ha l'app aggiornata la vede subito. Si torna a PWABuilder solo se cambi nome/icona dell'app o per manutenzioni rare richieste da Google.

---

## PARTE 2 — iPhone (App Store) — quando sei pronto

Qui serve inevitabilmente:
- Un **Mac** (anche in prestito/di un amico, non serve sia tuo)
- **Xcode** (gratis, si scarica dal Mac App Store)
- **Apple Developer Program**: 99$/anno (a differenza di Google, è un costo ricorrente)

Se vuoi partire anche con iOS, dimmelo quando hai reperito queste tre cose — ti guido passo passo anche lì, ma è giusto che tu sappia da subito che questa parte, diversamente da Android, non si può fare stando solo su un sito web: Apple richiede il passaggio da un Mac fisico.

---

## Cosa ho già preparato nel codice (fatto)

- Manifest arricchito con tutti i campi richiesti dagli store (categoria, ambito, lingua)
- Icone verificate: rispettano già le "zone di sicurezza" richieste da Android, niente verrà tagliato male
- Icona per iPhone già pronta nella dimensione giusta (180×180)
- File di verifica del dominio (`assetlinks.json`) pronto, in attesa solo della tua impronta SHA-256 dal Passo 3

## Cosa manca (da fare quando ci arriviamo insieme)

- Screenshot dell'app per la scheda dello store
- Testo descrittivo per la scheda Play Store (breve + lunga)
- La stessa cosa per l'App Store, quando/se procediamo con iOS
