# Customer Portal — Setup & Operations (v2)

Professioneel klantportaal + admin-panel voor aanloopai.nl. Passwordless
(magic-link) login, multi-user met rollen, en een volledig in-portal
admin-panel voor het Aanloop-team.

Status: **v2 live**. D1 `aanloop-portal` is geconfigureerd; schema 0003 + seed
0004 zijn toegepast; de worker is gedeployed.

## Architectuur

| Onderdeel | Bestand |
|---|---|
| D1-schema v2 | `migrations/0003_portal_v2.sql` |
| Seed (staff + testklant) | `migrations/0004_portal_v2_seed.sql` |
| Auth (HMAC-sessie, magic-link, rollen) | `src/lib/auth.js` |
| Klant-API | `src/lib/portal-routes.js` |
| Admin-API | `src/lib/admin-routes.js` |
| Productcatalogus (statisch) | `src/data/portal-catalog.ts` |
| Route-dispatch | `src/worker.js` |
| Layouts | `src/layouts/PortalLayout.astro`, `AdminLayout.astro` |
| Klantpagina's | `src/pages/portal/{login,index,diensten,ontdekken,facturatie,support,instellingen}.astro` |
| Adminpagina's | `src/pages/admin/{index,klant,aanvragen,support}.astro` |

## Datamodel (D1)

`customers` (bedrijf/account) · `users` (inloggers, rol eigenaar/bewerker/
kijker/staff) · `magic_links` · `team_invites` · `services` · `service_requests`
· `support_tickets` · `invoices` · `documents`.

## Rollen

| Rol | Rechten |
|---|---|
| `eigenaar` | Alles + teambeheer + bedrijfsgegevens |
| `bewerker` | Aanvragen + support aanmaken, alles bekijken |
| `kijker` | Alleen lezen |
| `staff` | Aanloop-medewerker — toegang tot `/admin` |

## Klantportaal-secties

`/portal/` Overzicht · `/portal/diensten` (status + upgrade/pauze-aanvraag) ·
`/portal/ontdekken` (catalogus) · `/portal/facturatie` · `/portal/support` ·
`/portal/instellingen` (bedrijf/profiel/team/notificaties).

Wijzigingen aan diensten lopen via **aanvragen** (request-flow) — Aanloop
verwerkt ze in het admin-panel; geen directe self-service billing.

## Admin-panel (`/admin`)

Klantenlijst + nieuwe klant aanmaken · klantdetail (bedrijfsgegevens,
gebruikers, diensten activeren/pauzeren/tier, facturen) · aanvraag-wachtrij
· support-wachtrij (antwoord wordt gemaild).

## Setup (al gedaan — referentie)

1. `wrangler d1 create aanloop-portal` → `database_id` in `wrangler.toml`.
2. `wrangler secret put PORTAL_SESSION_SECRET`.
3. `wrangler d1 execute aanloop-portal --remote --file=migrations/0003_portal_v2.sql`
4. `wrangler d1 execute aanloop-portal --remote --file=migrations/0004_portal_v2_seed.sql`
5. `npm run build && wrangler deploy`.

## Een klant toevoegen

Via het admin-panel: `/admin` → **+ Nieuwe klant** (bedrijf + e-mail eigenaar).
Er wordt een account + eigenaar-gebruiker aangemaakt en een welkomstmail
verstuurd. Daarna in het klantdetail diensten en facturen toevoegen.

(Niet langer via `wrangler d1 execute` — dat is vervangen door het admin-panel.)

## Inloggen

- Klanten: `aanloopai.nl/portal/login` → e-mail → magic-link in mailbox.
- Aanloop-staff: dezelfde loginpagina; staff-accounts worden na verificatie
  automatisch naar `/admin` geleid.
- Het staff-account `doganagahm@gmail.com` is geseed in 0004.

## Beveiliging

- Geen wachtwoorden (passwordless).
- Magic-link / invite-tokens: SHA-256-gehasht opgeslagen, 15 min / 7 dagen TTL,
  single-use.
- Sessie: HMAC-SHA256 ondertekend, HttpOnly + Secure + SameSite=Lax, 7 dagen.
- Rate limiting op login (KV-backed). Geen account-enumeration.
- Rolcontrole op elke schrijfactie; `/admin` is staff-only.

## V2-uitbreidingen (later)

- "Gesprekken & berichten" — live call/message-logs zodra de telemetrie van
  de AI-platforms (Vapi/Retell/WhatsApp) gekoppeld is.
- Stripe self-service billing, native ticket-threads, analytics, SSO,
  documenten via R2.
