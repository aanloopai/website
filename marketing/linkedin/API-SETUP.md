# LinkedIn API Setup — Aanloop Social Publisher

Doel: LinkedIn Developer app + OAuth 2.0 + access token zodat automatische cross-posting (naast IG) mogelijk wordt na de IG-migratie. Dit document is een credentials-pad — de publisher-script komt in een volgend ticket nadat de IG Wave-2 stabiel post.

Voorvereiste: Aanloop AI company page bestaat (zie `COMPANY-PAGE-SPEC.md`).

---

## 1 — Developer app aanmaken

1. Login op https://developer.linkedin.com/ (zelfde account als personal profile, `doganm`).
2. **My Apps → Create app**.
3. Vul in:
   - App name: `Aanloop Social Publisher`
   - LinkedIn Page: selecteer **Aanloop AI** (de net-aangemaakte company page; verplicht — LinkedIn associeert apps aan pages)
   - App logo: `public/brand/png/logo-mark-300.png`
   - Legal agreement: aanvinken
4. **Create app**.

---

## 2 — Products toevoegen

In de app dashboard → **Products** tab:

| Product | Doel | Approval |
|---------|------|----------|
| `Sign In with LinkedIn using OpenID Connect` | OAuth login | Automatisch goedgekeurd |
| `Share on LinkedIn` | Personal-profile posten (`w_member_social`) | Automatisch goedgekeurd |
| `Marketing Developer Platform` | Company-page posten (`w_organization_social`) | Manueel review (dagen — weken) |

Eerste twee zijn voldoende voor personal-posts via Mustafa-profile.
`Marketing Developer Platform` aanvragen voor company-page automation; live-zetten kan later.

---

## 3 — OAuth 2.0 instellen

In de app → **Auth** tab:

- **Redirect URLs** (één van):
  - `https://aanloopai.nl/auth/linkedin-callback`
  - `http://localhost:3000/auth/linkedin-callback` *(voor lokale token-exchange tests)*

  We bouwen geen daadwerkelijke callback-pagina op aanloopai.nl. De callback URL hoeft alleen geregistreerd te zijn; de OAuth-flow geeft de `code` als querystring terug die we handmatig kopiëren.

- Noteer: **Client ID**, **Client Secret** (verbergen, in 1Password).

---

## 4 — Eerste access token (Authorization Code Flow)

### 4a — Authorization URL openen in browser

Vervang `{CLIENT_ID}` en open dit in incognito (ingelogd als Mustafa):

```
https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id={CLIENT_ID}&redirect_uri=https%3A%2F%2Faanloopai.nl%2Fauth%2Flinkedin-callback&state=aanloop-init-2026-05-12&scope=openid%20profile%20email%20w_member_social
```

LinkedIn vraagt toestemming → na bevestiging redirect naar `aanloopai.nl/auth/linkedin-callback?code=AQT...&state=aanloop-init-2026-05-12`. De pagina is een 404 (verwacht). Kopieer de `code`-querystringwaarde uit de adresbalk.

### 4b — Code → access token uitwisselen

```bash
curl -X POST https://www.linkedin.com/oauth/v2/accessToken \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code={CODE_FROM_4a}" \
  -d "client_id={CLIENT_ID}" \
  -d "client_secret={CLIENT_SECRET}" \
  -d "redirect_uri=https://aanloopai.nl/auth/linkedin-callback"
```

Response (~60 dagen levensduur, `expires_in` is in seconden):

```json
{
  "access_token": "AQV...",
  "expires_in": 5183999,
  "scope": "w_member_social,openid,profile,email",
  "token_type": "Bearer"
}
```

### 4c — Member-id ophalen (voor `author=urn:li:person:{id}` bij posts)

```bash
curl -H "Authorization: Bearer {ACCESS_TOKEN}" https://api.linkedin.com/v2/userinfo
```

Response bevat `sub` veld → dat is de LinkedIn member-id. Noteer.

---

## 5 — GitHub Secrets

Repo settings → Secrets → Actions, voeg toe:

| Secret | Waarde |
|--------|--------|
| `LINKEDIN_CLIENT_ID` | uit stap 3 |
| `LINKEDIN_CLIENT_SECRET` | uit stap 3 |
| `LINKEDIN_ACCESS_TOKEN` | uit stap 4b |
| `LINKEDIN_MEMBER_ID` | `sub` uit stap 4c |

Na company-page approval (stap 2 `Marketing Developer Platform`):

| Secret | Waarde |
|--------|--------|
| `LINKEDIN_ORG_ID` | LinkedIn org URN — vind via `https://www.linkedin.com/company/aanloop-ai/admin/` → pagina-id uit URL |

---

## 6 — Token refresh

LinkedIn personal access tokens vervallen na **60 dagen** zonder refresh-token (geen refresh-flow voor `w_member_social` op het standaard product).

Mitigation:
- Set kalenderherinnering op 50 dagen voor handmatige herstart van flow 4a/4b.
- Of: vraag `Sign In with LinkedIn` → daar krijg je `refresh_token` (geldig 365 dagen) waarmee je elke 60 dagen het access-token kunt vernieuwen via een eenvoudige refresh-call.

Voor company-page posting via `w_organization_social` geldt dezelfde 60-dagen vervalrule.

---

## 7 — Test-call (geen publisher, alleen smoketest)

Na stap 4, post de eerste test-post:

```bash
curl -X POST https://api.linkedin.com/v2/ugcPosts \
  -H "Authorization: Bearer {ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -H "X-Restli-Protocol-Version: 2.0.0" \
  -d '{
    "author": "urn:li:person:{LINKEDIN_MEMBER_ID}",
    "lifecycleState": "PUBLISHED",
    "specificContent": {
      "com.linkedin.ugc.ShareContent": {
        "shareCommentary": {
          "text": "Test post vanuit Aanloop AI publisher-setup. Wordt zo verwijderd."
        },
        "shareMediaCategory": "NONE"
      }
    },
    "visibility": { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" }
  }'
```

Response geeft `id: urn:li:ugcPost:XXXX`. Open `https://www.linkedin.com/feed/update/urn:li:ugcPost:XXXX/` om te bevestigen, daarna handmatig verwijderen.

---

## 8 — Publisher-script (TODO — niet in deze fase)

Plan voor `scripts/linkedin-publish.mjs` (geschreven in volgende sprint):

- Pattern: `scripts/ig-publish.mjs` analoog — schedule-file `marketing/linkedin/wave-N-schedule.json`, dezelfde idempotentie + writeback.
- Endpoints:
  - Text post: `POST /v2/ugcPosts`
  - Image post (3-stappen): `POST /v2/assets?action=registerUpload` → upload → `POST /v2/ugcPosts` met asset-URN.
- Workflow: `.github/workflows/linkedin-publish.yml` met cadence Di/Do 09:00 CET (offset van IG om feed-overlap te voorkomen).

---

## Checklist

- [ ] Aanloop AI company page live
- [ ] Developer app aangemaakt (`Aanloop Social Publisher`)
- [ ] Products: Sign In + Share on LinkedIn (automatisch)
- [ ] `Marketing Developer Platform` aangevraagd (review-tijd)
- [ ] Redirect URL geregistreerd
- [ ] OAuth-flow doorlopen → access token
- [ ] Member-id genoteerd
- [ ] GitHub Secrets gevuld
- [ ] Test-post via curl geslaagd + handmatig verwijderd
- [ ] Kalenderherinnering "LinkedIn token refresh" op T-50 dagen
