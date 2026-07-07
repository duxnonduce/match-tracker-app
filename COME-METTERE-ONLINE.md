# Come mettere online la tua app — nessun codic da scrivere

Tutto il "lavoro tecnico" è già fatto: ogni pagina, ogni pulsante, ogni funzione è già scritta dentro la cartella `webapp` che ti ho dato. Tu devi solo: creare 4 account gratuiti, copiare-incollare qualche codice che quei siti ti mostrano, e premere "Deploy". Ci vogliono circa 30-40 minuti la prima volta.

Segui i passi **in ordine esatto**, senza saltarne nessuno.

---

## PASSO 1 — Crea i 4 account (tutti gratuiti per iniziare)

Apri questi 4 siti in 4 schede diverse e registrati (basta email/password):

1. **github.com** → questo è dove "carichi" i file della tua app
2. **supabase.com** → questo è il database (dove vengono salvati allievi e partite)
3. **stripe.com** → questo gestisce i pagamenti degli abbonamenti
4. **vercel.com** → questo è dove l'app diventa un sito vero, raggiungibile da internet
   - Quando ti chiede come registrarti, scegli **"Continue with GitHub"**: così i due account restano collegati e più avanti sarà tutto più semplice.

---

## PASSO 2 — Carica i file su GitHub

1. Su github.com, in alto a destra clicca il **+** → **New repository**.
2. Dai un nome, es. `match-tracker-app` → **Create repository**.
3. Nella pagina che si apre, clicca **"uploading an existing file"**.
4. Sul tuo computer, **estrai (decomprimi)** lo ZIP `webapp.zip` che ti ho dato.
5. Apri la cartella estratta, seleziona **tutto il contenuto** (tutti i file e le cartelle dentro, non la cartella stessa) e **trascinalo** nella pagina di GitHub.
6. In basso, clicca **"Commit changes"**. Fatto: i file sono online su GitHub.

---

## PASSO 3 — Crea il database su Supabase

