# Phase 0 — Kullanıcı Eylem Listesi

> Bu listedeki **tüm adımları sen yapmak zorundasın** — Claude/AI yerine yapamaz çünkü her platform telefon doğrulama, e-posta onayı, ToS kabulü, 2FA gerektiriyor. Tahmini toplam süre: **30-45 dakika**, tek seferlik.
>
> Sırayı koru — bazıları öncekine bağlı.

---

## 1. LinkedIn (en kritik — B2B birinci kanalın)

### 1.1 Kişisel hesap doğrulama (5dk)

- LinkedIn'e gir: https://www.linkedin.com/
- E-posta `info@aanloopai.nl` ile doğrula (eğer kişisel hesap yoksa kişisel adınla aç, sonra Company Page'e admin olarak ekle)
- Profil tamamla: Aanloop AI / Founder / Rotterdam

### 1.2 LinkedIn Company Page (5dk)

- Üst sağdaki **Work** ikonuna tıkla → **Create a Company Page**
- Page type: **Small business**
- Bilgiler:
  - Name: **Aanloop AI**
  - LinkedIn public URL: `aanloopai`
  - Website: `https://aanloopai.nl`
  - Industry: **IT Services and IT Consulting**
  - Company size: **2-10 employees**
  - Company type: **Privately Held**
  - Tagline: `AI die je werk doet, zodat jij kunt groeien.`
- ✅ "I verify that I am an authorized representative" işaretle → **Create page**
- Logo upload: `OneDrive\Claude\AGA\aanloop\logo-mark-light-1024.png`
- Cover image upload: 1128×191 (banner) — yoksa Claude generate eder
- KVK: 88606902 (Description'a koy)
- About section'a knowledge-base'deki firma açıklaması yapıştır

### 1.3 LinkedIn cookie'lerini al (3dk) — KRİTİK

Bu cookie'ler n8n'e konacak; Company Page'e otomatik post için gerekli.

1. Chrome/Firefox'ta LinkedIn'e logged-in durumdayken
2. F12 → **Application** sekmesi (Firefox: **Storage**)
3. Sol panel → **Cookies** → `https://www.linkedin.com`
4. Şu iki cookie'nin **Value**'sunu kopyala:
   - `li_at` (uzun string, 200+ karakter)
   - `JSESSIONID` (`"ajax:..."` formatında)
5. `.env` dosyana yapıştır (henüz yok, Claude oluşturacak)

⚠️ **Cookie 60-90 günde expires.** Aylık reminder Telegram'a gelecek, aynı işlemi tekrarla.

---

## 2. Facebook Page (Instagram'ın çalışması için zorunlu)

### 2.1 Facebook Page oluştur (3dk)

- https://www.facebook.com/pages/create/
- Page name: **Aanloop AI**
- Category: **Information Technology Company**
- Sayfayı oluştur, profile picture + cover ekle
- About section: tagline + KVK + website

### 2.2 Page Access Token al (5dk)

- https://developers.facebook.com/ → **My Apps** → **Create App** → Type: **Business** → "Aanloop Social"
- Add Product: **Instagram Graph API** + **Pages API**
- Tools → **Graph API Explorer**
- Get Token → **Page Access Token** → "Aanloop AI" seç
- Tüm permissions ekle:
  - `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`
  - `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`
- Token kopyala → `.env` dosyasına `FB_PAGE_ACCESS_TOKEN` olarak yapıştır
- **Long-lived token**'a çevir (60 gün): https://developers.facebook.com/tools/debug/accesstoken/ → "Extend Access Token"

⚠️ Bu token da 60 günde expire olur. Yenileme runbook Phase 2'de.

---

## 3. Instagram (@aanloopai zaten var)

### 3.1 Business account'a convert (2dk)

- Instagram mobil app → @aanloopai profile
- Settings → **Account** → **Switch to professional account**
- Category: **Software**, **Business**
- ✅ Connect to Facebook Page → "Aanloop AI" seç (Adım 2.1'de açtığın)

### 3.2 Instagram Business Account ID öğren (2dk)

- https://developers.facebook.com/tools/explorer/
- Token: az önce aldığın Page Access Token
- GET request: `me/accounts` → page ID'yi al
- GET request: `{page-id}?fields=instagram_business_account` → instagram business account ID
- ID'yi `.env` dosyasına `IG_BUSINESS_ACCOUNT_ID` olarak yapıştır

---

## 4. X (Twitter)

### 4.1 Hesap oluştur (3dk)

- https://twitter.com/i/flow/signup
- Username: **@aanloopai** (varsa **@aanloopai_nl** veya **@aanloop_ai**)
- Email: `info@aanloopai.nl`
- Bio: `AI agency Rotterdam · Self-hosted n8n · 8 dagen tot live · KVK 88606902`
- Website: `https://aanloopai.nl`
- Profile + banner upload

### 4.2 Developer access (10dk, kuyrukta birkaç saat)

- https://developer.x.com/ → **Sign up for Free**
- Use case: "Building a social media management tool for our own company"
- Free tier app oluştur: name "Aanloop Social"
- App permissions: **Read and write**
- Settings → **Keys and tokens**:
  - **API Key + Secret** → kopyala
  - **Access Token + Secret** → "Generate" → kopyala (write permissions ile)
- `.env` dosyasına yapıştır:
  - `X_API_KEY`, `X_API_SECRET`, `X_ACCESS_TOKEN`, `X_ACCESS_TOKEN_SECRET`

---

## 5. TikTok

### 5.1 Business account aç (3dk)

- https://www.tiktok.com/signup/ → email signup
- Username: **@aanloopai**
- Settings → **Account** → **Switch to Business account**
- Category: **Tech & Software Services**
- Bio: tagline + website

---

## 6. YouTube

### 6.1 Brand Channel oluştur (5dk)

- https://www.youtube.com/ → sağ üst hesap ikonu → **Create channel**
- **Use a custom name** seç (kişisel hesabınla bağlı kalmasın)
- Channel name: **Aanloop AI**
- Handle: `@aanloopai`
- Profile pic + banner (1280×720) yükle

### 6.2 Google Cloud + YouTube Data API v3 (10dk)

- https://console.cloud.google.com/
- New project: **aanloop-social**
- APIs & Services → **Enable APIs** → "YouTube Data API v3" → Enable
- Credentials → **Create Credentials** → **OAuth client ID**
- Application type: **Web application**
- Authorized redirect URIs: `<n8n-url>/rest/oauth2-credential/callback`
  - Örnek: `https://n8n.aanloopai.nl/rest/oauth2-credential/callback`
- **Client ID + Client Secret** kopyala → `.env` dosyasına `YT_CLIENT_ID`, `YT_CLIENT_SECRET`

---

## 7. Telegram Bot

### 7.1 Bot oluştur (3dk)

- Telegram'da **@BotFather** ile mesaj başlat
- `/newbot` komutu
- Name: **Aanloop Social Approval**
- Username: **`aanloopai_social_bot`** (sonu `_bot` olmalı)
- BotFather sana token verecek (`123456:ABC-...`) → `.env` dosyasına `TELEGRAM_BOT_TOKEN`
- Botu kendi Telegram'ında bul ve **/start** yap

### 7.2 Chat ID öğren (1dk)

- Telegram'da **@userinfobot** ile mesaj başlat → /start
- Bot sana **Id**: `123456789` verecek → `.env` dosyasına `TELEGRAM_CHAT_ID`

---

## 8. Anthropic (Claude API)

### 8.1 API key (3dk)

- https://console.anthropic.com/
- Settings → **API Keys** → **Create Key**
- Name: "aanloop-social-n8n"
- Token kopyala → `.env` dosyasına `ANTHROPIC_API_KEY`
- **Billing**'e kart ekle, $20 prepay yap (yeterli, kademe iyileştirilir)

---

## 9. (Opsiyonel) fal.ai — görsel AI

### 9.1 API key (2dk)

- https://fal.ai/dashboard/keys
- Create key → kopyala → `.env` `FAL_API_KEY`
- $5 credit yeterli ay başına

> Atlasan: Phase 1'de görsel = brand template + Sharp.js overlay (zero cost). Sadece Phase 2 için fal.ai. **Phase 1'de bu adımı atlayabilirsin.**

---

## 10. (Opsiyonel) ElevenLabs — video TTS

### 10.1 API key (2dk)

- https://elevenlabs.io/app/settings/api-keys
- Create API key → kopyala → `.env` `ELEVENLABS_API_KEY`
- Free tier: 10K karakter/ay (haftada 1 video × ~200 char = ~800 char/ay, fazlasıyla yeter)

---

## 11. n8n self-hosted erişim

Bu ZATEN var (Aanloop'un USP'si). Claude'a vereceğin:

- **n8n URL:** `https://...` (Hetzner sunucusunda hosted)
- **Login:** kullanıcı adı + şifre **veya** API key
  - API key oluşturma: n8n UI → Settings → API → Generate
- `.env` dosyasına `N8N_URL` + `N8N_API_KEY`

---

## ✅ Bittiğinde Claude'a şunları ver

`.env` dosyandaki tüm doldurulmuş değerleri Claude ile paylaş (sadece kendi conversation'ında, asla public yerlerde):

```
LINKEDIN_LI_AT=...
LINKEDIN_JSESSIONID=...
LINKEDIN_COMPANY_URN=...
FB_PAGE_ACCESS_TOKEN=...
FB_PAGE_ID=...
IG_BUSINESS_ACCOUNT_ID=...
X_API_KEY=...
X_API_SECRET=...
X_ACCESS_TOKEN=...
X_ACCESS_TOKEN_SECRET=...
YT_CLIENT_ID=...
YT_CLIENT_SECRET=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
ANTHROPIC_API_KEY=...
FAL_API_KEY=...
ELEVENLABS_API_KEY=...
N8N_URL=...
N8N_API_KEY=...
```

---

## Ne yaparsam takılırım?

| Sorun | Çözüm |
|---|---|
| LinkedIn "company verification" istiyor | KVK belgesini upload et, 1-2 günde onaylanır |
| FB Graph API 24h sonra "session expired" | Long-lived token'a çevir (Adım 2.2 sonu) |
| X Developer "rejected" | Use case'i değiştir: "Personal automation for our company's brand" |
| TikTok "category not available" | Smart Devices/Tech & Internet'e değiştir |
| YouTube channel kişisel hesaba bağlı | Brand Account'a transfer: youtube.com/account_advanced |
| BotFather "username taken" | _bot suffix'i değiştir, başka kombinasyon dene |
