# Instagram DM Auto-Reply Bot — Setup

Otomatik DM-bot voor @aanloop.ai. Triggers:

- **DM ontvangen** → welkom-bericht (NL) + aanloopai.nl/ig CTA
- **Comment met keyword** (`BILGI`, `INFO`, `AUDIT`, `DEMO`) → DM + comment-reply
- **Story-mention** → bedank-DM

Stack: Node 20 + Meta Graph API v19.0 + systemd + nginx + Let's Encrypt. Host: Hetzner `ubuntu-4gb-nbg1-1` (178.104.100.94). Domein: `ig-dm.aanloopai.nl` (Cloudflare proxy aan).

## Bestanden in deze repo

| Pad | Doel |
|-----|------|
| `scripts/ig-dm-bot.mjs` | Webhook receiver + auto-DM |
| `marketing/instagram/dm-templates.json` | 3x NL bericht-varianten per trigger |
| `deploy/ig-dm/aanloop-ig-dm.service` | systemd unit |
| `deploy/ig-dm/nginx.conf` | nginx vhost (HTTPS → :3030) |
| `deploy/ig-dm/install.sh` | One-time host setup |
| `.github/workflows/ig-dm-deploy.yml` | Auto-rsync bot + restart op push |

## 1. Meta App configureren

1. https://developers.facebook.com/apps → **Aanloop App** (zelfde app als IG-publish).
2. **Products → Instagram → Webhooks** → "Configure Webhook":
   - **Callback URL:** `https://ig-dm.aanloopai.nl/webhook`
   - **Verify Token:** willekeurig 32+ char string. Bewaren als `IG_WEBHOOK_VERIFY_TOKEN`.
   - **Subscribe to fields:** `messages`, `messaging_postbacks`, `comments`, `mentions`, `story_mention`
3. **App Dashboard → Settings → Basic** → kopieer **App Secret** als `IG_APP_SECRET`.
4. **Instagram → API setup with Instagram login** → genereer **Long-Lived Page Access Token** met scopes:
   - `instagram_basic`
   - `instagram_manage_messages`
   - `instagram_manage_comments`
   - `pages_messaging`
   - Bewaren als `IG_PAGE_ACCESS_TOKEN`.
5. Noteer **IG Business User ID** (numeriek) → `IG_USER_ID`.

## 2. GitHub-secrets toevoegen

Repo → Settings → Secrets and variables → Actions → New secret:

| Secret | Inhoud |
|--------|--------|
| `HETZNER_SSH_PRIVATE_KEY` | ed25519 private key (PEM, hele blok incl. BEGIN/END) |
| `HETZNER_SSH_USER` | `root` (of deploy-user met sudo voor `systemctl restart aanloop-ig-dm`) |
| `HETZNER_HOST` | `178.104.100.94` |

> Genereer key lokaal: `ssh-keygen -t ed25519 -f ~/.ssh/aanloop-ig-dm -N ""`. Voeg de public key toe aan `~/.ssh/authorized_keys` op de Hetzner host.

## 3. Hetzner: eenmalige setup

SSH naar host en draai:

```bash
cd /tmp
git clone --depth 1 https://github.com/<owner>/aanloop.git
cd aanloop/deploy/ig-dm

sudo IG_PAGE_ACCESS_TOKEN='EAAB...' \
     IG_USER_ID='178414...' \
     IG_WEBHOOK_VERIFY_TOKEN='RANDOM32CHARS...' \
     IG_APP_SECRET='abcd1234...' \
     bash install.sh
```

`install.sh` doet:

- apt: `nginx`, `certbot`, Node 20
- maakt user `aanloop`, dir `/opt/aanloop-ig-dm/`
- schrijft `/etc/aanloop-ig-dm.env` (mode 0640)
- installeert systemd unit + nginx vhost
- vraagt Let's Encrypt cert aan (HTTP-01 via `/.well-known/acme-challenge/`)

> **Cloudflare proxy + Let's Encrypt**: zet Cloudflare SSL-mode op **"Full (strict)"**. HTTP-01 werkt mits Cloudflare port 80 doorgeeft (standaard ja).

## 4. Eerste deploy

```bash
git add scripts/ig-dm-bot.mjs marketing/instagram/dm-templates.json deploy/ig-dm .github/workflows/ig-dm-deploy.yml marketing/instagram/DM-BOT-SETUP.md
git commit -m "feat(ig-dm): auto-DM bot via Meta Graph API"
git push origin master
```

GitHub Actions:

- rsync bot + templates → `/opt/aanloop-ig-dm/`
- `systemctl restart aanloop-ig-dm`
- curl `https://ig-dm.aanloopai.nl/health` (verwacht `{"ok":true,...}`)

## 5. Verifieer in Meta App

1. Meta App → Webhooks → "Send test event" voor `messages` → check journal op host:

   ```bash
   sudo journalctl -u aanloop-ig-dm -f
   ```

2. Live test: stuur een DM vanaf een tweede IG-account naar @aanloop.ai. Verwacht: auto-welkom binnen 7–15 sec.
3. Comment-test: post een test-foto, reageer met `BILGI` vanaf testaccount. Verwacht: auto-DM + comment-reply "Stuurde je net een DM 📩".

## 6. IG-account klaarzetten voor traffic

- **Bio update** (Instagram → Edit Profile):

  > AI-automatisering voor NL MKB 🇳🇱
  > 💬 DM **BILGI** → gratis 15-min AI-audit
  > 👉 aanloopai.nl/ig

- **Pinned post / Carousel "Start hier"**: 5-slide intro met laatste slide CTA "Reageer **BILGI** voor uitleg".

## 7. Beheer + monitoring

| Actie | Commando |
|-------|----------|
| Status | `systemctl status aanloop-ig-dm` |
| Logs (live) | `journalctl -u aanloop-ig-dm -f` |
| Restart | `systemctl restart aanloop-ig-dm` |
| Health | `curl https://ig-dm.aanloopai.nl/health` |
| Template-edit | edit `marketing/instagram/dm-templates.json` → push master |
| Token-refresh (60d) | regen long-lived token Meta-app → update `/etc/aanloop-ig-dm.env` → restart |

## Veiligheid + limits

- Signature-verificatie via `X-Hub-Signature-256` HMAC (App Secret). Zonder geldige sig → 401.
- 7-dagen dedup per IGSID (`data/ig-dm-replied.json`). Geen herhaalde welkoms.
- 3 template-varianten per trigger → roteert per bericht (anti-spam patroon).
- 7s reply-delay → niet identificeerbaar als bot door Meta's rate-detector.
- Meta 24-uur messaging-window respecteert: bot reply alleen op user-initiation (DM/comment/mention). **Geen onbestelde cold-DM mogelijk via API** (Meta beleid 2024+).

## Troubleshooting

| Probleem | Check |
|----------|-------|
| Webhook verify faalt | `IG_WEBHOOK_VERIFY_TOKEN` op host == Meta-app token? `curl 'https://ig-dm.aanloopai.nl/webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=test'` moet `test` returnen |
| 401 bad signature | `IG_APP_SECRET` correct gekopieerd uit Meta App → Basic? |
| Geen DM-reply | Token-scope `instagram_manage_messages` aan? Token-expiry? `journalctl` toont Graph-API error |
| nginx 502 | bot-service down: `systemctl status aanloop-ig-dm` |
| Cloudflare blokkeert webhook | Check CF firewall rules; "Browser Integrity Check" kan POST blokkeren. Whitelist Meta IP-range of zet hostname op "DNS only" (grijs wolkje) als laatste redmiddel |