1. Su supabase.com, clicca **New Project**. Scegli una password per il database e **salvala da qualche parte** (non ti servirà a mano, ma tienila).
2. Aspetta 1-2 minuti che il progetto si crei.
3. Nel menu a sinistra, clicca **SQL Editor** → **New query**.
4. Apri il file `schema.sql` che ti ho dato, **seleziona tutto il testo, copialo**, e **incollalo** nella casella al centro dello schermo su Supabase.
5. Clicca il pulsante verde **RUN** in basso a destra. Deve apparire "Success" — se scrive un errore, fermati e mandami il messaggio esatto.
6. Nel menu a sinistra, vai su **Project Settings** (l'icona ingranaggio) → **API**.
7. Tieni questa pagina aperta in una scheda, ti servirà tra poco: qui vedi `Project URL`, `anon public` key, e `service_role` key (per vederla devi cliccare "Reveal").

---

## PASSO 4 — Crea i pacchetti su Stripe

1. Su stripe.com (resta pure in modalità **"Test mode"**, l'interruttore in alto a destra — così puoi provare tutto senza soldi veri), vai su **Product catalog** → **Add product**.
2. Crea 3 prodotti, uno per volta, tutti con **Pricing model: Recurring** (abbonamento):
   - Nome: `Pacchetto 20 allievi` — Prezzo: quello che vuoi tu
   - Nome: `Pacchetto 50 allievi`
   - Nome: `Pacchetto 100 allievi`
3. Per ognuno, dopo averlo salvato, clicca sul prodotto e **copia il "Price ID"** (una scritta tipo `price_1AbCdEfG...`). Incollali per ora in un file di testo insieme al nome del pacchetto — ti servono al Passo 6.
4. Vai su **Developers** (in alto) → **API keys** → copia la **Secret key** (inizia con `sk_test_...`) e mettila anche lei nel tuo file di testo.

---

## PASSO 5 — Collega GitHub a Vercel e fai il primo "Deploy"

1. Su vercel.com, clicca **Add New...** → **Project**.
2. Seleziona il repository `match-tracker-app` che hai creato al Passo 2 → **Import**.
3. **NON premere ancora "Deploy"** — prima clicca **"Environment Variables"** per aprire la sezione (vedi Passo 6).

---

## PASSO 6 — Incolla tutte le "chiavi segrete"

Ancora nella stessa pagina di Vercel (sezione Environment Variables), aggiungi una per una queste voci — a sinistra il nome esatto (copialo così com'è), a destra il valore che hai raccolto ai passi precedenti:

| Nome (da scrivere identico) | Da dove prendi il valore |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → "Project URL" |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → "anon public" |
| `SUPABASE_URL` | uguale a `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → "service_role" (clicca "Reveal") |
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → "Secret key" |
| `STRIPE_PRICE_BASIC20` | Stripe → il Price ID del pacchetto 20 allievi |
| `STRIPE_PRICE_PLUS50` | Stripe → il Price ID del pacchetto 50 allievi |
| `STRIPE_PRICE_PRO100` | Stripe → il Price ID del pacchetto 100 allievi |
| `ATHLETE_JWT_SECRET` | Inventala tu: scrivi una riga a caso di 40 caratteri, es. `xk29Fjs82Ls9wPqz71VmTgY4Bn6Rt3Cd8Ha0Ue5` |
| `STRIPE_WEBHOOK_SECRET` | Per ora scrivi `temp` — lo sistemiamo al Passo 8 |
| `APP_URL` | Per ora scrivi `https://placeholder.vercel.app` — lo sistemiamo al Passo 7 |

Quando hai inserito tutte le righe, clicca **Deploy**. Aspetta 1-2 minuti: Vercel costruisce il sito.

---

## PASSO 7 — Il tuo sito è online! Aggiorna l'indirizzo vero

1. Quando il deploy finisce, Vercel ti mostra l'indirizzo del tuo sito, tipo `https://match-tracker-app-xyz.vercel.app`. **Copialo.**
2. Vai su Vercel → il tuo progetto → **Settings** → **Environment Variables**.
3. Trova `APP_URL`, modificalo e incolla l'indirizzo vero copiato al punto 1.
4. Vai su **Deployments** (in alto) → sui tre puntini dell'ultimo deploy → **Redeploy**, per far ripartire il sito con l'indirizzo giusto.

---

## PASSO 8 — Collega Stripe al tuo sito (ultimo pezzo)

1. Su Stripe → **Developers** → **Webhooks** → **Add endpoint**.
2. Come indirizzo scrivi: `https://il-tuo-indirizzo.vercel.app/api/billing/webhook` (usa l'indirizzo vero del Passo 7).
3. In "Select events to listen to", cerca e seleziona questi 3:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Clicca **Add endpoint**. Nella pagina che si apre, clicca **"Reveal"** accanto a "Signing secret" e copialo (inizia con `whsec_...`).
5. Torna su Vercel → Settings → Environment Variables → modifica `STRIPE_WEBHOOK_SECRET` incollando questo valore.
6. Vai su **Deployments** → **Redeploy** un'ultima volta.

---

## PASSO 9 — Prova che funzioni tutto

1. Apri il tuo sito (`https://il-tuo-indirizzo.vercel.app`).
2. Clicca **"Sono un maestro"** → **Registrati** con una tua email → controlla la posta e conferma.
3. Accedi → scegli un pacchetto → **Acquista**.
4. Nella pagina di pagamento Stripe (sei ancora in modalità test), usa questi dati finti:
   - Numero carta: `4242 4242 4242 4242`
   - Data: una qualsiasi nel futuro (es. `12/28`)
   - CVC: `123`
5. Dopo il pagamento dovresti tornare sulla dashboard con il pacchetto attivo.
6. Aggiungi un allievo di prova → segnati il PIN che appare a schermo.
7. Apri una finestra anonima del browser, vai su `.../allievo`, inserisci quel PIN → dovresti vedere la dashboard dell'allievo (vuota, perché non ha ancora partite — è normale, il tracker delle partite si collega nel passo successivo, quello che avevamo già costruito).

Se un passaggio non funziona, fermati e dimmi **esattamente a quale numero** ti sei bloccato e cosa vedi scritto a schermo — ti do la correzione mirata.

---

## Quando sei pronto per i pagamenti veri

Ripeti il Passo 4 (prodotti) e il Passo 8 (webhook) ma con Stripe in modalità **"Live"** invece di "Test" (interruttore in alto a destra su Stripe), e sostituisci `STRIPE_SECRET_KEY` e i 3 `STRIPE_PRICE_...` con quelli "live". A quel punto le carte vere iniziano a funzionare davvero.
