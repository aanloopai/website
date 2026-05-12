# Instagram Reels Pipeline — Aanloop

Otomatik Reels render + publish pipeline voor @aanloop.ai.

**Architectuur:**

```
wave-N-reels-schedule.json
        │
        ├── python scripts/render-ig-reel.py
        │        │
        │        ▼
        │   public/social-feed/reels/<slot-id>.mp4  (committed)
        │
        └── node scripts/ig-publish-reel.mjs
                 │
                 ▼
            Meta Graph API v19.0 (media_type=REELS)
                 │
                 ▼
            IG @aanloop.ai
```

**Cron:** Mon/Wed/Fri 09:00 CET via `.github/workflows/ig-reels-publish.yml`.

## Bestanden

| Pad | Doel |
|-----|------|
| `scripts/render-ig-reel.py` | moviepy renderer, 5 templates, 1080×1920 9:16 |
| `scripts/ig-publish-reel.mjs` | Direct Graph API REELS publish (2-step + status-poll) |
| `marketing/instagram/wave-3-reels-schedule.json` | 10-slot content schedule |
| `marketing/instagram/reels/assets/` | Auto-gegenereerde gradient-bg cache |
| `public/social-feed/reels/` | Output MP4's (committed, served via aanloopai.nl) |
| `.github/workflows/ig-reels-publish.yml` | Cron + render + publish + failure-issue |

## 5 Templates

Elke slot in schedule heeft `template: <naam>`. Renderer dispatcht hierop.

### 1. `hook-card` (12s)

3-second hook-text + 3 bullet-reveals + CTA. Beste voor **tip-lists** en **"top N"** content.

```json
{
  "template": "hook-card",
  "hook": "3 AI-fouten\ndie MKB maakt",
  "bullets": ["Tool kopen voor gebruik", "Geen NL-data", "Geen ROI-meting"],
  "cta": "Fix dit → aanloopai.nl/ig"
}
```

### 2. `talking-stat` (10s)

Grote statistiek (260px) + label + bron + CTA. Beste voor **shock-value** en **research-cite**.

```json
{
  "template": "talking-stat",
  "stat": "67%",
  "label": "van NL MKB verliest tijd",
  "source": "Bron: CBS 2025",
  "cta": "AI halveert dit → aanloopai.nl/ig"
}
```

### 3. `quote-reveal` (12s)

Klant-quote groot + auteur + rol + CTA. Beste voor **social-proof** en **case-studies**.

```json
{
  "template": "quote-reveal",
  "quote": "Sinds Marco gemiste oproepen oplost, hebben we 0 missed calls.",
  "author": "Restauranthouder",
  "role": "Amsterdam-regio (geanonimiseerd)",
  "cta": "Meer cases → aanloopai.nl/ig"
}
```

### 4. `before-after` (10s)

Split-screen rood/groen met VOOR/NA text. Beste voor **transformatie-bewijs**.

```json
{
  "template": "before-after",
  "title": "Klantenservice in 2026",
  "before": "8 gemiste calls/dag\n3u/dag voicemail",
  "after": "0 gemiste calls\nAI handelt 70% af",
  "cta": "aanloopai.nl/ig"
}
```

### 5. `ken-burns` (10s)

Photo met zoom/pan + overlay text. Beste voor **lifestyle/sfeer** content. Vereist `image: <pad>` veld dat naar bestaande JPG/PNG verwijst.

```json
{
  "template": "ken-burns",
  "image": "public/social-feed/marco-portrait.jpg",
  "headline": "Marco — AI-receptie",
  "sub": "24/7 voor jouw restaurant",
  "cta": "aanloopai.nl/ig"
}
```

## Caption + share_to_feed

Elke slot heeft daarnaast:

- `caption` — IG caption (max 2200 chars; 8-10 hashtags aan einde)
- `share_to_feed` (bool, default `true`) — toon Reel ook in feed-grid
- `posted_at` / `media_id` / `permalink` — door publisher gevuld na succes

## Audio-strategie

