# Facebook Auto-Publish Pipeline — Setup

Aanloop AI Facebook Page'e otomatik foto+caption yayımlama. IG/LinkedIn pipelines ile parallel pattern.

## Huidige status

| Onderdeel | Status | Bestand |
|-----------|--------|---------|
| Publisher script | DONE | `scripts/fb-publish.mjs` |
| Wave 1 schedule (5 slots, 19 mei → 2 juni) | DONE | `marketing/facebook/wave-1-schedule.json` |
| GitHub Actions cron Di/Do 09:00 CET | DONE | `.github/workflows/fb-publish.yml` |
| Failure to GitHub Issue hook | DONE | in workflow |
| Schedule write-back commit | DONE | in workflow |
| FB Page Access Token in GH Secrets | pending user | `FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN` |
| Live validate run | pending user | workflow_dispatch + `validate_only=true` |
| First production post (`fb1-01-launch`) | pending | slot 2026-05-19T09:00 CET |

## User-actions (volgorde)

### 1. Facebook Page ID achterhalen

1. Login op https://www.facebook.com als Mustafa
2. Ga naar de Aanloop AI Facebook Page
3. URL eindigt op `/AanloopAI` of een numeriek id. Voor het numerieke id: open de Page > 'About' > onderaan staat `Page ID: 1234567890`
4. OF gebruik Graph API Explorer:
   - https://developers.facebook.com/tools/explorer/
   - Selecteer 'Aanloop n8n' app (of bestaande Meta app waar de IG-DM bot ook onder valt)
   - GET `/me/accounts` returns alle Pages waar Mustafa admin op is, inclusief `id` per Page
5. Noteer het numerieke id = GH secret `FB_PAGE_ID`

### 2. Long-lived Page Access Token genereren

User Access Token (1-2 uur geldig) to Long-lived User Token (60 dagen) to Long-lived Page Token (geen expiry zolang user-token geldig is).

1. Graph API Explorer:
   - URL: https://developers.facebook.com/tools/explorer/
   - App: `Aanloop n8n` (zelfde Meta app als IG-DM bot)
   - Permissions toevoegen:
     - `pages_show_list`
     - `pages_read_engagement`
     - `pages_manage_posts`
     - `pages_manage_metadata` (optioneel, voor toekomstige Page-edits)
   - Klik Generate Access Token, Mustafa moet inloggen en toestaan
   - Kopieer de korte User Access Token (begint met `EAA...`)

2. Exchange to long-lived User Token (60 dagen):
   ```bash
   curl -G "https://graph.facebook.com/v19.0/oauth/access_token" \
     --data-urlencode "grant_type=fb_exchange_token" \
     --data-urlencode "client_id=<META_APP_ID>" \
     --data-urlencode "client_secret=<META_APP_SECRET>" \
     --data-urlencode "fb_exchange_token=<SHORT_USER_TOKEN>"
   ```
   Response: `{"access_token":"<LONG_USER_TOKEN>","expires_in":5183999,"token_type":"bearer"}`

3. Get long-lived Page Token (no expiry):
   ```bash
   curl -G "https://graph.facebook.com/v19.0/me/accounts" \
     --data-urlencode "access_token=<LONG_USER_TOKEN>"
   ```
   Response zoek Aanloop AI Page entry: `access_token` veld is de Page Token. Dit token vervalt NIET zolang user-token geldig is.

4. Noteer het Page Token = GH secret `FB_PAGE_ACCESS_TOKEN`

### 3. GitHub Secrets toevoegen

Repository > Settings > Secrets and variables > Actions > New repository secret:

| Naam | Waarde |
|------|--------|
| `FB_PAGE_ID` | numeriek Page id (stap 1) |
| `FB_PAGE_ACCESS_TOKEN` | long-lived Page Token (stap 2) |

### 4. Live validate run

GitHub Actions > Facebook Auto-Publish > Run workflow:
- `validate_only`: `true`
- Branch: `master`

Verwacht log:
```
FB Page ID: <numeric>
FB Page token: EAA...xxxx len=NNN
/me: id=<same numeric> name=Aanloop AI
```

Als `WARNING: token /me id != FB_PAGE_ID` verschijnt: token hoort niet bij de Aanloop AI Page. Opnieuw stap 2 met juiste Page selectie.

### 5. Eerste live post

Op 2026-05-19 07:00/08:00 UTC vuurt cron automatisch. OF manueel triggeren via workflow_dispatch (lege inputs to live post).

## Limieten / aandachtspunten

- Image URL fetch: Facebook fetcht `image_base_url + image` = `https://aanloopai.nl/social-feed/post-XX.png`. Cloudflare moet 200 returnen, geen geo-blok, geen auth.
- Caption max: ca 63.000 tekens. Wave 1 captions zitten 400-900 tekens, ruim binnen.
- Rate limit: Page Posts API ca 200 calls/hour per Page. Cron 2x/week = no concern.
- Hashtags op FB werken beperkter dan IG. Eerste 1-2 OK, daarna minimal, caption-leesbaarheid prioriteit.
- App Review nodig? Voor `pages_manage_posts` op een Page waar Mustafa admin is: NEE, development mode is voldoende. Voor posten namens andere Pages wel app review. Aanloop AI Page = eigen Page, dus geen review.

## Troubleshooting

| Fout | Oorzaak | Fix |
|------|---------|-----|
| `(#190) Error validating access token: Session has expired` | User token waar Page Token uit komt is verlopen | Stap 2 opnieuw (User token elke 60 dagen) |
| `(#200) Requires pages_manage_posts permission` | Token mist scope | Stap 2 opnieuw, vink permissions correct aan |
| `(#10) To use Page Public Content Access...` | App Review nodig, alleen als token niet van Mustafa admin Page is | Genereer Page Token met juiste user-account |
| `Photo upload failed: image_base_url unreachable` | CDN/CF blokkeert | Test image URL handmatig in browser eerst |
| `WARNING /me id mismatch` | Token hoort bij andere Page | Stap 2 met goede Page selectie |

## Cron offset met IG/LinkedIn

| Platform | Cadence | Tijd CET |
|----------|---------|----------|
| Instagram | Ma/Wo/Vr | 09:00 |
| LinkedIn | Di/Do | 09:00 |
| Facebook | Di/Do | 09:00 (parallel met LinkedIn) |

Same content (image) kan op zelfde dag op LinkedIn en FB, algoritmes overlappen niet, audience verschilt. IG krijgt aparte dag voor IG-native ritme.

## Volgende stappen na go-live

1. Wave-2 FB schedule schrijven (na 2 juni) met 5 nieuwe captions tailored op FB-audience (langer storytellinge, minder hashtags)
2. FB Reels via `scripts/fb-publish-reel.mjs` (parallel met `ig-publish-reel.mjs`), pending
3. FB Stories (zelfde mechaniek als IG Stories), pending
4. FB to Instagram cross-publish optie in IG publisher (post 1x, cross naar FB), optimization
