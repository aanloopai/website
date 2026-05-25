# Session 2026-05-25 PM — Wave-5 Cancellation + Wave-6 Launch

**Date**: 2026-05-25 (afternoon-evening, ~14:00-17:00 CEST)
**Master HEAD**: `2ef5fb0`
**Scope**: Major Instagram content-strategy pivot from Wave-5 (cancelled) to Wave-6 (new AI-photo visual style)

## Executive Summary

Wave-5 (104 assets, 4 weeks scheduled to start 2026-05-26 09:00 CEST) was cancelled mid-session per user feedback that the visual style had become too repetitive (Marco/Emma chat-screenshot pattern across 5 consecutive waves). Wave-6 was created from scratch in ~3 hours: 32 posts × 4 weeks using AI-generated photographs (Imagen-4) of real NL MKB sector-scenes, with brand-design language preserved.

Same session also unblocked the DM-bot deployment chain (GitHub Secrets fix + Hetzner cold-start + Meta webhook token-sync) so all 19 keyword-routed DM responses became functional in production for the first time.

## Commits (chronological, master)

| SHA | Title | Scope |
|---|---|---|
| `4f941c8` | feat(ig): Wave-5 Hafta-3/4 lead-magnets — 12 nieuwe PDFs | 10 new keyword PDFs + 2 broken-fix (emma-roadmap, waarom-uitstel), render-dm-asset-pdfs.py extended with 4 helpers (build_checklist_pdf, synth_post, etc) |
| `47332ac` | feat(ig-dm): 10 yeni keyword routing — totaal 23 keywords | dm-templates.json + ig-dm-bot.mjs default KEYWORDS expanded 13→23 |
| `5a47c33` | docs(ig): WAVE5-REDEPLOY-NOTES — Hafta-3/4 + 23-keyword test-flow | Operator-doc update |
| `af7b251` | Update Facebook Graph API URL to Instagram Graph API | Critical fix: scripts/ig-dm-bot.mjs:47 `graph.facebook.com` → `graph.instagram.com` (was rejecting messages 4xx until fixed) |
| `ca8c7aa` | fix(ig): validator carousel-format support | scripts/validate-ig-schedule.mjs: carousel-aware branch (slides[] validation) preserves single-image fallback for Wave-2 |
| `7ca9e53` | chore(ig): archive Wave-5 schedules — Wave-6 yeni-tarz replacement | 12 files renamed `*.json` → `*.json.archived` (regex skips), 104 assets preserved in `public/social-feed/carousel/w5-*` for history |
| `e08ac5a` | feat(ig): Wave-6 Week-1 — 8 nieuwe-stijl AI-photo posts | wave-6-schedule.json + 10 Imagen-4 PNGs (w6-p01..p10) |
| `78cbff5` | feat(ig): Wave-6 Week-2 — 8 BTS + sector mix posts | wave-6-week2-schedule.json + 6 BTS PNGs (founder-desk, code-review, etc) |
| `8d35e51` | feat(ig): Wave-6 Week-3 + Week-4 — 16 posts complete (32 total) | wave-6-week3-schedule.json + wave-6-week4-schedule.json + 10 sector/BTS PNGs (drafted via Plan-agent) |
| `2ef5fb0` | feat(ig): Wave-6 launch-kickoff post — tonight 17:00 CEST | Insert w6-p00 with past slot_iso, race the 15:00 UTC cron-fire for tonight auto-publish |

## Infrastructure Status

