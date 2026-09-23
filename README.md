# Ember — Anticheat commerciale per server FiveM

Ember e' composto da 4 componenti indipendenti che comunicano tra loro via HTTP/OAuth2:

```
┌─────────────────────┐        POST /identify, /ban, /players/sync        ┌───────────────────────┐
│  fivem-resource/     │ ─────────────────────────────────────────────▶  │                        │
│  ember_anticheat     │        GET  /check/:identifier                   │      backend/          │
│  (Lua, su ogni       │ ◀─────────────────────────────────────────────  │  Node.js + Express      │
│   server FiveM)      │        (autenticazione via X-Api-Key)            │  + PostgreSQL           │
└─────────────────────┘                                                  │                        │
                                                                          │  - API server-to-server │
┌─────────────────────┐        Bearer JWT (dopo login Discord)           │  - OAuth2 Discord        │
│  dashboard/           │ ─────────────────────────────────────────────▶  │  - Storage ban + replay  │
│  Dashboard web        │ ◀─────────────────────────────────────────────  │                        │
│  (HTML/CSS/JS)        │        GET /stats, /players/online, /bans...    └───────────┬───────────┘
└─────────────────────┘                                                              │
                                                                                       │ Bot token (verifica ruolo)
┌─────────────────────┐                                                              │
│  discord-bot/         │ ◀────────────────────────────────────────────────────────────┘
│  Discord.js v14        │        (usa lo stesso GUILD_ID / ADMIN_ROLE_ID del backend
│  - ticket support       │         per verificare chi puo' accedere alla dashboard)
│  - verifica ruolo admin │
└─────────────────────┘
```

