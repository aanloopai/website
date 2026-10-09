# Klantenportaal — overeenkomst ondertekenen + aanleverlijst (spec v1.1, 9 okt 2026)

## SYSTEM-MAP (gelezen vóór het bouwen)

| Onderdeel | Bestaand | Besluit |
|---|---|---|
| Framework | Astro 4 statisch + Cloudflare Worker (`src/worker.js`), Workers Assets | Ongewijzigd |
| Auth klant | Magic-link (`/portal/login`), HMAC-sessie `aanloop_portal_session`, rollen eigenaar/bewerker/kijker | Hergebruikt; geen nieuwe auth |
| Auth admin | Rol `staff`, `/admin` + `/api/admin/*` | Hergebruikt |
| DB | D1 `aanloop-portal` (`customers`, `users`, `magic_links`, …) | Nieuwe tabellen in `migrations/0024`, templates in `0025` |
| Opslag | Geen R2; KV `GOOGLE_TOKENS` bestond | Tweede binding `PORTAL_FILES` op dezelfde namespace (25 MiB/bestand) |
| Mail | Brevo via `sendMail` (portal-routes.js), afzender hello@aanloopai.nl | Uitgebreid met bijlagen |
| Telegram | `notifyTelegram` (notify.js) | Hergebruikt |
| PDF | Geen | `pdf-lib` in de Worker (`src/lib/agreement-pdf.js`) |
| Markdown | Geen renderer | `src/lib/markdown-lite.js` (alleen de syntax uit content/legal) |
| Deploy | GitHub Actions `deploy.yml` → `wrangler versions upload` bij push op master; D1-migraties handmatig | Migraties handmatig toegepast vóór merge |

## Afwijkingen van de spec (bewust)

- URL's onder `/portal/…` i.p.v. `/klanten/…` (bestaand portaal, bestaande login). `/klanten*` → 301 naar `/portal/…`.
- Dynamische id's via `?id=` (statische Astro-build).
- Bestanden in KV i.p.v. R2: max **25 MiB** per bestand (spec: 50 MB voor foto's). Geen signed URL's nodig: downloads zijn sessie-gebonden endpoints.
- Handtekening AanloopAI niet in de repo (repo is publiek) maar in D1 `portal_assets` (buiten git om ingevoegd).
- Klantgegevens (Foralle/Ron) nooit in de repo; buiten git om geseed.
- Afzender blijft `hello@aanloopai.nl` (bestaande Brevo-afzender); M-kopie naar `m.dogan@aanloopai.nl`.
- Sjablonen worden bevroren bij de **eerste consent** (niet bij versturen), zodat KvK/btw die de klant later invult nog in de overeenkomst komt.

## Status

- [x] Migratie 0024 + sjabloon-seed 0025
- [x] Kernbibliotheek (markdown, variabelen, hashes, PDF)
- [x] Klant-API `/api/portal/overeenkomst*`, `/api/portal/aanleveren*`
- [x] Admin-API `/api/admin/overeenkomst*`, `/api/admin/aanlever*`, `/api/admin/sjablonen*`, `/api/admin/portal-audit`
- [x] Portaalpagina's `/portal/overeenkomst/`, `/portal/aanleveren/` + dashboardkaarten
- [x] Adminpagina's `/admin/overeenkomst/`, `/admin/aanleverlijst/`, `/admin/sjablonen/`
- [ ] **Owner:** in `/admin/overeenkomst/?id=…` de conceptovereenkomst controleren en **Versturen** (mailt Ron de uitnodiging)
- [ ] **Owner:** jurist laat B art. 14 en C deel I nakijken (spec-advies)

## LATER (buiten scope)

- HEIC → JPG conversie; automatische verwijdering uploads na 2 jaar; facturatie/leads-dashboard; meertaligheid.
