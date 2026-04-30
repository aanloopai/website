# Aanloop AI — Social Media Automation: TODO

> **Spec:** `docs/superpowers/specs/2026-04-30-social-media-automation-design.md`
> **Implementation root:** `automation/social/`
> **Started:** 2026-04-30

---

## Phase 0 — User Setup (USER ACTIONS REQUIRED)

Tüm bu adımları kullanıcı yapmalı, otomatize edilemez (platform doğrulamaları kişisel).
Detay rehber: `automation/social/docs/USER-ACTION-CHECKLIST.md`

- [ ] LinkedIn kişisel hesap oluştur/doğrula (`info@aanloopai.nl`)
- [ ] LinkedIn Company Page oluştur ("Aanloop AI", KVK 88606902)
- [ ] LinkedIn cookies (li_at, JSESSIONID) browser'dan al → `.env`
- [ ] Instagram @aanloopai → Business account'a convert
- [ ] Facebook Page "Aanloop AI" oluştur
- [ ] Instagram Business → Facebook Page'e bağla (bu zorunlu)
- [ ] X account `@aanloopai` aç + Developer free tier başvuru
- [ ] TikTok Business account `@aanloopai` aç
- [ ] YouTube Brand Channel "Aanloop AI" oluştur
- [ ] Telegram bot oluştur (BotFather) → token al
- [ ] Telegram chat ID öğren (@userinfobot)
- [ ] Anthropic API key (console.anthropic.com)
- [ ] (Opsiyonel) fal.ai API key
- [ ] (Opsiyonel) ElevenLabs API key
- [ ] Google Cloud project + YouTube Data API v3 + OAuth credentials
- [ ] n8n self-hosted URL ve admin login Claude'a verilir

---

## Phase 1 — Foundation (Day 1-3)

- [x] Spec dokümanı yazıldı
- [x] `automation/social/` klasör yapısı kuruldu
- [x] `tasks/todo.md` (bu dosya)
- [ ] `automation/social/data/services.json` — 15 servis
- [ ] `automation/social/data/sectors.json` — 11 sektör
- [ ] `automation/social/data/tips.json` — 50+ NL MKB AI tip
- [ ] `automation/social/data/calendar.csv` — 90 günlük takvim seed
- [ ] `automation/social/prompts/brand-voice.md` — sistem prompt'u
- [ ] `automation/social/prompts/pillar-news.md`
- [ ] `automation/social/prompts/pillar-sector.md`
- [ ] `automation/social/prompts/pillar-tip.md`
- [ ] `automation/social/prompts/pillar-service.md`
- [ ] `automation/social/prompts/pillar-longform.md`
- [ ] `automation/social/.env.example` — secret template
- [ ] `automation/social/workflows/01-content-calendar-trigger.json`
- [ ] `automation/social/workflows/02-content-generator.json`
- [ ] `automation/social/workflows/03-asset-generator.json`
- [ ] `automation/social/workflows/04-telegram-approval.json`
- [ ] Smoke test: 1 platform (Instagram) end-to-end manuel onayla

---

## Phase 2 — Distribution (Day 4-7)

- [ ] `automation/social/workflows/05-multi-distributor.json`
- [ ] `automation/social/docs/COOKIE-REFRESH-RUNBOOK.md`
- [ ] LinkedIn community node test (cookie auth)
- [ ] IG + FB + X branches test
- [ ] Smoke test: 4 platform parallel

---

## Phase 3 — Video & Reels (Week 2)

- [ ] FFmpeg slideshow workflow
- [ ] ElevenLabs TTS integration (NL + EN)
- [ ] YouTube Data API integration
- [ ] TikTok Drive-drop runbook
- [ ] First video: "Marco AI Sekreter — 60sn explainer"

---

## Phase 4 — Analytics + Loop (Week 3)

- [ ] `automation/social/workflows/06-analytics-collector.json`
- [ ] `automation/social/workflows/07-error-alert.json`
- [ ] Google Sheet dashboard
- [ ] Weekly Telegram report

---

## Phase 5 — Optimization (Week 4+)

- [ ] LinkedIn Marketing API başvuru takibi
- [ ] TikTok Content API başvuru (1K+ follower olunca)
- [ ] A/B test framework
- [ ] "Bu siteyi kendi otomasyonumuzla yönetiyoruz" landing (`/case-aanloop`)

---

## Lessons / Decisions Log

- **2026-04-30:** Platform set tam paket (LinkedIn + IG + FB + X + TikTok + YouTube) seçildi — kullanıcının "AI Social Media Agent" ürünüyle dogfooding tutarlılığı için
- **2026-04-30:** İçerik kadansı C: orta + günlük onay seçildi — kalite > hız
- **2026-04-30:** TikTok Phase 1'de manuel upload — Content Posting API yeni hesap için zor
- **2026-04-30:** LinkedIn Phase 1'de community node + cookie auth — Marketing API onayı uzun sürer
- **2026-04-30:** Brand voice extraction `BRAND-GUIDELINE.md` + knowledge-base-sam.txt'ten yapıldı
