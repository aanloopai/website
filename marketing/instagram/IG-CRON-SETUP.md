# Instagram Auto-Publish — Setup

GitHub Actions cron publishes one due slot from `wave-2-schedule.json` to `@aanloop.ai` every Mo/We/Fr 09:00 CET. Onafhankelijk van Composio Rube (EOL 2026-05-15).

## Componenten

| Bestand | Rol |
|---------|-----|
| `.github/workflows/ig-publish.yml` | Cron schedule (Mo/We/Fr 07:07 + 08:07 UTC, DST-safe) |
| `scripts/ig-publish.mjs` | Publisher: vindt due-slot, Graph API call, commit terug |
| `marketing/instagram/wave-2-schedule.json` | 5-slot schedule met captions + `posted_at`-state |
| `scripts/render-ig-posts.py` | Pillow render-pipeline (huisstijl) |
| `public/social-feed/*.png` | Live images, served from `aanloopai.nl/social-feed/` |

## Eenmalige setup (Mustafa)

### 1. Long-Lived Page Access Token genereren

Meta vereist een **Page-scoped Page Access Token** (niet User Token) voor Content Publishing API. Long-lived Page tokens **vervallen niet** zolang de app/permissions actief blijven.

#### Stap A — Meta for Developers app

1. Ga naar https://developers.facebook.com/apps
2. Bestaande app gebruiken óf nieuwe Business-app aanmaken
3. **App settings → Basic** → noteer `App ID` + `App Secret`
4. **Add Product:** Instagram Graph API (must)
5. **App Review → Permissions** activeer (development mode is voldoende voor eigen IG):
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
   - `business_management`

#### Stap B — Short-lived User Token via Graph API Explorer

1. Open https://developers.facebook.com/tools/explorer/
2. App dropdown: kies jouw app
3. **Get Token → Get User Access Token**
4. Permissions aanvinken: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`, `business_management`
5. Klik **Generate Access Token**, login als de eigenaar van de FB-Page die aan `@aanloop.ai` gekoppeld is
6. Kopieer token (vervalt over 1u)

#### Stap C — Exchange naar long-lived User Token (60 dagen)

```bash
curl -s "https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={SHORT_USER_TOKEN}"
```

Response: `{"access_token":"EAA...", "token_type":"bearer", "expires_in":5183999}` → long-lived User Token.

#### Stap D — Long-lived Page Token (vervalt nooit)

```bash
curl -s "https://graph.facebook.com/v21.0/me/accounts?access_token={LL_USER_TOKEN}"
```

Response bevat een lijst van Pages. Zoek de Page met IG Business `@aanloop.ai` gekoppeld → het `access_token`-veld is een **long-lived Page Access Token** die niet vervalt.

Verifieer:

```bash
curl -s "https://graph.facebook.com/v21.0/debug_token?input_token={PAGE_TOKEN}&access_token={LL_USER_TOKEN}"
```

`expires_at` moet `0` zijn (no expiry).

### 2. GitHub Secret toevoegen

GitHub repo `aanloopai/website` → **Settings → Secrets and variables → Actions → New repository secret**:

- Name: `META_LL_TOKEN`
- Value: het Page Access Token uit Stap D

### 3. Workflow inschakelen

`.github/workflows/ig-publish.yml` is al in master. GitHub activeert cron automatisch nadat het bestand op de default branch staat.

### 4. Test-run

GitHub repo → **Actions → Instagram Auto-Publish → Run workflow** (master):
- Input `dry_run`: `true` (eerste run om token + schedule te valideren, geen Graph API)
- Output in run-log moet eerste due-slot tonen of "No due post"

Daarna `dry_run: false` voor echte publish (alleen als slot nu due is).

## Schedule beheren

`wave-2-schedule.json` heeft 5 slots. Volgorde:

| Slot | Datum (CET) | Pillar | Image |
|------|-------------|--------|-------|
| wave2-01 | Wo 2026-05-13 09:00 | EU AI Act | post-06 |
| wave2-02 | Vr 2026-05-15 09:00 | Horeca case | post-07 |
| wave2-03 | Ma 2026-05-18 09:00 | Founder POV | post-08 |
| wave2-04 | Wo 2026-05-20 09:00 | ROI-rekentool | post-09 |
| wave2-05 | Vr 2026-05-22 09:00 | Counter-objection | post-10 |

Volgende wave: nieuwe schedule-file `wave-3-schedule.json` + update `SCHEDULE_PATH` env-variabele in workflow, óf vervang `wave-2-schedule.json` met nieuwe slots (alle `posted_at: null`).

## Idempotentie

Publisher:
- Vindt eerste `post` waar `posted_at === null` EN `slot_iso ≤ now`
- Publiceert, schrijft `posted_at`, `media_id`, `permalink` terug
- Workflow commit'ed het bestand naar master
- Volgende run pakt automatisch de volgende due slot

Bij failure (Graph API down, image niet bereikbaar, etc.): exit-code 1, GitHub markeert run rood, schedule blijft onveranderd → volgende run probeert opnieuw.

## Monitoring

- GitHub Actions run-history: every Mo/We/Fr 07:07 + 08:07 UTC
- Workflow log toont creation_id, media_id, permalink
- Failure-runs → GitHub stuurt mail naar repo-watchers

## Token-rotatie

Long-lived Page tokens vervallen niet, **behalve** als:
- App-permissions worden ingetrokken
- Page-admin wijzigt
- Meta de app of token revokeert

Bij failure HTTP 190 (`OAuthException`): herhaal Stap B-D, update `META_LL_TOKEN` secret.

## Composio onafhankelijkheid

Deze pipeline gebruikt **Meta Graph API direct**. Geen Composio-dependency. Werkt na 2026-05-15 (Composio Rube EOL).
