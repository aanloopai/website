# SETUP.md — n8n + Otomasyon Kurulumu (Phase 1)

> Bu dosya **`USER-ACTION-CHECKLIST.md` tamamlandıktan SONRA** uygulanır.
> Tüm hesaplar, token'lar ve `.env` doldurulmuş olmalı.

---

## 0. Önkoşullar

- ✅ `USER-ACTION-CHECKLIST.md` tamamlandı
- ✅ `.env` dosyası `.env.example`'tan kopyalandı, tüm değerler dolu
- ✅ n8n self-hosted erişimi var (`https://n8n.aanloopai.nl` veya benzer)
- ✅ Brand assets `OneDrive/Claude/AGA/aanloop/dist/brand/` klasöründe (logolar)

---

## 1. n8n'e dosyaları yükle

### 1.1 Static dosyalar

n8n sunucuna SSH ile bağlan veya admin panelden:

```bash
# n8n veri dizininde
cd /home/node/.n8n
mkdir -p aanloop-social
cd aanloop-social

# Bu klasörü aanloop projesinden buraya kopyala:
#  - data/services.json
#  - data/sectors.json
#  - data/tips.json
#  - prompts/brand-voice.md
#  - prompts/pillar-prompts.md
```

n8n kullanıcısının okuma izni olduğundan emin ol: `chmod 644 *.json *.md`

### 1.2 Workflow JSON import

n8n UI'da:
1. **Workflows** → **+ Import from File**
2. `automation/social/workflows/aanloop-social-master.json` seç
3. Import sonrası workflow açılır — credentials'ları henüz bağlamadık, hata vermesi normal

---

## 2. n8n credentials oluştur

n8n UI → **Credentials** → **+ Add credential**:

| Credential adı | Tip | Doldur |
|---|---|---|
| `Anthropic Aanloop` | HTTP Header Auth | Header: `x-api-key`, Value: `{ANTHROPIC_API_KEY}` |
| `Telegram Aanloop Bot` | Telegram API | Token: `{TELEGRAM_BOT_TOKEN}` |
| `Meta Aanloop` | HTTP Header Auth | Header: `Authorization`, Value: `Bearer {FB_PAGE_ACCESS_TOKEN}` |
| `X v2 Aanloop` | OAuth2 (Twitter) | Client ID: `{X_API_KEY}`, Secret: `{X_API_SECRET}` + access tokens |
| `LinkedIn Cookie Aanloop` | HTTP Cookie | `li_at={LINKEDIN_LI_AT}; JSESSIONID={LINKEDIN_JSESSIONID}` |
| `YouTube OAuth2 Aanloop` | OAuth2 (Google) | Client ID/Secret, Scope: `youtube.upload` |
| `Google Drive Aanloop` | OAuth2 (Google) | Aynı OAuth project, Scope: `drive.file` |
| `Google Sheets Aanloop` | OAuth2 (Google) | Aynı OAuth project, Scope: `spreadsheets` |

⚠️ X (Twitter) için OAuth flow'da redirect URI: `{N8N_URL}/rest/oauth2-credential/callback`. Aynı YouTube/Drive için.

---

## 3. n8n workflow node'larını credentials'lara bağla

`aanloop-social-master.json` içindeki node'lar:
- **Anthropic node** → `Anthropic Aanloop` seç
- **Telegram approval node** → `Telegram Aanloop Bot` seç
- **HTTP Request - LinkedIn** → `LinkedIn Cookie Aanloop` seç
- **HTTP Request - Instagram/Facebook** → `Meta Aanloop` seç
- **Twitter node** → `X v2 Aanloop` seç
- **YouTube node** → `YouTube OAuth2 Aanloop` seç
- **Google Drive node** → `Google Drive Aanloop` seç
- **Google Sheets node** → `Google Sheets Aanloop` seç

---

## 4. Google Sheet (analytics dashboard) oluştur

1. Yeni Google Sheet aç: "Aanloop Social Analytics"
2. 3 sayfa oluştur:
   - **posts-log** — kolonlar: `date, weekday, pillar, platform, lang, char_count, post_url, status, error` (date format: ISO YYYY-MM-DD)
   - **weekly-stats** — kolonlar: `week_start, platform, reach, engagement, clicks, follower_delta`
   - **costs** — kolonlar: `date, service, amount_eur, notes`
