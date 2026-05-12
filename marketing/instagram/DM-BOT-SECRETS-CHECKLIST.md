# DM-Bot + Reels Setup — Final Checklist

> **Goal:** Workflow `IG DM Bot Deploy` heeft alles om volledig automatisch te bootstrappen op Hetzner. Jij voegt 7 GitHub-secrets toe (5 min werk), pusht een commit (of triggert workflow_dispatch), klaar.
>
> Geen handmatige SSH-sessie nodig. Geen install.sh draaien op de host. Workflow doet alles.

---

## ✅ Door mij gegenereerd (kopieer direct)

### `IG_WEBHOOK_VERIFY_TOKEN`

```
a3a0642fd9e85717d32d362ee39bd579cf456da080de4fd854219754f9db4855
```

Gebruik deze exacte string op **2 plaatsen**:

1. GitHub repo → Settings → Secrets → toevoegen als `IG_WEBHOOK_VERIFY_TOKEN`
2. Meta Developer Dashboard → Aanloop App → Instagram → Webhooks → veld **"Verify Token"**

Beide moeten 100% identiek zijn anders weigert Meta de webhook-subscriptie.

---

## 📝 Door jou aan te leveren (7 secrets totaal)

### A. Hetzner-toegang (3 secrets)

#### `HETZNER_HOST`

Waarde: `178.104.100.94`

#### `HETZNER_SSH_USER`

Waarde: `root` (of een sudo-enabled deploy-user als die op host bestaat)

#### `HETZNER_SSH_PRIVATE_KEY`

Genereer **op je lokale machine** (geen Hetzner-toegang nodig voor stap 1):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/aanloop-ig-dm -N "" -C "github-actions-ig-dm-deploy"
```

Resultaat: 2 bestanden.

- `~/.ssh/aanloop-ig-dm.pub` → public, op Hetzner plakken
- `~/.ssh/aanloop-ig-dm` → private, in GitHub-secret

**Public key uploaden naar Hetzner** (eenmalig):

Optie 1 — als je nu SSH-toegang hebt (via GrowthBook-stack key):

```bash
cat ~/.ssh/aanloop-ig-dm.pub | ssh root@178.104.100.94 'cat >> ~/.ssh/authorized_keys'
```

Optie 2 — via Hetzner Cloud Console → ubuntu-4gb-nbg1-1 → "Console" → handmatig plakken in `/root/.ssh/authorized_keys`.

**Private key → GitHub secret:**

```bash
cat ~/.ssh/aanloop-ig-dm
```

Hele output (incl. `-----BEGIN OPENSSH PRIVATE KEY-----` t/m `-----END OPENSSH PRIVATE KEY-----`) plakken in GitHub-secret `HETZNER_SSH_PRIVATE_KEY`.

### B. Meta App / IG-bot (4 secrets)

#### `IG_WEBHOOK_VERIFY_TOKEN`

Al gegenereerd (zie hierboven).

#### `IG_APP_SECRET`

1. https://developers.facebook.com/apps
2. Selecteer **Aanloop App**
3. Settings → **Basic**
4. Klik "Show" naast **App Secret** → kopieer (32 hex-chars)

#### `IG_PAGE_ACCESS_TOKEN`

1. Meta App → **Instagram** product → "API Setup with Instagram Login"
2. Selecteer jouw IG Business Account (@aanloop.ai)
3. Klik **"Generate token"**
4. Bevestig de scopes:
   - `instagram_basic`
   - `instagram_manage_messages`
   - `instagram_manage_comments`
   - `pages_messaging`
   - `instagram_content_publish` (nodig voor Reels)
5. Kopieer de hele long-lived token (60d geldig, begint met `EAAB...`)

#### `IG_USER_ID`

In dezelfde Instagram API-setup pagina, zie veld **"Instagram Account ID"** (numeriek, ~17 cijfers, bv. `27079267511690071`).

---

## 🌐 Cloudflare (geen secret, wel 1 instelling)

1. https://dash.cloudflare.com → aanloopai.nl zone → SSL/TLS → Overview
2. Encryption mode → zet op **"Full (strict)"**
3. Save

Workflow heeft dit nodig voor Let's Encrypt + nginx :443.

---

## 📋 Meta App — webhook configureren

In Meta Developer Dashboard → Aanloop App → Instagram → Webhooks → **Configure**:

| Veld | Waarde |
|------|--------|
| Callback URL | `https://ig-dm.aanloopai.nl/webhook` |
| Verify Token | `a3a0642fd9e85717d32d362ee39bd579cf456da080de4fd854219754f9db4855` |

Subscribe to fields (vink aan):

- `messages`
- `messaging_postbacks`
- `comments`
- `mentions`
- `story_mention`

**Klik "Verify and Save"** — Meta doet een GET-call naar `/webhook` met deze token. Als de workflow al gedraaid heeft en de bot live is, valideert dit direct. Anders eerst workflow runnen, daarna in Meta op "Verify".

---

## 🚀 Stappen-volgorde

1. **Genereer SSH-key** lokaal (1-liner hierboven)
2. **Upload public-key** naar Hetzner `authorized_keys`
3. **Cloudflare SSL** → Full (strict)
4. **Meta App** → kopieer App Secret + genereer Page Token + noteer IG User ID
5. **GitHub Secrets** → voeg alle 7 secrets toe (Settings → Secrets and variables → Actions)
6. **Trigger workflow** → GitHub → Actions → "IG DM Bot Deploy" → "Run workflow" (master branch)
7. **Wacht ~5 min** → workflow installeert prerequisites, schrijft env, start service, doet health-check
8. **Meta App** → Webhooks → "Verify and Save" (nu dat de bot live is, valideert Meta)
9. **IG bio update** → "💬 DM **BILGI** → gratis 15-min audit"
10. **Live test** → 2e IG-account → DM @aanloop.ai of comment `BILGI` op een post → check auto-reply binnen 7-15 sec

---

## 🛟 Als workflow faalt

| Fout | Oplossing |
|------|-----------|
| `Missing secret: X` | Voeg secret toe in GitHub Settings → Secrets |
| SSH `Permission denied` | Public key niet correct op Hetzner. Test: `ssh -i ~/.ssh/aanloop-ig-dm root@178.104.100.94 'whoami'` |
| `certbot` faalt | Cloudflare blokkeert port 80 → check geen WAF-rule die HTTP-01 blokkeert |
| nginx 525 op health | Origin nginx draait niet — check `journalctl -u nginx` op host |
| Health 502 | bot-service down — check `journalctl -u aanloop-ig-dm -f` op host |
| Meta "Verify" faalt | Verify-token mismatch. Beide kanten check: GitHub-secret == Meta-app field |

---

## 🎁 Bonus — Reels workflow gebruikt zelfde secrets

Zodra `IG_PAGE_ACCESS_TOKEN` + `IG_USER_ID` staan, **werkt ook**:

- `.github/workflows/ig-reels-publish.yml` (cron Mo/Wo/Vr 09:00 CET, eerste Reel: wo 13 mei)
- Test eerst: Actions → "IG Reels Auto-Publish" → Run workflow → input `slot=reel-001-ai-fouten-mkb`, `dry_run=true`

Eén Page-token + ID = beide bots actief.