- **fivem-resource/** cattura gli identifier dei player e li invia al backend; mostra un
  menu admin in-game per bannare (con replay-logger) e riceve i ban condivisi cross-server.
- **backend/** e' l'unica fonte di verita': salva ban, identifier, replay, gestisce
  l'autenticazione dei server FiveM (API key) e degli admin (OAuth2 Discord + JWT).
- **dashboard/** e' un client statico che parla solo con il backend via fetch, usando il
  JWT ottenuto dal login Discord.
- **discord-bot/** gestisce i ticket di supporto e offre un comando (`/dashboard`) che
  verifica il ruolo Discord dell'admin e fornisce il link di accesso, riusando lo stesso
  OAuth2 del backend (il bot non duplica la logica di scambio del token, che resta nel
  backend per non esporre il client secret).

## Nota tecnica sul "replay" dei ban

FiveM non offre un'API nativa per registrare video. Ember implementa quindi un
**replay-logger**: negli ultimi 20 secondi prima di ogni ban, il resource registra ogni
200ms posizione, rotazione, arma e stato salute/armor del player in un buffer circolare
lato server, e lo invia al backend come sequenza di keyframe JSON insieme al ban. La
dashboard ricostruisce questi keyframe come un'animazione 2D (percorso + marker con
direzione) nella sezione "Ban". Non si tratta di un vero video, ma di dati sufficienti per
ricostruire cosa stava facendo il player prima del ban.

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env   # compila le variabili (vedi sotto)
npm install
```

Crea il database e applica lo schema:

```bash
psql "postgres://ember:ember@localhost:5432/ember" -f schema.sql
```

Configura un'applicazione Discord su https://discord.com/developers/applications:
- **OAuth2 → Redirects**: aggiungi `http://localhost:3000/auth/discord/callback`
  (o l'URL pubblico del backend in produzione)
- Copia **Client ID** e **Client Secret** in `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`
- Crea un **Bot**, copia il token in `DISCORD_BOT_TOKEN`, invitalo nel server con permesso
  "View Server Members"
- Copia l'ID del server in `DISCORD_GUILD_ID` e l'ID del ruolo admin in
  `DISCORD_ADMIN_ROLE_ID`

Avvia il backend:

```bash
npm start
```

Crea il primo server FiveM collegato alla rete (genera l'API key da usare nel resource):

```bash
node src/scripts/createServer.js "Nome del mio server"
```

L'API key viene mostrata **una sola volta**: copiala subito in `fivem-resource/ember_anticheat/config.lua`.

### 2. Resource FiveM

1. Copia la cartella `fivem-resource/ember_anticheat/` nella cartella `resources/` del tuo
   server FiveM.
2. Modifica `config.lua`: imposta `Config.Backend.url` (URL pubblico del backend) e
   `Config.Backend.apiKey` (la chiave generata al passo precedente).
3. Nel `server.cfg`, aggiungi:
   ```
   ensure ember_anticheat
   add_ace group.admin ember.admin allow
   add_principal identifier.<tuo_identifier> group.admin
   ```
4. In gioco, gli admin aprono il menu con `/ember`.

### 3. Dashboard

```bash
cd dashboard
```

Modifica `config.js` con l'URL pubblico del backend, poi servi i file statici con
qualunque web server (Nginx, Vercel, Netlify, o per test locali):

```bash
npm run serve
```

Assicurati che `DASHBOARD_URL` nel `.env` del backend punti all'URL pubblico della
dashboard (necessario per il redirect dopo il login Discord).

### 4. Bot Discord

```bash
cd discord-bot
cp .env.example .env   # compila le variabili
npm install
npm run deploy-commands   # registra i comandi slash sulla guild
npm start
```

Crea tre categorie Discord (una per Support, una per Buy, una per Developer) e un canale
per le trascrizioni, poi imposta i loro ID in `TICKET_CATEGORY_SUPPORT_ID`,
`TICKET_CATEGORY_BUY_ID`, `TICKET_CATEGORY_DEVELOPER_ID` e `TRANSCRIPT_CHANNEL_ID`.
Imposta `SUPPORT_ROLE_ID` con il ruolo dello staff che gestisce i ticket.

Infine, in un canale a scelta del server, lancia una volta il comando `/panel`: invia un
messaggio fisso con un menu a tendina (in inglese: Support / Buy / Developer) da cui gli
utenti aprono i ticket. Il messaggio resta li' permanentemente, non va ricreato ad ogni
riavvio del bot.

## Comandi Discord

| Comando | Descrizione |
|---|---|
| `/panel` | (staff) Invia nel canale corrente il pannello fisso con il menu a tendina per aprire i ticket (Support / Buy / Developer, categorie separate) |
| `/assegna <membro>` | Assegna il ticket corrente a un membro dello staff |
| `/trascrivi` | Genera e invia il trascritto del ticket corrente |
| `/chiudi` | Chiude il ticket (trascritto + eliminazione canale) |
| `/dashboard` | Verifica il ruolo admin e fornisce il link di accesso alla dashboard |

## Hosting gratuito (backend + dashboard)

Backend e dashboard possono essere ospitati gratis su Render.com (nessuna carta
richiesta), con un database Postgres gratuito e persistente su Neon.tech. Il bot
Discord resta escluso da questa guida: deve restare connesso 24/7 e i piani free di
Render/Render-like non tengono vivo un processo che non riceve traffico HTTP, quindi
va eseguito su una macchina sempre accesa (un PC che lasci acceso, o un piccolo VPS).

Non essendo autorizzato a creare account per conto tuo, questi passaggi restano
manuali (sono comunque pochi click):

1. **Database — [neon.tech](https://neon.tech)**: crea un account (login con GitHub),
   crea un progetto, apri l'SQL editor e incolla il contenuto di `backend/schema.sql`
   per creare le tabelle. Copia la connection string (`postgres://...`).
2. **Metti il progetto su GitHub**: crea un repository vuoto su
   [github.com/new](https://github.com/new), poi da questa cartella:
   ```bash
   git remote add origin https://github.com/<tuo-utente>/<tuo-repo>.git
   git branch -M main
   git push -u origin main
   ```
3. **Render — [render.com](https://render.com)**: crea un account (login con GitHub),
   poi **New → Blueprint**, collega il repository appena creato. Render legge
   `render.yaml` nella root e crea automaticamente due servizi free:
   `ember-backend` (Node) e `ember-dashboard` (sito statico).
4. Su `ember-backend`, apri **Environment** e compila le variabili lasciate vuote nel
   blueprint: `DATABASE_URL` (quella di Neon), `DISCORD_CLIENT_ID`,
   `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`,
   `DISCORD_ADMIN_ROLE_ID`, `DISCORD_REDIRECT_URI` (`https://ember-backend.onrender.com/auth/discord/callback`)
   e `DASHBOARD_URL` (l'URL che Render assegna a `ember-dashboard`, tipo
   `https://ember-dashboard.onrender.com`).
5. Su [discord.com/developers/applications](https://discord.com/developers/applications),
   nella tua app → OAuth2 → Redirects, aggiungi lo stesso
   `https://ember-backend.onrender.com/auth/discord/callback`.
6. Se il nome `ember-backend` risultasse gia' usato da un altro utente Render, il
   servizio prendera' un nome leggermente diverso: aggiorna di conseguenza
   `dashboard/config.js` (`BACKEND_URL`) e rifai il deploy del sito statico (basta un
   nuovo `git push`).

**Limiti del piano gratuito**: il backend "dorme" dopo ~15 minuti di inattivita' e la
prima richiesta successiva impiega qualche decina di secondi per svegliarlo; per una
dashboard admin a basso traffico è un compromesso accettabile per restare a costo zero.

Il "dominio Ember" in questo scenario e' gratuito ma non personalizzato
(`ember-dashboard.onrender.com`), perche' un dominio proprio come `ember.ch` è sempre
un acquisto a pagamento (circa 15-20 CHF/anno su un registrar come Infomaniak o
Switchplus) che devi effettuare tu stesso; una volta comprato, puoi collegarlo al sito
Render da **Settings → Custom Domains** del servizio `ember-dashboard`.

## Sicurezza in produzione

- Genera un `JWT_SECRET` lungo e casuale, non usare quello di esempio.
- Servi backend e dashboard via HTTPS.
- Non committare mai i file `.env`: sono gia' esclusi da `.gitignore`.
- Ruota le API key dei server FiveM periodicamente creandone di nuove via
  `POST /servers` (endpoint admin) o lo script `createServer.js`.