3. Sheet ID URL'den al (ör. `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`)
4. `.env`'e `GOOGLE_SHEET_ID=...` yaz
5. Sheet'i n8n service account'una **Editor** olarak paylaş

---

## 5. Google Drive klasörü oluştur

1. Drive'da yeni klasör: `Aanloop Social Assets`
2. Alt klasörler:
   - `images/` — günlük postların görselleri
   - `videos/` — haftalık videolar
   - `pending-tiktok/` — manuel upload bekleyen TikTok videoları
3. Folder ID al ve `.env`'e `GOOGLE_DRIVE_ROOT_FOLDER_ID=...` yaz

---

## 6. Smoke test (PROD'a gitmeden)

n8n workflow'u aç, sağ üstten **Test workflow** çalıştır. Beklenen:

1. ✅ **Trigger fires** — manual test
2. ✅ **Pillar router** — bugünün gününe göre doğru pillar seçer
3. ✅ **Data fetch** — services.json'dan obje okur
4. ✅ **Claude API** — 4 platform variant döner (200-900 char range)
5. ✅ **Image gen** — placeholder veya fal.ai görsel
6. ✅ **Telegram digest** — telefonuna gelir, butonlar çalışır
7. ❓ **Manuel onay testi** — Approve butonuna bas
8. ✅ **Distributors** — TEST modunda **dummy** Instagram/FB/X post (caption "TEST: ...")
9. ✅ **Sheet log** — posts-log sayfasında satır oluşur

⚠️ **Gerçek post atmadan ÖNCE test mode'da çalıştır.** Workflow'da `MODE=test` env var ekle, distributor node'lar bunu okur, gerçek post atmaz, sadece simüle eder.

---

## 7. Production'a aç (cron'u canlıya al)

1. Workflow'da **Cron trigger** node'unu **Active** yap
2. Schedule: `30 7 * * 1-5` (Pzt-Cuma 07:30 NL — Europe/Amsterdam)
3. Saturday video için ikinci cron: `0 9 * * 6`
4. Workflow'u **Activate** (sağ üst toggle)
5. İlk gerçek post yarın 07:30'da içerik üretmeye başlar
6. 09:00'da Telegram'da onay digest'i gelir
7. ✅ ile yayınla, ❌ ile geç

---

## 8. İlk hafta gözlem

- Her sabah Telegram digest'ini incele, **5dk içinde** karar ver
- İlk 3-4 gün içerikler "%85 hazır" gelir; küçük düzeltmelerle yayınla
- Sıkça düzelttiğin şeyleri **brand-voice.md**'ye yansıt — bu prompt'un "öğrenme dosyası"
- 1 hafta sonra `posts-log` Sheet'inde patternları gör → analytics-collector workflow'u devreye alınabilir

---

## 9. Sık karşılaşılan kurulum hataları

| Hata | Çözüm |
|---|---|
| `Claude API 401` | `.env`'de `ANTHROPIC_API_KEY` boş; doldur, n8n credential'ı yenile |
| `LinkedIn 403 — challenge required` | Cookie expire olmuş; `COOKIE-REFRESH-RUNBOOK.md` uygula |
| `Instagram OAuthException 100` | IG hesap Business değil veya FB Page'e bağlı değil; `USER-ACTION-CHECKLIST.md` Adım 3'ü tekrarla |
| `X 429 — rate limit` | Free tier 500/ay, ay başından kaç post atıldı? Distributor'ı geçici devre dışı bırak |
| `n8n executionData null` | Webhook node-to-node geçiş bozuk; manuel re-link |
| `YouTube quotaExceeded` | Günde ~6 upload var, fazla deneme oldu mu? Quota 24h sonra resetlenir |
| `Telegram chat not found` | Bot'a önceden /start dememişsin → Telegram'da bot'u aç, /start at |

---

## 10. İlk müşteri demosu için (Day 30+)

Bu otomasyonu **kendi ürünümüzün canlı demosu** yapmak için 30 gün sonra:

1. `https://aanloopai.nl/cases/aanloop-zelf/` sayfası oluştur
2. İçerik: "Wij beheren onze eigen sociale media met onze AI Social Media Agent. Hier zijn de resultaten van de eerste 30 dagen:"
3. Posts-log sheet'inden istatistikler ekle
4. CTA: "Wil je hetzelfde voor jouw bedrijf? Plan een demo."

Bu sayfa **bedava case study** + **trust signal** + **müşterilere konkret bewijs**.
