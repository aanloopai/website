# SESSION 2026-05-25 — Wave-5 IG Content Refresh (4-Week, 104 Assets) — COMPLETE

**Status**: RESUME-READY. 4 master commits pushed. Cron auto-publish starts Mon 2026-05-26 09:00 CET.

## What happened (chronological)

User feedback opening: *"postlar hemen hemen ayni, harekete gecirici degil. Resim ve video uretmeni istiyorum bundan sonrakiler."*

Then: *"detayini soyleme, uzman marketingci ol, butun pazarlama tekniklerini uygula, rakipleri arastir, farkliliklarimizi on plana cikartacak strateji ve postlar yap."*

### Strategy (research-based, 3 parallel agents)

3 background agents launched in parallel:
1. **Competitor IG research** — what AI-agency content drives engagement in 2026
2. **B2B engagement best-practices** — IG algo signals, formats, hooks, CTAs
3. **Aanloop diferansiyel extraction** — mining own site + memory for unique angles

Synthesis → 5-pillar content plan:
- **P1 Diferansiyel/Contrarian** 25% — "geen jaarcontracten", "AI agencies lying", anti-vendor-lock-in
- **P2 Founder POV (Mustafa)** 20% — first-person, Rotterdam origin, weekly learnings
- **P3 Sector deep** 25% — horeca/zorg/advocaat/vastgoed/accountancy/webshop/bouw/logistiek
- **P4 Educational micro-tip** 15% — prompt-engineering, WhatsApp-setup, AI-readiness, handover-flow, kennisbank-prep
- **P5 BTS/Proof** 15% — data-viz, Marco-Lite case, EU AI Act countdown, Wave-5 retro

Algo-optimization: comment-to-DM (30-70% open vs link-in-bio 0.5-2%), voice-note DM follow-up (90% open), interactive Story stickers (+24-28% eng).

### Pipeline built

**Renderers (Python, brand-strict Navy + Pearl + 4-accent + Segoe):**
- `scripts/render-ig-carousel.py` — **7 templates** registry: before-after, step-framework, data-viz, benchmark, faq, social-proof, objection-destroyed. Multi-slide 1080x1080 PNG sets per spec.
- `scripts/render-ig-story.py` — **5 templates**: poll-prompt, quiz-prompt, question-box, slider-countdown, tap-reveal. 1080x1920 9:16 backgrounds with sticker-zone hints (operator drops live IG sticker post-publish).
- `scripts/render-ig-reel.py` — **+3 templates** (vox-pop, split-screen-product, meme-pov) added to existing 6 (hook-card, talking-stat, quote-reveal, before-after, ken-burns, chat-reveal) = **9 total**.

**Publishers (Node.js):**
- `scripts/ig-publish.mjs` — extended with CAROUSEL media_type + per-slot `story_image` override field.
- `scripts/ig-publish-story.mjs` — NEW standalone publisher for 9:16 native stories.
- All publishers' `resolveSchedulePath` regex extended to support `wave-N-weekM-schedule.json` AND legacy `wave-N-schedule.json`, sorted by wave then week.

**GitHub Actions:**
- `.github/workflows/ig-stories-publish.yml` — NEW cron 11:00 + 19:00 CET (DST-safe dual-entries).

**DM-router infrastructure:**
- `marketing/instagram/dm-templates.json` — added `dm_assets[KEYWORD]` section with 9 keyword-specific response variants (2 rotation-variants each). UTM-tagged per keyword.
- `scripts/ig-dm-bot.mjs` — `pickTemplate(kind, keyword?)` now keyword-aware. `handleComment` passes matched keyword. KEYWORDS env default extended.
- `marketing/instagram/dm-assets/README.md` — operator asset library guide.
- `scripts/dm-voice-note-library.md` — 10 founder voice-script templates for msg 6+ DM follow-up.

**Lead-magnet PDFs (reportlab):**
- `scripts/render-dm-asset-pdfs.py` — 5 brand-strict A4 PDF generator. Reads carousel spec from wave-5 schedule.
- `public/dl/horeca-faq.pdf`
- `public/dl/zorg-compliance-checklist.pdf`
- `public/dl/prompt-framework.pdf`
- `public/dl/avg-ai-checklist.pdf`
- `public/dl/mkb-ai-cijfers-2026.pdf`