### Hetzner ig-dm-bot service
- **Status**: LIVE (was broken since 2026-05-12, fixed today)
- **Health**: `https://ig-dm.aanloopai.nl/health` → `{"ok":true,"replied":N}`
- **Service**: `aanloop-ig-dm.service` running via systemd on 178.104.100.94
- **Deploy method**: rsync via `.github/workflows/ig-dm-deploy.yml` (run #17 first success, #18 graph.instagram.com fix)
- **Graph endpoint**: `https://graph.instagram.com/v19.0` (was incorrectly `graph.facebook.com`, fixed mid-session)
- **Keyword routing**: 23 keywords active (BILGI/INFO/AUDIT/DEMO + 19 sector/asset)

### GitHub Secrets (configured today)
Required for ig-dm-deploy workflow:
- `HETZNER_SSH_PRIVATE_KEY` (ed25519 priv key from `~/.ssh/aanloop-ig-dm`)
- `HETZNER_SSH_USER` = root
- `HETZNER_HOST` = 178.104.100.94
- `META_PAGE_ACCESS_TOKEN` (pre-existing)
- `IG_USER_ID` (pre-existing)
- `IG_WEBHOOK_VERIFY_TOKEN` (random 64-hex, stored in GH secret only)
- `IG_APP_SECRET`

### Meta App webhook
- Verify token synced to match GitHub secret (user did this in browser)
- Webhook URL: `https://ig-dm.aanloopai.nl/webhook`
- Subscriptions required: `messages, comments, mentions, story_mention`

### Cron schedules (relevant workflows)
- `ig-publish.yml`: 07:00 + 08:00 + 15:00 + 16:00 UTC (= 09:00 + 10:00 + 17:00 + 18:00 CET DST-safe)
- `ig-stories-publish.yml`: 09:00 + 10:00 + 17:00 + 18:00 UTC (= 11:00 + 12:00 + 19:00 + 20:00 CET)
- `ig-reels-publish.yml`: Mon/Wed/Fri 07:00 + 08:00 UTC
- `ig-dm-deploy.yml`: push-trigger on `scripts/ig-dm-bot.mjs`, `marketing/instagram/dm-templates.json`, `deploy/ig-dm/**`

### Monitoring
- Routine: `trig_017tLEaXEfFer7ntwXkjvcm3` (Anthropic cloud, hourly 07:07-20:07 UTC, ~98 fires over 7 days)
- Polls: `ig-dm.aanloopai.nl/health` + last `ig-dm-deploy.yml` run
- Alerts: WARN if workflow=failure OR replied stuck 24h+ post-launch; FAIL if health 5xx
- Output: claude.ai/code/routines + push-notification on anomaly

## Wave-6 Content Inventory

**Total**: 32 posts × 4 weeks (8 per week, Mon-Sat 09:00 + 17:00 mix)

### Week-1 (2026-05-26 → 2026-05-31) — Sector-photos kickoff
- w6-p00-launch-kickoff (2026-05-25 17:00 — TONIGHT, special intro)
- w6-p01-horeca-busy-20u (Marco, restaurant)
- w6-p02-tandarts-spreekkamer (Emma, zorg)
- w6-p03-webshop-midnight (Emma, 24/7 retail)
- w6-p04-accountant-deadline (Marco, accountancy)
- w6-p05-bouw-avond-truck (Marco, bouw)
- w6-p06-zorg-huisarts-druk (Marco, triage)
- w6-p07-logistiek-scanner (Emma, TMS)
- w6-p08-vastgoed-open-house (Marco, real estate)

### Week-2 (2026-06-02 → 2026-06-07) — BTS-thema
- w6-b06 office-morning-vibe (INKIJK keyword)
- w6-b01 founder-desk-morning (FOUNDER)
- w6-b02 team-headset-call (DEMO)
- w6-b03 code-review-pair (BLAUWDRUK)
- w6-b04 team-standup-whiteboard (FAALMODES)
- w6-p09 retail-checkout (WHATSAPP)
- w6-b07 kennisbank-prep-docs (KENNISBANK)
- w6-p10 team-growth-celebrate (PROOF)

### Week-3 (2026-06-09 → 2026-06-14) — More sector + BTS
- w6-p11 horeca-bartender-detail, w6-p15 bouw-foreman-site
- w6-b05 customer-onboarding-intake
- w6-p12 zorg-fysio-treatment, w6-p17 logistiek-driver-cabin
- w6-p14 accountant-client-meeting, w6-p16 vastgoed-keys-handover
- w6-b08 friday-retro-team

### Week-4 (2026-06-16 → 2026-06-21) — 2 new + 6 angle-shift reuse
- w6-p13 webshop-warehouse-picking, w6-p18 retail-customer-purchase
- w6-w4-* (6 reuse-slots namespace'd to avoid ID-collision)

## AI Photo Library (Imagen-4)

**Total**: 26 unique PNG via Imagen-4 (`imagen-4.0-generate-001`)
**Cost**: ~$1.04 total (26 × $0.04)
**Location**: `public/social-feed/ai-images/w6-*.png`
**Resolution**: 1080×1080 (1:1)
**File sizes**: 0.9-1.6 MB per PNG

**Scene categories** (in `scripts/gen-ai-image.py` NL_MKB_SCENES list, category="wave6"):
- 18 sector-scenes (horeca×3, zorg×3, webshop/retail×4, accountancy×2, bouw×2, vastgoed×2, logistiek×2)
- 8 BTS-scenes (founder, team, code, standup, office, kennisbank, onboarding, retro)

**Prompt-style**: Documentary photography, NL/Dutch authentic, no text-in-image, brand-overlay via IG-caption only.

## DM-Template Keywords (in `dm-templates.json` `dm_assets`)

23 total active routing keywords (commit `47332ac` ile 13→23 yapildi):

**Generic** (4): BILGI, INFO, AUDIT, DEMO
**Sector** (9, Wave-5 Hafta-1/2 era): HORECA, ZORG, PROMPT, AVG, EMMA, FOUNDER, CIJFERS, AIDUUR, MARCO
**Sector** (10, Wave-5 Hafta-3/4 era): WHATSAPP, ACCOUNTANCY, PRAKTIJK, NOJAAR, BOUW, HANDOVER, LOGISTIEK, KENNISBANK, RETRO, FAALMODES

Wave-6 introduces additional virtual keywords used in captions (route to existing dm_assets[KEYWORD] or fallback to generic 'comment'): INKIJK, BLAUWDRUK, PROOF.

**PDFs library** (`public/dl/*.pdf`): 17 lead-magnets, brand-strict A4, reportlab-rendered via `scripts/render-dm-asset-pdfs.py`.

## Validator Bug Fix (carousel-format)

`scripts/validate-ig-schedule.mjs` had a Wave-2-only `if (!post.image)` check that rejected all Wave-5 carousel posts (which use `slides[]` array instead). Fixed in commit `ca8c7aa`:

```js
const isCarousel = post.format === "carousel";
if (isCarousel) {
  // slides[] of length 2-10, each file must exist
} else if (!post.image) {
  err(id, "missing image");
} else {
  // existing single-image check
}
```

**Note**: validator regex `^wave-\d+-schedule\.json$` does NOT match `wave-N-weekM-schedule.json` files. Publisher uses broader regex `^wave-\d+(-week\d+)?-schedule\.json$`. Future-improvement: relax validator regex to match.

## Pending User-Actions

1. **Tonight cron-fire monitoring** (passive): 15:00 UTC ig-publish.yml fires; should auto-publish w6-p00-launch-kickoff via Meta Graph API. If fails, manual dispatch from GH UI.
2. **Manual sticker placement** for any stories that publish: ig-stories-publish.yml outputs require operator sticker-overlay in IG-app within 5-10 min of publish.
3. **Tomorrow morning 09:00 CET**: w6-p01-horeca-busy-20u auto-fires (note: caption says "Vrijdagavond" but tomorrow is Tuesday — minor disconnect, user said OK to leave).
4. **CF Pages dashboard** (optional): promote latest preview deployment if PDFs need to be live on aanloopai.nl (handled by separate deploy workflow).

## Memory Updates

- [aanloop_ig_wave6_2026-05-25.md] CREATED (Wave-6 launch state)
- [aanloop_ig_wave5_2026-05-25.md] UPDATED (BLOCKER resolved, then CANCELLED)
- [MEMORY.md] UPDATED (Wave-5 marked cancelled + Wave-6 entry added)

## Out of Scope (future sessions)

- Wave-6 reels/carousels (currently all single-image; format-variety can be added in Wave-7)
- Week-4 reuse-slots could be regenerated with new Imagen-4 scenes if budget allows
- A/B compare Wave-3 vs Wave-6 first-72h IG-metrics (after Week-2 onset)
- Hetzner deployment runbook documentation (DEPLOYMENT.md, optional)
- Validator regex extension to auto-include week-files
