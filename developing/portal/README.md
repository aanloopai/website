# Customer Portal — Setup & Operations

Passwordless customer portal for aanloopai.nl. Klanten loggen in met een
magic link (geen wachtwoord) en zien hun diensten + documenten.

Status na sprint C: **code compleet**, wacht op infra-configuratie hieronder.
Tot de D1-database is geconfigureerd geven de portal-routes HTTP 503 terug —
de rest van de site werkt gewoon door.

## Architectuur

| Onderdeel | Bestand |
|---|---|
| D1-schema | `migrations/0001_portal_schema.sql` |
| Voorbeeld-seed | `migrations/0002_seed_example.sql` |
| Auth-helpers (HMAC-sessie, hashing) | `src/lib/auth.js` |
| Portal-routes (auth + dashboard-API) | `src/lib/portal-routes.js` |
| Route-dispatch | `src/worker.js` |
| Layout | `src/layouts/PortalLayout.astro` |
| Inlogpagina | `src/pages/portal/login.astro` → `/portal/login` |
| Dashboard | `src/pages/portal/index.astro` → `/portal/` |

**Auth-flow:** e-mail invoeren → worker zoekt klant in D1 → magic-link token
(15 min geldig, één keer bruikbaar, gehasht opgeslagen) → Brevo mailt de link →
klik → worker verifieert → HMAC-ondertekende sessie-cookie (7 dagen,
HttpOnly/Secure/SameSite=Lax) → dashboard.

## Eenmalige setup (user-actions)

### 1. D1-database aanmaken
```
cd <aanloop repo>
wrangler d1 create aanloop-portal
```
Kopieer de geprinte `database_id`.

### 2. wrangler.toml activeren
Haal in `wrangler.toml` het commentaar weg bij het `[[d1_databases]]`-blok
en plak de `database_id`.

### 3. Sessie-secret instellen
```
wrangler secret put PORTAL_SESSION_SECRET
```
Plak een lange random string (bijv. `openssl rand -hex 32`). Dit ondertekent
de sessie-cookies — niet wijzigen zonder alle klanten uit te loggen.

### 4. Schema toepassen
```
wrangler d1 execute aanloop-portal --remote --file=migrations/0001_portal_schema.sql
```
Optioneel testdata:
```
wrangler d1 execute aanloop-portal --remote --file=migrations/0002_seed_example.sql
```

### 5. Deployen
```
wrangler versions upload
```
Daarna de nieuwe versie promoten in het Cloudflare-dashboard.

`BREVO_API_KEY` is al geconfigureerd (gebruikt voor de magic-link mail).

## Een klant toevoegen

Geen publieke registratie — klanten worden handmatig toegevoegd:
```
wrangler d1 execute aanloop-portal --remote --command="INSERT INTO customers (id, email, naam, bedrijf, plan, created_at) VALUES ('cust_0002', 'klant@bedrijf.nl', 'Voornaam Achternaam', 'Bedrijf BV', 'emma-lite', '2026-05-22');"
```
Diensten en documenten koppelen via de `services` / `documents` tabellen met
dezelfde `customer_id` (zie `0002_seed_example.sql` als voorbeeld).

## Verificatie (end-to-end test)

1. Ga naar `/portal/login`, vul het e-mailadres van een bestaande klant in.
2. Controleer dat de magic-link mail aankomt (Brevo).
3. Klik de link → je wordt ingelogd en op `/portal/` gezet.
4. Dashboard toont naam, diensten en documenten.
5. "Uitloggen" wist de cookie en stuurt terug naar `/portal/login`.
6. Een verlopen of al-gebruikte link → redirect naar `/portal/login?error=link`.
7. Onbekend e-mailadres → zelfde "link verstuurd"-melding (geen enumeration).

`wrangler tail` toont serverlogs (o.a. mislukte magic-link mails).

## Beveiliging

- Wachtwoorden: geen (passwordless).
- Magic-link tokens: gehasht opgeslagen (SHA-256), 15 min TTL, single-use.
- Sessie: HMAC-SHA256 ondertekend, HttpOnly + Secure + SameSite=Lax, 7 dagen.
- Rate limiting: 5/IP en 3/e-mail per 10 min (KV-backed).
- Geen account-enumeration: identieke respons voor bekende/onbekende e-mail.

## Toekomstige uitbreidingen (buiten sprint C)

- Documenten via Cloudflare R2 i.p.v. losse links.
- Admin-route voor klantbeheer (nu via `wrangler d1 execute`).
- Live tool-statistieken (gespreksvolume, uptime) in het dashboard.
- Periodieke opschoning van verlopen `magic_links`-rijen.
