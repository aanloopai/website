# Google Calendar OAuth Setup — User-side stappen (sessie-22)

**Doel**: Google Calendar API koppelen aan Aanloop website voor native booking-flow op `/demo-inplannen/`. Single-tenant: jouw eigen Google account (`doganagahm@gmail.com`).

**Code is al gedeployed** (commits volgen na deze setup). Jij hoeft alleen onderstaande stappen te doen.

**Geschatte tijd**: 15 minuten.

---

## Stap 1 — Google Cloud Console: Project + API + OAuth (10 min)

### 1.1 Project aanmaken

1. Ga naar https://console.cloud.google.com
2. Klik op project-dropdown bovenaan → **"New Project"**
3. Naam: `Aanloop AI`
4. Organization: `Geen organisatie` (of jouw Workspace org als je die hebt)
5. **Create**

### 1.2 Google Calendar API inschakelen

1. Met project geselecteerd → links menu → **"APIs & Services"** → **"Library"**
2. Zoek: `Google Calendar API`
3. Klik → **"Enable"**

### 1.3 OAuth Consent Screen configureren

1. Links → **"APIs & Services"** → **"OAuth consent screen"**
2. User Type: **"External"** → **Create**
3. App information:
   - App name: `Aanloop AI Booking`
   - User support email: `doganagahm@gmail.com`
   - App logo: (optioneel — `public/logo-mark-light-1024.png` upload)
   - App domain: `aanloopai.nl`
   - Application home page: `https://aanloopai.nl`
   - Privacy policy: `https://aanloopai.nl/privacy/`
   - Terms of service: `https://aanloopai.nl/voorwaarden/`
   - Authorized domains: `aanloopai.nl`
   - Developer contact: `doganagahm@gmail.com`
4. **Save and continue**
5. Scopes-pagina → **"Add or remove scopes"** → toevoegen:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/calendar.freebusy`
6. **Save and continue**
7. Test users → **"Add users"** → `doganagahm@gmail.com`
8. **Save and continue** → **Back to dashboard**

> **Belangrijk**: app blijft in **"Testing"** status. Dat is OK voor single-user (jouw eigen agenda). Je hoeft **GEEN** Google verification door te lopen (dat is alleen nodig als externe users dit moeten gebruiken — wij doen single-tenant).

### 1.4 OAuth Client ID aanmaken

1. Links → **"APIs & Services"** → **"Credentials"**
2. **"+ Create credentials"** → **"OAuth client ID"**
3. Application type: **Web application**
4. Name: `Aanloop AI Booking Web Client`
5. **Authorized JavaScript origins** (plus toevoegen):
   - `https://aanloopai.nl`
   - `http://localhost:4321` (voor lokale dev)
6. **Authorized redirect URIs** (plus toevoegen):
   - `https://aanloopai.nl/api/google/callback`
   - `http://localhost:4321/api/google/callback`
7. **Create**
8. **KOPIEER deze 2 waardes** (komen in popup, ook later beschikbaar onder Credentials):
   - **Client ID** — bijv. `123456789-abc...apps.googleusercontent.com`
   - **Client Secret** — bijv. `GOCSPX-abc...`

---

## Stap 2 — Cloudflare KV namespace + bindings (3 min)

### 2.1 KV Namespace aanmaken

1. Login op https://dash.cloudflare.com
2. Links → **"Workers & Pages"** → **"KV"**
3. **"Create a namespace"**
4. Namespace Name: `GOOGLE_TOKENS`
5. **Add**

### 2.2 Binding toevoegen aan Pages project

1. Links → **"Workers & Pages"** → klik op `aanloopai-website` (of hoe je Pages project heet)
2. **Settings** tab → **"Functions"**
3. **"KV namespace bindings"** → **"Add binding"**
4. Variable name: `GOOGLE_TOKENS`
5. KV namespace: select de zojuist aangemaakte `GOOGLE_TOKENS`
6. **Save**

### 2.3 Environment Variables toevoegen

Nog steeds in Pages settings → **"Environment variables"** → **Production** tab → **"+ Add variable"** voor elk:

| Variable name | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | (uit stap 1.4 — bijv. `123456789-abc.apps.googleusercontent.com`) |
| `GOOGLE_CLIENT_SECRET` | (uit stap 1.4 — bijv. `GOCSPX-abc...`) — vink **"Encrypt"** aan |
| `GOOGLE_OAUTH_INIT_KEY` | random string, bijv. `openssl rand -hex 16` of typ iets als `aanloop-init-secret-xy7z9q` — vink **"Encrypt"** aan |
| `BOOKING_CALENDAR_ID` | `primary` (of een specifiek calendar-ID als je een aparte agenda wilt) |

**`BREVO_API_KEY`** moet er al zijn vanuit sessie-19. Zo niet, voeg toe.