Bot upload Reels **silent** met opzet. **Reden:** Meta-native trending audio in app toevoegen geeft 2-3× reach-boost via algoritma + 0% copyright-risk.

**Workflow na auto-upload:**

1. Wacht ~2 min na publish.
2. Open Reel in IG-app → 3-dots → "Add music".
3. Kies **trending** audio (vlam-icoontje) die past bij content-toon.
4. Save → klaar.

Optioneel later: Whisper auto-subtitles + Epidemic Sound subscription voor licensed audio.

## Cron-cadence

`Mon/Wed/Fri 09:00 CET` = 3 Reels/week. Reden:

- IG-algoritma reach-curve plat na 3-5 posts/week
- Burnout-veilig content-volume
- 30 dagen schedule = ~12-13 Reels

10-slot wave-3 schedule = **3.3 weken** (mei 13 → juni 3).

## GitHub-secrets

Workflow gebruikt (zelfde secrets als ig-dm-bot):

- `IG_PAGE_ACCESS_TOKEN` — long-lived Page token, scopes:
  - `instagram_basic`
  - `instagram_content_publish`
  - `instagram_manage_comments`
- `IG_USER_ID` — IG Business User ID (numeriek, `27079267511690071` huidige)

Hergebruik DM-bot setup: zelfde token + user-id.

## Local development

Render lokaal:

```bash
# Eén slot
python scripts/render-ig-reel.py --slot reel-001-ai-fouten-mkb

# Alle pending slots
python scripts/render-ig-reel.py --all
```

Output: `public/social-feed/reels/<slot-id>.mp4`. Bekijk in browser/VLC; iteratief tweaken via slot-velden.

Publish DRY:

```bash
DRY_RUN=1 IG_PAGE_ACCESS_TOKEN=fake IG_USER_ID=27079267511690071 node scripts/ig-publish-reel.mjs
```

## Volgende waves

Nieuwe schedule = `wave-N-reels-schedule.json` (N+1 increment). Publisher pakt automatisch de hoogste wave met pending slots. Renderer idem.

Aanrader voor wave-4:
- Mix templates 40% hook-card / 30% talking-stat / 20% quote-reveal / 10% before-after
- 1 ken-burns/wave als brand-pillar
- Hooks <8 woorden voor max retention
- Hashtag-rotation per 4 weken om shadowban te vermijden

## Troubleshooting

| Probleem | Check |
|----------|-------|
| Renderer faalt op fonts | `REEL_FONT_*` env-vars set? Op Linux: Liberation Sans pad. Op Windows: Segoe UI standaard pad |
| moviepy ImportError | `pip install moviepy>=2.0.0` (v2 API gebruik `.with_position()` ipv `.set_position()`) |
| Container ERROR status | Video te lang (>90s) / verkeerd codec / niet bereikbaar URL — check `pollContainerReady` log |
| video_url 404 | Site nog niet rebuild na MP4 commit; verhoog `sleep 90` in workflow naar 120-180s |
| "Account not eligible for Reels" | IG Business → Creator-account omzetten (Settings → Account type) |
| Sequence: render-OK → publish-fail | Schedule wijzigt niet als publish faalt; rerun met dezelfde wave-N schedule, render = cache-hit |

## Eerste run-handleiding

1. **Secrets:** GitHub repo → Settings → Secrets → toevoegen `IG_PAGE_ACCESS_TOKEN` + `IG_USER_ID` (al gedeeld met DM-bot — hergebruik).
2. **Test render:** Workflow → "IG Reels Auto-Publish" → Run workflow → input `slot=reel-001-ai-fouten-mkb` + `dry_run=true`. Check MP4 in `public/social-feed/reels/`.
3. **Test publish:** Verwijder `dry_run`, run opnieuw. Check IG-app voor Reel + permalink terug in schedule JSON.
4. **Wacht op cron:** Eerstvolgende slot = Wed 2026-05-13 09:00 CET (`reel-001`).
5. **Na auto-publish:** Audio toevoegen in IG-app (zie Audio-strategie hierboven).
