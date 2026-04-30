# Aanloop AI — Social Media Automation: Design Spec

**Tarih:** 2026-04-30
**Sahibi:** Aanloop AI (KVK 88606902)
**Yazar:** Claude (Opus 4.7)
**Statü:** Approved by user (autonomous decisions delegated 2026-04-30)

---

## 0. TL;DR

Aanloop AI'nin **kendi self-hosted n8n** altyapısı üzerinde, 6 sosyal medya platformuna (LinkedIn Company Page, Instagram, Facebook, X, TikTok, YouTube) günlük içerik üreten, görsel/video oluşturan, **Telegram üzerinden günlük onay** alan ve yayınlayan bir otomasyon sistemi. NL ana dil, EN destek dili. Tahmini aylık maliyet: **€25-45** (yalnız Claude API + isteğe bağlı görsel/video AI). Bu otomasyon aynı zamanda Aanloop'un sattığı **"AI Social Media Agent"** ürününün canlı bir vitrin/case study'sidir.

---

## 1. Bağlam ve Problem

**Mevcut durum (audit'ten):**
- Site: `aanloopai.nl` (Astro v4 + Cloudflare), TTFB 73ms — altyapı sağlam
- Blog: 6 yazı listeli, **hepsi 404** → sıfır organik trafik
- Analytics: GA4/Plausible **yok** → veri körlüğü
- Sosyal medya: Instagram **@aanloopai** açık (boş), diğerleri **yok**
- Müşteri sayısı: 0 (yeni şirket, 2026 kuruldu)
- Satılan ürün: **AI Social Media Agent** (€900-€2,200) → kendi şirketi için kurmamış olmak ciddi tutarsızlık

**Problem:** Aanloop AI'nin Hollanda B2B pazarında (MKB + ZZP) farkındalık ve güven inşa etmesi gerekiyor. Manuel sosyal medya yönetimi:
- Pahalı (ajansa €1,500-3,000/ay) veya zaman alıcı (haftada 8-12 saat)
- Yeni AI ajansının pazarladığı çözümle çelişiyor (kendi söylediğini yapmıyor)
- Yavaş ölçekleme — 6 platform × günlük post = sürdürülemez

**Çözüm:** AI-driven, Telegram-onaylı, n8n-orchestrated tam otomasyon. Aanloop'un kendi USP'lerini (self-hosted n8n, AVG-compliant, EU data) somutlaştırır.

---

## 2. Hedefler ve Hedef-Olmayanlar

### 2.1 Hedefler (Goals)

| # | Hedef | Ölçüm |
|---|---|---|
| G1 | Haftada en az 22 post + 1 video, 6 platformda | Otomatik post counter / Google Sheet |
| G2 | İçerik üretiminden yayına insan emeği ≤ 5 dk/gün (sadece onay) | Telegram digest süresi ≤ 5 dk |
| G3 | Brand voice tutarlılığı — NL doğal, professional, B2B | Aylık manuel spot kontrol (10 random post) |
| G4 | Aylık maliyet ≤ €50 | Cost dashboard (Claude+fal.ai+TTS faturaları) |
| G5 | 90 günde site organik trafik artışı %50+ (UTM tracking) | GA4 / Plausible source=social |
| G6 | LinkedIn Company Page 90 günde 200+ follower | LinkedIn analytics |
| G7 | Sistem **kendi pazarladığımız ürünün canlı demosu** olmalı — case study'ye dönüştürülebilir | "Bu siteyi kendi otomasyonumuzla yönetiyoruz" sayfası |

### 2.2 Hedef-olmayanlar (Non-goals)

- DM ve yorum yanıtlama (Phase 2'de "AI Social Media Agent" V2 olarak ayrı kapsam)
- Ücretli reklam / boost / influencer takibi
- TikTok'ta viral kısa video AI üretimi (Phase 1'de basit slideshow + voiceover)
- Çok dilli A/B test (sadece NL ve EN)
- Real-time trend jacking (haftalık RSS içeriği yeterli)
- CRM ile lead bağlama (HubSpot/Pipedrive entegrasyonu sonraki sprint)

---

## 3. Mimari (High-Level Architecture)

```
                        ┌──────────────────────────────────┐
                        │  Daily Trigger (n8n cron 07:30)  │
                        │  Pillar selector by weekday      │
                        └────────────────┬─────────────────┘
                                         │
                ┌────────────────────────▼─────────────────────────┐
                │  Content Pipeline                                 │
                │  ├─ Pillar router (Mon/Tue/Wed/Thu/Fri)          │
                │  ├─ Data fetcher (services.json / sectors.json /  │
                │  │   AI news RSS)                                  │
                │  ├─ Claude content generator (NL + EN variants)   │
                │  ├─ Platform formatter (length/hashtags per       │
                │  │   platform)                                     │
                │  └─ Asset generator (image always, video weekly)  │
                └────────────────┬─────────────────────────────────┘
                                 │
                ┌────────────────▼─────────────────────────────────┐
                │  Approval Gate (Telegram bot, 09:00 NL)           │
                │  Daily digest message:                            │
                │   • per-platform preview (text + image/video)     │
                │   • inline buttons: ✅ Approve  ✏️ Edit            │
                │     ❌ Skip  🔁 Regenerate                         │
                │  Stores decisions in n8n queue (Redis/static JSON)│
                └────────────────┬─────────────────────────────────┘
                                 │
                ┌────────────────▼─────────────────────────────────┐
                │  Multi-Platform Distributor (parallel branches)  │
                │  ├─ LinkedIn Company Page (community node, NL)    │
                │  ├─ Instagram Business (Graph API, NL)            │
                │  ├─ Facebook Page (Graph API, NL)                 │
                │  ├─ X (API v2 free, EN)                           │
                │  ├─ TikTok (Drive drop + push notif → manual, NL) │
                │  └─ YouTube (Data API v3, weekly Shorts, EN)      │
                └────────────────┬─────────────────────────────────┘
                                 │
                ┌────────────────▼─────────────────────────────────┐
                │  Logger + Analytics                               │
                │  ├─ Per-post Google Sheet row                     │
                │  ├─ Weekly stats sweep (reach/engage)             │
                │  └─ Error → Telegram alert                        │
                └──────────────────────────────────────────────────┘
```

**Stack:**
- **Orchestrator:** n8n (self-hosted, mevcut Hetzner sunucu)
- **LLM:** Anthropic Claude (Haiku 4.5 draft → Sonnet 4.6 final pass)
- **Görsel:** fal.ai `flux-schnell` (€0.003/img) veya bedava: brand template + Sharp.js overlay
- **Video (Phase 1):** FFmpeg slideshow (3-4 image + ElevenLabs TTS NL/EN, 30-60sn 9:16)
- **Onay:** Telegram bot (Telegram Bot API, ücretsiz)
- **Storage:** n8n native + Google Drive (asset arşivi) + Google Sheet (audit trail)
- **Secrets:** n8n credentials store (mevcut)

---

## 4. İçerik Direkleri (Content Pillars) ve Takvim

5-günlük rotasyon, NL ana hedef:

| Gün | Direk | İçerik kaynağı | Platformlar | Dil |
|---|---|---|---|---|
| **Mon** | AI News & Aanloop Take | RSS (TechCrunch, AI News, Bright NL, NRC tech) → Claude yorumlu | LinkedIn, IG, FB, X | NL (X→EN) |
| **Tue** | Sector Spotlight | `sectors.json` (11 sektör rotasyon) | LinkedIn, IG, FB, X | NL (X→EN) |
| **Wed** | Practical Tip | Curated tip bank (50+ NL MKB AI tip) | LinkedIn, IG, FB, X | NL (X→EN) |
| **Thu** | Service Spotlight | `services.json` (15 servis rotasyon) | LinkedIn, IG, FB, X | NL (X→EN) |
| **Fri** | Long-form Thought Leadership | Claude essay 1200-1500 char | LinkedIn (only) | NL |
| **Sat (haftada 1)** | Video — Service/Sector explainer | FFmpeg + TTS, 60sn 9:16 | YouTube Shorts (EN), IG Reels (NL), TikTok manual (NL) | NL/EN |
| **Sun** | Skip / repurpose top performer | Önceki haftanın en iyi post | n/a | n/a |

**Aylık post hacmi:** ~22 yazı × 4 hafta = **88 yazı** + **4 video**
**LinkedIn:** 5/hafta = 20/ay (en yoğun, B2B core)
**IG/FB:** 3/hafta = 12/ay
**X:** 4/hafta = 16/ay (X API free 500/ay limitinin %3'ü)
**TikTok:** 1/hafta = 4/ay (manuel)
**YouTube:** 1/hafta = 4/ay

---

## 5. Brand Voice (Prompt Spine)

`BRAND-GUIDELINE.md` + `aanloop-ai-knowledge-base-sam.txt`'ten çıkarılan.

```
ROL: Aanloop AI'nin sosyal medya içerik üreticisisin. Marka sesi:

DURUŞ:
- Sıcak ama profesyonel — Hollanda iş kültürü tonu (zakelijk maar warm)
- Pratik, somut — soyut iddia yok
- B2B karar vericilere (CEO/CFO/CTO MKB) hitap — abartısız, datasal
- "Wij" (biz) — Rotterdam'lı tim olarak konuşuruz, "ik" değil

YAPILACAKLAR:
- Her postu somut bir iş faydasına bağla (saat tasarrufu, € tasarruf, conversion artışı)
- Sayı ver: "8 dagen tot live", "€2,500/ay tasarruf", "%40 az no-show"
- Hollanda örnekleri: "Een Rotterdamse webshop", "Een advocatenkantoor in Utrecht"
- KVK 88606902 ve "self-hosted in Nederland" güven sinyallerini doğal şekilde işle
- Tagline'ı periyodik kullan: "AI die je werk doet, zodat jij kunt groeien."

YAPILMAYACAKLAR:
- ChatGPT/AI hype dili — "revolutionary", "game-changing", "unleash"
- US-style ünlem yağmuru, emoji aşırılığı (max 1-2 emoji per post, NL kültür)
- Generik AI'tic söylem — "AI is the future" tipi
- Müşteri olmamış case study uydurma — gerçek case yoksa "voorbeeldscenario" diye işaretle
- "Geweldig", "fantastisch" gibi pazarlamacı ünlemleri
- Almanca veya Belçika Hollandacasıyla karışık ton

UZUNLUK:
- LinkedIn günlük: 600-900 karakter, son satır CTA
- LinkedIn long-form (Cuma): 1200-1500 karakter, 3-4 paragraf, scannable
- Instagram caption: 200-400 karakter + 5-8 hashtag
- Facebook: 300-500 karakter
- X: 270 karakter (link + hashtag dahil)
- TikTok caption: 100-200 karakter + 3-5 hashtag
- YouTube Shorts title: 60 karakter, description 200 karakter

HASHTAG SETİ (sabit):
NL: #AIvoorMKB #AIvoorOndernemers #Rotterdam #AIagency #n8n #automatisering
EN: #AIforSMB #DutchAI #AIagency #AIautomation #n8n #aiAgents

CTA ROTASYONU (Cuma uzun yazılar dışında her postta 1 tane):
1. "Plan een gratis demo van 15 minuten → aanloopai.nl"
2. "ROI calculator op aanloopai.nl — bereken in 30 sec"
3. "Welke taak kost jou de meeste tijd? Reageer hieronder."
4. "Stuur een DM voor een use case in jouw sector."
5. "Bekijk de oplossing op aanloopai.nl/diensten/"

UTM:
Tüm site link'lere `?utm_source={platform}&utm_medium=social&utm_campaign={pillar}_{YYYYMMDD}`
```

---

## 6. Komponentler (n8n Workflow'ları)

7 ayrı workflow JSON, hepsi import-ready:

### 6.1 `01-content-calendar-trigger.json`
- **Trigger:** Cron — günlük 07:30 NL (Europe/Amsterdam)
- **Logic:** Bugünün gününü oku → pillar route et → state'i diğer workflow'a webhook ile yolla
- **Output:** `{ pillar, weekday, date, target_platforms[] }`

### 6.2 `02-content-generator.json`
- **Input:** Pillar payload
- **Steps:**
  1. Veri çek (RSS / services.json / sectors.json / tips.json)
  2. Claude Haiku 4.5 ile NL draft (cheap pass)
  3. Claude Sonnet 4.6 ile final polish + EN translate (X/YouTube)
  4. Platform-specific formatter (uzunluk, hashtag, CTA)
  5. Asset gen webhook tetikle
- **Cache:** Aynı gün için tekrar çağrılırsa cached payload dön
- **Output:** Per-platform `{ text, hashtags, cta_url, image_prompt, lang }`

### 6.3 `03-asset-generator.json`
- **Image (her gün):**
  - Brand color overlay (`#0F172A` arkaplan + `#4338CA/#E11D48/#D97706/#047857` accent stripe)
  - Logo bottom-left, başlık quote tipografisi
  - Tool: Sharp.js veya `n8n-nodes-image` veya fal.ai flux-schnell prompt
  - Format: 1080×1080 (FB/IG/LI/X) + 1080×1920 (IG Story/Reels cover)
- **Video (haftalık, Sat):**
  - Storyboard 3-act: Problem → AI agent → Result
  - 4 görsel kart × 15sn
  - ElevenLabs TTS narration (NL voice "Lotte", EN voice "Adam")
  - Captions burned in (FFmpeg `drawtext`)
  - Brand intro/outro 3sn
- **Output:** Drive URL + base64 fallback

### 6.4 `04-telegram-approval.json`
- **Trigger:** content + asset hazır → 09:00 NL Telegram digest
- **Format:**
  ```
  📅 Vrijdag 1 Mei — Pillar: Service Spotlight (Marco AI Sekreter)

  📱 LinkedIn (NL, 720 chars) [👁️ Preview]
  📷 Instagram (NL, 320 chars + image) [👁️ Preview]
  📘 Facebook (NL, 410 chars + image) [👁️ Preview]
  🐦 X (EN, 268 chars) [👁️ Preview]

  [✅ Approve all] [✏️ Edit] [❌ Skip day] [🔁 Regenerate]
  ```
- **Edit flow:** "✏️ Edit LinkedIn" → bot DM'de mevcut metni gösterir, kullanıcı düzeltilmiş metni yazar, bot kayıt eder
- **Default action:** 11:00'a kadar onay yoksa → otomatik skip + uyarı

### 6.5 `05-multi-distributor.json`
- **Trigger:** Approval received
- **Parallel branches:**
  - `LinkedIn → linkedin-community-node` (cookie auth, Company Page urn)
  - `Instagram → IG Graph API /media + /media_publish`
  - `Facebook → FB Graph API /feed`
  - `X → twitter-v2-node POST /2/tweets`
  - `TikTok → Drive upload + Telegram push: "TikTok hazır, 60sn'de mobil app'ten yükle"`
  - `YouTube (only Sat) → YT Data API videos.insert`
- **Retry:** 3 deneme exponential backoff
- **Logging:** Her başarı/hata Google Sheet `posts-log` tab'a yaz

### 6.6 `06-analytics-collector.json`
- **Trigger:** Cron — Pazar 18:00 NL haftalık
- **Steps:**
  - LinkedIn Company Page Stats API
  - IG Graph Insights
  - FB Page Insights
  - X Analytics API
  - YT Analytics API
  - TikTok manuel girilen sayılar (Telegram bot weekly form)
- **Output:** Google Sheet `weekly-stats` + Telegram weekly report

### 6.7 `07-error-alert.json`
- **Trigger:** Herhangi bir workflow'da error
- **Action:** Telegram alert + retry queue + 3 başarısızlıktan sonra durdur

---

## 7. Platform-Specific Notlar

### 7.1 LinkedIn Company Page (en zor parça)

**Sorun:** Resmi LinkedIn Marketing Developer Platform onayı haftalar sürer (~50% red).

**Strateji:**
- **Phase 1 (Day 1):** `n8n-nodes-linkedin-community` paketi + cookie auth (`li_at`, `JSESSIONID`). Company Page URN ile post ediliyor. Bu unofficial ama çalışıyor. Risk: cookie 60-90 günde expires → user manuel refresh.
- **Phase 1 paralel:** Marketing Developer Platform başvurusu (developer.linkedin.com → "Apply for API access" → company-verified app)
- **Phase 2 (onay gelince):** Marketing API'ye geç, cookie node'u kaldır.

**Cookie refresh ritüeli:** Aylık Telegram reminder, kullanıcı browser'dan kopyalar, n8n credentials'a yapıştırır.

### 7.2 Instagram + Facebook

- IG **Business** veya **Creator** account zorunlu (kullanıcının convert etmesi gerek)
- IG **Facebook Page**'e **bağlı olmak zorunda** (yoksa Graph API çalışmaz)
- IG Reels Graph API'den yayınlanır (video upload + caption)
- FB Page = Graph API native (kolay)

### 7.3 X (Twitter)

- **API v2 Free tier:** 500 post/ay, 100 read/ay → bizim 16 post/ay yeterli
- Developer account başvurusu birkaç saatte onaylanır
- Image upload: v1.1 media endpoint (free tier'a dahil)

### 7.4 TikTok

- **Content Posting API:** Sandbox approval + "audited app" şartı → yeni hesap için imkansız
- **Phase 1 workaround:** n8n video oluşturur → Drive'a yükler → Telegram bildirir → kullanıcı 60sn'de TikTok mobil app'ten upload
- **Phase 2:** 1000+ follower veya 10K+ view varken Content Posting API başvurusu (daha kolay onay)
- Alternatif: **Publer free tier** (3 social channel) — TikTok scheduler için kullanılabilir

### 7.5 YouTube

- **Data API v3:** 10000 unit/gün quota, 1 video upload = ~1600 unit → günde max 6 (bizim haftada 1, fazlasıyla yeter)
- Channel setup: Brand account, AVG-compliant tanım
- Shorts olarak işaretlenmesi için: 9:16 + ≤60sn + `#Shorts` description'da

---

## 8. Maliyet Modeli (Aylık)

| Kalem | Detay | Tahmin |
|---|---|---|
| n8n hosting | Mevcut self-hosted | €0 |
| Claude API (content gen) | ~88 post × 0.5K input + 1K output × ($3/$15 per 1M token Sonnet 4.6, Haiku draft) ≈ | €8-12 |
| fal.ai görsel | flux-schnell @ €0.003/img × ~26 görsel | €1 |
| ElevenLabs TTS | Free tier 10K char/ay → ~10 video × 200 char yeter | €0 (kalırsa €5/ay Starter) |
| Video gen (Phase 1) | FFmpeg local + n8n native | €0 |
| Video gen (Phase 2 opsiyonel) | fal.ai LTX-Video kısa clip | €10-25 |
| Telegram bot | Free | €0 |
| Google Workspace | Mevcut | €0 |
| Publer (TikTok scheduler, opsiyonel) | Free tier | €0 |
| **TOPLAM Phase 1** | | **€10-15/ay** |
| **TOPLAM Phase 2 (AI video)** | | **€25-45/ay** |

Sıfır maliyetli mod: Claude yerine local Llama (Ollama) + statik görsel template + FFmpeg slideshow → kalite düşer ama ücretsiz.

---

## 9. Faz Planı (Roadmap)

### Phase 0 — User Setup (1 gün, kullanıcı eylemleri)
- LinkedIn kişisel hesap + Company Page açılır (rehber `PLATFORM-SETUP-GUIDES.md`)
- Instagram Business'a convert + FB Page'e bağlama
- Facebook Page açılır
- X Developer account + free tier app
- TikTok Business account
- YouTube Brand Channel
- Telegram bot (BotFather)
- Anthropic API key
- (Opsiyonel) fal.ai API key
- n8n self-hosted URL + admin login Claude'a verilir

### Phase 1 — Foundation (Day 1-3)
- `services.json`, `sectors.json`, `tips.json` data dosyaları
- `brand-voice.md` ve 5 pillar prompt template
- n8n workflow 01-04 (trigger + content gen + asset gen + Telegram approval)
- Telegram bot wire-up
- Smoke test: 1 platform (Instagram) end-to-end manuel onay

### Phase 2 — Distribution (Day 4-7)
- n8n workflow 05 (Multi-Distributor): IG + FB + X branches
- LinkedIn community node (cookie auth)
- Cookie refresh runbook
- Smoke test: 4 platform parallel post

### Phase 3 — Video & TikTok & YT (Week 2)
- FFmpeg slideshow workflow
- ElevenLabs TTS integration
- YouTube Data API integration
- TikTok Drive-drop runbook
- First video: "Marco AI Sekreter — 60sn explainer"

### Phase 4 — Analytics + Loop (Week 3)
- Workflow 06 (Analytics Collector)
- Workflow 07 (Error Alert)
- Google Sheet dashboard
- Weekly Telegram report

### Phase 5 — Optimization (Week 4+)
- LinkedIn Marketing API başvuru takibi
- TikTok Content API başvuru (1K+ follower olduğunda)
- A/B test framework (header variants)
- Auto-replanning: low-engagement post pattern detect

---

## 10. Kullanıcı-Aksiyon Checklist (One-time setup, ~30 dk)

`automation/social/docs/USER-ACTION-CHECKLIST.md` dosyasında detay rehber, ekran-by-ekran. Özet:

1. ☐ **LinkedIn kişisel hesap** doğrula (`info@aanloopai.nl`)
2. ☐ **LinkedIn Company Page** oluştur (Aanloop AI, KVK 88606902)
3. ☐ **Instagram** Business'a convert + FB Page'e bağla
4. ☐ **Facebook Page** oluştur (Aanloop AI)
5. ☐ **X** account `@aanloopai` + Developer free tier
6. ☐ **TikTok** Business account `@aanloopai`
7. ☐ **YouTube Brand Channel** "Aanloop AI"
8. ☐ **Telegram bot** BotFather'da oluştur, token'ı kaydet
9. ☐ **Telegram chat ID**'ni öğren (@userinfobot)
10. ☐ **Anthropic API key** (console.anthropic.com)
11. ☐ **fal.ai API key** (opsiyonel, görsel için)
12. ☐ **ElevenLabs API key** (opsiyonel, free tier yeter)
13. ☐ **n8n admin URL + login** veya API key
14. ☐ **Google Cloud project** + YouTube Data API v3 enable + OAuth credentials
15. ☐ **LinkedIn cookies** (li_at, JSESSIONID) browser'dan al

---

## 11. Riskler ve Mitigasyon

| Risk | İhtimal | Etki | Mitigasyon |
|---|---|---|---|
| LinkedIn cookie expire → posts fail | Orta | Yüksek | Aylık reminder, error → Telegram alert, Marketing API başvuru paralel |
| AI hallucination → yanlış müşteri/case | Düşük | Çok yüksek | Onay gate **zorunlu**, "voorbeeldscenario" disclaimer, gerçek müşteri case'i sadece confirmed olduğunda |
| Brand voice drift | Orta | Orta | Aylık manuel spot kontrol, prompt versiyonlama git'te |
| TikTok Content API onayı gelmez | Yüksek | Düşük | Manuel upload akışı zaten plan, 60sn iş |
| X free tier kullanımı dolar | Düşük | Düşük | 16 post/ay → 500 limitinden uzak |
| GDPR — kullanıcı verileri AI'ya gider | Orta | Yüksek | Sadece public data + brand assets gönderilir, hiçbir müşteri PII yok |
| Aşırı promosyonel ton → engagement düşer | Orta | Orta | 80/20 kuralı promptta — %80 educational/value, %20 CTA |
| n8n self-hosted down | Düşük | Yüksek | UptimeRobot + Telegram alert, fallback Drive draft |

---

## 12. Başarı Metrikleri (90 Gün)

| Metrik | Hedef | Ölçüm |
|---|---|---|
| LinkedIn followers | 200+ | LinkedIn analytics |
| Instagram followers | 300+ | IG insights |
| YouTube subscribers | 50+ | YT analytics |
| Aylık reach (toplam) | 25,000+ | Sheet aggregate |
| CTR site (UTM=social) | %2+ | GA4/Plausible |
| Demo booking from social | 5+ | site form `referrer` |
| Onay süresi | ≤ 5dk/gün | Telegram digest log |
| Aylık maliyet | ≤ €45 | Cost dashboard |
| Sistem uptime | %99+ | UptimeRobot |
| "Bu siteyi kendi otomasyonumuzla yönetiyoruz" landing live | Day 30 | Site /case-aanloop |

---

## 13. Açık Sorular ve Bilinmeyenler

Aşağıdakiler implementasyon sırasında kullanıcıya sorulacak (toplu, bir kerede):

1. **n8n URL?** (örn `n8n.aanloopai.nl` veya IP) — Phase 0 sonu
2. **Hangi e-posta sosyal hesaplar için?** `social@aanloopai.nl` mı, `info@aanloopai.nl` mı?
3. **Telegram chat:** kişisel mi yoksa team grup mu?
4. **Görsel: fal.ai mı, sıfır-maliyet template mi başlangıçta?** — default: template (zero cost), upgrade easy
5. **Cuma long-form: kullanıcı haftalık seed konu verecek mi yoksa Claude tamamen autonomous mu?** — default: autonomous, ay sonu spot kontrol

---

## 14. Spec Self-Review (post-write)

- ✅ Placeholder yok
- ✅ Internal consistency: pillar takvimi ↔ video plan ↔ platform set tutarlı
- ✅ Scope: tek bir implementation plan'a sığar (~3-4 hafta toplam)
- ✅ Ambiguity: language mix net, approval flow net, fallback'ler tanımlı
- ✅ Maliyet açık, "free with caveats" ve "low-cost premium" iki seçenek belirtildi
- ✅ User-action zorunlulukları **tek liste**te toplandı
- ✅ Risks tabloda ihtimalle birlikte
- ✅ Brand voice extraction doğrudan kaynak dosyalardan

---

## 15. Implementation Output Klasörü

```
automation/social/
├── workflows/        ← 7 n8n JSON
├── prompts/          ← brand-voice.md + 5 pillar prompts
├── data/             ← services.json, sectors.json, tips.json, calendar.csv
├── templates/
│   ├── images/       ← brand SVG overlays, ImageMagick scripts
│   └── videos/       ← FFmpeg storyboard + intro/outro
├── docs/
│   ├── SETUP.md                      ← n8n + tüm API'lar nasıl bağlanır
│   ├── USER-ACTION-CHECKLIST.md      ← Phase 0 ekran rehberi
│   ├── PLATFORM-SETUP-GUIDES.md      ← her platform için nasıl yaparım
│   └── COOKIE-REFRESH-RUNBOOK.md     ← LinkedIn aylık ritüel
└── .env.example                      ← tüm token placeholder'lar
```

---

**Spec sona erdi.** Bir sonraki adım: implementation — `automation/social/` altındaki tüm asset'lerin üretilmesi (prompts, data files, n8n workflow JSON'ları, docs).