7. **Save**
8. **Belangrijk**: na env-var wijziging moet je **Deployment retriggern** (Settings → Deployments → "Retry deployment" of push een lege commit).

---

## Stap 3 — Eénmalig admin OAuth (2 min)

Na deployment van bovenstaande stappen, koppel je Google account één keer:

1. Open in browser:
   ```
   https://aanloopai.nl/api/google/initiate?key=<JOUW_GOOGLE_OAUTH_INIT_KEY>
   ```
   (vervang `<JOUW_GOOGLE_OAUTH_INIT_KEY>` met de waarde uit stap 2.3)

2. Je wordt geredirect naar Google consent screen
   - Login als `doganagahm@gmail.com`
   - Klik **"Continue"** als Google waarschuwt over "unverified app" (dit is normaal voor Testing-mode)
   - Bevestig scopes (calendar.events + calendar.freebusy)
   - Klik **"Continue"**

3. Je wordt geredirect naar `https://aanloopai.nl/api/google/callback?code=...&state=...`
   - Pagina toont: **"Google Calendar gekoppeld!"**
   - Refresh-token is nu opgeslagen in Cloudflare KV

4. Test booking flow:
   - Open `https://aanloopai.nl/demo-inplannen/`
   - Custom UI laadt beschikbaarheid uit jouw agenda
   - Selecteer een dag + tijd
   - Vul testgegevens in (eigen email werkt)
   - **Bevestig boeking**
   - Check je `doganagahm@gmail.com` calendar — er staat nu een test-event met Google Meet link
   - Check je Brevo dashboard — er is een bevestigings-email verzonden

---

## Troubleshooting

### "No admin tokens" error op /demo-inplannen/
→ Stap 3 niet gedaan. Bezoek `/api/google/initiate?key=...`.

### "No refresh_token returned" op callback
→ Google geeft alleen refresh_token bij eerste consent. Revoke prior consent op https://myaccount.google.com/permissions (zoek "Aanloop AI Booking") → retry stap 3.

### "Token refresh failed: 400"
→ refresh_token is gerevokeerd. Retry stap 3.

### "FreeBusy query failed: 403"
→ Calendar API niet enabled (stap 1.2) of scopes verkeerd (stap 1.3). Check Cloud Console.

### "KV namespace GOOGLE_TOKENS not bound"
→ Stap 2.2 niet gedaan of binding-naam verkeerd. Check Cloudflare Pages Settings → Functions → KV namespace bindings.

### Custom UI laadt maar slots zijn leeg
→ Jouw agenda is volgeboekt deze week, OF jouw werktijden in code (ma-do 10:00-15:00, vr 10:00-12:00) sluiten af. Pas aan in `functions/api/calendar/availability.js` regel 14-18.

---

## Architecture summary

```
Browser → /demo-inplannen/                           (Astro static page met custom JS)
            ↓ JS fetch
        GET /api/calendar/availability?dates=...     (Cloudflare Pages Function)
            ↓ Reads access_token from KV (refresh if needed)
        POST https://www.googleapis.com/calendar/v3/freeBusy
            ↓ Returns busy ranges
        Filter slots → return JSON

Browser → POST /api/calendar/book                    (Cloudflare Pages Function)
            ↓ Reads access_token from KV
        POST https://www.googleapis.com/calendar/v3/calendars/primary/events
            ↓ Creates event with Meet link, sendUpdates=all (Google sends invites)
        POST https://api.brevo.com/v3/smtp/email     (Brevo confirmation email)
            ↓
        Returns { ok, eventId, meetLink, htmlLink }
```

**Files**:
- `functions/api/_lib/google-auth.js` — token-refresh helper
- `functions/api/google/initiate.js` — OAuth start
- `functions/api/google/callback.js` — OAuth callback
- `functions/api/calendar/availability.js` — free/busy
- `functions/api/calendar/book.js` — event create + Brevo
- `src/pages/demo-inplannen.astro` — custom UI
- `scripts/setup-google-calendar-oauth.cjs` — codemod (re-runnable)

**KV layout**:
- `oauth:google:admin` → `{access_token, refresh_token, expires_at, scope, created_at}` (single tenant)
- `oauth:state:<uuid>` → `'1'` (CSRF, TTL 10 min, deleted after callback)

**Scopes minimum**:
- `calendar.events` (event-create + sendUpdates)
- `calendar.freebusy` (busy-window query)

---

## Next steps na succesvolle setup

- Test de booking-flow end-to-end (zoals stap 3.4)
- Old iframe-fallback uit sessie-19 is al verwijderd via codemod
- Sitemap update auto on next build
- Monitor `functions/api/calendar/book.js` errors via Cloudflare Pages dashboard → Functions → Logs
- Optioneel: voeg Slack-notificatie toe in `book.js` voor real-time alert wanneer iemand boekt