**Operator handoff:**
- `marketing/instagram/WAVE5-REDEPLOY-NOTES.md` — Cloudflare promote + Hetzner redeploy + keyword routing test + monitoring playbook + rollback.
- `.gitattributes` — binary marker for *.pdf/*.png/*.mp4/etc.

### Content output (104 assets across 4 weeks)

| Week | Dates | Carousel | Reel | Story | Total |
|------|-------|----------|------|-------|-------|
| 1 | 2026-05-26 → 06-01 | 7 (w5-c01..07) | 5 | 14 | 26 |
| 2 | 2026-06-02 → 06-08 | 7 (w5-c08..14) | 5 | 14 | 26 |
| 3 | 2026-06-09 → 06-15 | 7 (w5-c15..21) | 5 | 14 | 26 |
| 4 | 2026-06-16 → 06-22 | 7 (w5-c22..28) | 5 | 14 | 26 |
| **TOTAL** | 4 weeks | **28 carousels** (~210 slides) | **20 reels** | **56 stories** | **104** |

All rendered + committed to `public/social-feed/{carousel,reels,stories}/`.

### Schedules (12 JSON files)

- `marketing/instagram/wave-5-schedule.json` (Week 1 carousel)
- `marketing/instagram/wave-5-reels-schedule.json` (Week 1 reels)
- `marketing/instagram/wave-5-stories-schedule.json` (Week 1 stories)
- `marketing/instagram/wave-5-week2-schedule.json` (Week 2 carousel)
- `marketing/instagram/wave-5-week2-reels-schedule.json` (Week 2 reels)
- `marketing/instagram/wave-5-week2-stories-schedule.json` (Week 2 stories)
- `marketing/instagram/wave-5-week3-schedule.json` (Week 3 carousel)
- `marketing/instagram/wave-5-week3-reels-schedule.json` (Week 3 reels)
- `marketing/instagram/wave-5-week3-stories-schedule.json` (Week 3 stories)
- `marketing/instagram/wave-5-week4-schedule.json` (Week 4 carousel)
- `marketing/instagram/wave-5-week4-reels-schedule.json` (Week 4 reels)
- `marketing/instagram/wave-5-week4-stories-schedule.json` (Week 4 stories)

### Commits (4 total, all pushed to master)

1. `cd327cd` — Week 1 pipeline + 26 assets
2. `09cb65c` — DM keyword routing + 9 keyword templates
3. `390ff26` — Week 2 21 assets + 5 PDFs + redeploy notes + .gitattributes
4. `2e92e1b` — Week 3 + Week 4 = 42 assets

Final master HEAD: **`2e92e1b`** at https://github.com/aanloopai/website

---

## RESUME-NEXT: What's pending

### High-priority (user-action or external)

1. **Hetzner DM-bot redeploy** — `dm-templates.json` + `ig-dm-bot.mjs` changed. Auto-deploy via `.github/workflows/ig-dm-deploy.yml` should fire on push. Verify in GitHub Actions tab. Manual fallback:
   ```bash
   ssh root@178.104.100.94
   cd /opt/ig-dm && git pull
   bash deploy/ig-dm/install.sh
   sudo systemctl restart aanloop-ig-dm
   sudo systemctl status aanloop-ig-dm
   ```

2. **Cloudflare Pages promote** — `public/dl/*.pdf` + `public/social-feed/*` rendered, committed. Deploy uses `wrangler versions upload` (preview-only). User must promote preview → production on Cloudflare dashboard so `aanloopai.nl/dl/horeca-faq.pdf` works.

3. **Keyword routing E2E test** — From test IG account, DM each keyword (HORECA, ZORG, PROMPT, AVG, EMMA, FOUNDER, CIJFERS, AIDUUR, MARCO) and verify auto-reply DM + correct PDF link.

### Medium-priority (assistant work, next sessions)

4. **Week 3-4 new keyword templates** — Captions reference 10 new keywords not yet in `dm_assets[]`: WHATSAPP, ACCOUNTANCY, PRAKTIJK, NOJAAR, BOUW, HANDOVER, LOGISTIEK, KENNISBANK, RETRO, FAALMODES. Currently fall back to generic 'comment' template. Add specific routing for higher conversion.

5. **Optional ek PDFs** — `emma-roadmap.pdf`, `waarom-uitstel.pdf`, `bouw-faq.pdf`, `handover-flow.pdf` (referenced in Week 3-4 DM templates).

### Low-priority (after launch)

6. **A/B compare metrics** — Wave-3 baseline vs Wave-5 ilk-72h: reach, saves, comment-velocity, DM-sends, booked-calls.

7. **Wave-6 planning** — Based on Wave-5 retro slide (w5-c27): more carousels, faster DM-to-booking flow, better Story cliffhangers.

---

## Resume-prompt suggestion

When restarting, say:
> "wave-5 pending kalanlari devam et — once hetzner redeploy + cloudflare promote durumu kontrol, sonra hafta 3-4 yeni 10 keyword icin dm_assets templates ekle"

Memory will auto-load `aanloop-ig-wave5-2026-05-25.md` and this session-state file is here for full context.

---

## Files inventory (this session)

**Created (15 source files)**:
- `scripts/render-ig-carousel.py`
- `scripts/render-ig-story.py`
- `scripts/ig-publish-story.mjs`
- `scripts/render-dm-asset-pdfs.py`
- `scripts/dm-voice-note-library.md`
- `marketing/instagram/dm-assets/README.md`
- `marketing/instagram/WAVE5-REDEPLOY-NOTES.md`
- `.github/workflows/ig-stories-publish.yml`
- `.gitattributes`
- 6 × `marketing/instagram/wave-5-week2/3/4-{,reels-,stories-}schedule.json`
- 3 × `marketing/instagram/wave-5-{,reels-,stories-}schedule.json`

**Modified (4 source files)**:
- `scripts/ig-publish.mjs` (carousel + story_image support + regex extend)
- `scripts/ig-publish-reel.mjs` (regex extend)
- `scripts/render-ig-reel.py` (+3 templates)
- `scripts/ig-dm-bot.mjs` (keyword-aware pickTemplate + KEYWORDS extended)
- `marketing/instagram/dm-templates.json` (dm_assets section + 9 keywords)

**Rendered output (committed)**:
- 28 carousel directories, ~210 slide PNGs
- 56 story PNGs (1080x1920)
- 20 reel MP4s
- 5 lead-magnet PDFs
