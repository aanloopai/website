# Aanloop AI — Site Audit & Büyüme Yol Haritası

**Domain incelendi:** `https://aanloopai.nl`
**Analiz tarihi:** 29 April 2026
**Analist rolleri:** System Architect · Growth Hacker · UX Strategist · SEO Engineer
**Hedef:** Site, kurumsal müşterilere hitap edebilecek olgunlukta + Google'da hedef anahtar kelimelerde top-3 sıralanacak teknik kalitede olmalı.

---

## 0. TL;DR — Yöneticinin Özeti

Site **görsel olarak güzel, mimari olarak temiz, içerik olarak prematüre, SEO olarak felaket, kurumsal müşteriler için hazır değil**. Astro v4 ile inşa edilmiş, Cloudflare arkasında, TTFB 73ms — altyapı tarafı **mükemmel**. Ama önümüzde dört kategori sorun var:

| Öncelik | Sorun | İş Etkisi |
|---|---|---|
| 🔴 P0 (BUGÜN) | **Tüm canonical URL'ler `aanloop.ai`'yi gösteriyor (.ai, .nl değil) — domain mevcut değil** | Google sitenin tamamını duplicate/canonical-violation olarak görüyor → indexlenmiyor |
| 🔴 P0 (BUGÜN) | **Tüm sayfalarda fake KvK (12345678), fake telefon (010-000 0000), fake e-posta domain karışımı** | Hukuki risk (Wet OHP — misleidende handelspraktijken) + güven yok |
| 🔴 P0 (BUGÜN) | **Fake testimonial'lar (Sander de Vries, Marieke Jansen, Ahmed Bouali) ve fake team (Daan, Sara, Niels, Lena)** | ACM/Reclame Code Commissie ihlali; B2B alıcısı LinkedIn'de doğrulayınca güveni sıfırlıyor |
| 🔴 P0 (BUGÜN) | **"500+ aktif klant", "ISO 9001/27001 sertifikalı", "€2.4M bespaard" — kanıtlanmamış iddialar** | Bu ifadeler Aanloop AI'nın değil, FleetTrack'in metrikleri. Hatalı atfetme |
| 🟠 P1 | sitemap.xml yok (404), robots.txt Cloudflare default'u, GPTBot/Google-Extended/ClaudeBot **bloklu** | Hem Google hem de AI Overviews'e indekslenemiyor — bir AI şirketi için skandal |
| 🟠 P1 | Hiç analytics yüklü değil (GA4/Plausible/GTM yok) | Trafik, conversion, funnel datası elde edilemiyor — büyüme imkansız |
| 🟠 P1 | Kennisbank'ta listelenen 6 blog yazısının **hepsi 404** | Onsite SEO için yazı yok = sıfır organik trafik potansiyeli |
| 🟠 P1 | Service/Product/FAQ/BreadcrumbList/Review schema'sı yok | Rich snippet alma şansı sıfır |
| 🟡 P2 | Hreflang yok, EN versiyonu yok | Kurumsal müşteriler için (Hollanda'da çalışan multinational) erişilemez |
| 🟡 P2 | Demo videosu, voice demo (call to AI), interactive playground yok | Konversiyon oranı düşük kalacak |
| 🟡 P2 | Trust panel'inde gerçek logo, customer logo, badge yok | Sosyal kanıt eksik |

**14 günlük net hareket planı:** Bu dosyanın §11'inde detaylı.

---

## 1. Sistem Mimarisi Denetimi (System Architect lensi)

### 1.1 Mevcut Stack — Tespit Edilen

```
Frontend:   Astro v4.16.19 (SSG)
Hosting:    Cloudflare Pages / Workers (cf-cache-status: HIT)
Edge:       Cloudflare CDN (172.67.145.10, ORD bölgesi)
HTTP/3:     Aktif (alt-svc h3 header)
TLS:        Modern, OK
Cache:      public, max-age=0, must-revalidate (statik için optimal değil)
```

### 1.2 İyi Olanlar ✅

- **Astro v4 SSG** — kurumsal sitenin doğru tercihi: HTML statik, JS minimum, performans yüksek
- **Cloudflare** önünde — DDoS, WAF, edge cache, ücretsiz SSL
- **TTFB 73ms** — Hollanda'dan ölçülen rakipler 200-400ms tipik
- **HTTP/3 ve preconnect** — modern best practice
- Skip-to-main accessibility link var
- Astro hoisted JS bundle var, render-blocking minimum

### 1.3 Eksik / Hatalı Olanlar ❌

| Konu | Mevcut | Olması Gereken |
|---|---|---|
| Cache stratejisi | `max-age=0, must-revalidate` | Statik HTML için `max-age=300, s-maxage=86400, stale-while-revalidate=604800` |
| Domain kanonikleştirme | `aanloop.ai` (mevcut değil) ↔ `aanloopai.nl` (canlı) | `www.aanloopai.nl` → `aanloopai.nl` 301 + canonical = aanloopai.nl |
| HTTP→HTTPS yönlendirme | Var | OK, devam |
| Subdomain stratejisi | Yok | `app.aanloopai.nl` (dashboard), `docs.aanloopai.nl` (API/dev), `status.aanloopai.nl`, `blog.aanloopai.nl`/kennisbank tek domain |
| Image optimization | Logo SVG sadece | WebP/AVIF, `<picture>` tag, lazy loading, fetchpriority |
| Font loading | Google Fonts preconnect var, font yüklenmeyi göremedim | `font-display: swap` + self-host woff2 (CWV için kritik) |
| Service Worker / PWA | Yok | İleri aşamada — manifest.webmanifest + offline fallback |
| Security headers | Sadece CF default | CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| Backend / form handler | Backend yok | Cloudflare Workers + KV + queue, veya Resend/Postmark + Cloudflare Pages Functions |

### 1.4 Kurumsal Müşteri için Mimari Hazırlık

Kurumsal müşteri (>250 personel, hukuk + IT + procurement süreciyle) sözleşme imzalamadan önce şu mimariyi sorgular:

1. **Multi-tenancy**: Her müşteri için izole data ve config. Şu anki site bunu göstermiyor — `aanloop.ai/customers/{tenant}/...` gibi bir mimari görmesi gerekiyor.
2. **Data residency**: "100% EU" iddiası var ama nerede? Hetzner Nuremberg (M zaten kullanıyor) ✅ ama site `frankfurt-eu`, `amsterdam-eu` özellikle belirtmeli.
3. **SSO (SAML 2.0 / OIDC)**: Tarifelerin "Enterprise"ında SSO/SAML yazıyor ama nasıl çalıştığına dair bir teknik sayfa yok.
4. **API erişimi**: Kurumsal müşteri kendi sistemlerine entegrasyon yapmak isteyecek. `docs.aanloopai.nl` veya `aanloopai.nl/developers/` yok.
5. **Audit log + observability**: SOC 2/ISO 27001 için zorunlu. `status.aanloopai.nl` ve uptime raporu yok.
6. **Security & compliance hub**: TrustCenter benzeri bir sayfa yok. Bkz. **trust.<vendor>.com** standardı (Vanta/Drata pattern'i).
7. **DPA (Data Processing Agreement)** template'i indirilebilir değil — AVG zorunluluğu.

### 1.5 Önerilen Hedef Mimarisi (90 gün)

```
                        ┌─────────────────────────────┐
                        │  aanloopai.nl (marketing)    │
                        │  Astro SSG + Cloudflare      │
                        └──────────────┬──────────────┘
                                       │
        ┌──────────────────────┬──────┴──────┬────────────────────────┐
        ▼                      ▼              ▼                        ▼
  app.aanloopai.nl     docs.aanloopai.nl   status.aanloopai.nl   trust.aanloopai.nl
  (klant dashboard)    (developer hub)     (uptime + incidents)   (security/compliance)
  Next.js + Auth       Mintlify/Docusaurus  Better Stack/Statuspage Astro statik
        │
        ▼
  api.aanloopai.nl  (Cloudflare Workers + Hono.js / FastAPI on Hetzner VPS)
        │
        ├── ElevenLabs (Marco TTS/STT)
        ├── Twilio (NL nummer + SMS)
        ├── OpenClaw (orchestration)
        ├── Dify (knowledge base)
        └── PostgreSQL (audit log) — EU bölgesinde, ekibinin Hetzner'inde
```

---

## 2. SEO Mühendisliği Denetimi (SEO Engineer lensi)

### 2.1 Kritik Hatalar (HEMEN düzelt)

#### 2.1.1 Canonical URL felaketi 🔴

**Tespit:** Tüm sayfalarda `<link rel="canonical" href="https://aanloop.ai/...">` ve `og:url` aynı şekilde. Ancak `https://aanloop.ai` HTTP isteğine cevap vermiyor (HTTP 000 — domain çözülmüyor).

**Etki:** Google hâlihazırda gördüğü `aanloopai.nl` sayfalarını "burası canonical değil" olarak işaretliyor → indekslenmiyor veya filtreleniyor.

**Çözüm seçenekleri:**

- **Seçenek A (önerilen):** `aanloop.ai`'yi sat ve onu primary yap → `aanloopai.nl` 301 redirect ile `aanloop.ai`'ye gitsin. Marka adı zaten "Aanloop AI", `.ai` TLD'si AI sektöründe daha güvenilir.
- **Seçenek B (hızlı):** Astro config'inde `site: "https://aanloopai.nl"` yap, tüm canonical/og:url otomatik düzelir, build & deploy. (15 dk iş)

```js
// astro.config.mjs
export default defineConfig({
  site: 'https://aanloopai.nl',  // ← bu satır kritik
  trailingSlash: 'always',
});
```

#### 2.1.2 robots.txt — AI bot'larını blokluyor 🔴

**Tespit:** `robots.txt` Cloudflare yönetiminde, varsayılan policy:

```
User-agent: GPTBot         → Disallow: /
User-agent: Google-Extended → Disallow: /     ← Bu Google AI Overviews/SGE için!
User-agent: ClaudeBot      → Disallow: /
User-agent: CCBot          → Disallow: /
User-agent: meta-externalagent → Disallow: /
```

**Etki:** Aanloop AI bir AI şirketi. Sitenin AI sonuçlarda görünmemesi → "AI assistent voor MKB" araştırması yapan kullanıcı ChatGPT/Perplexity/Gemini'da Aanloop'u **göremeyecek**. Rakipler (slimiq.nl, aiagency.nl, easydata.nl) görünüyorsa kaybedildi.

**Çözüm:** Cloudflare dashboard → "AI Bots" → "Allow" veya custom robots.txt yaz:

```
# /public/robots.txt
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: anthropic-ai
Allow: /

# Bot scrapers (kötüler) — spesifik bloklanır:
User-agent: SemrushBot
Crawl-delay: 10

User-agent: AhrefsBot
Crawl-delay: 10

Sitemap: https://aanloopai.nl/sitemap-index.xml
```

#### 2.1.3 Sitemap yok 🔴

**Tespit:** `/sitemap.xml` ve `/sitemap-index.xml` 404 veriyor.

**Çözüm:** Astro'nun `@astrojs/sitemap` paketi:

```bash
npx astro add sitemap
```

```js
// astro.config.mjs
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://aanloopai.nl',
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'nl', locales: { nl: 'nl-NL', en: 'en-US' } },
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      filter: (page) => !page.includes('/admin/'),
    }),
  ],
});
```

Sonra Google Search Console + Bing Webmaster Tools'a manuel olarak gönder.

### 2.2 On-Page SEO

#### 2.2.1 Title tag'leri çok zayıf

**Tespit:**
- Homepage: 52 karakter (OK ama keyword stuffed değil)
- "/diensten/" → "Diensten · Aanloop AI" — sadece 21 karakter (Google ortalaması 55-60)
- "/sectoren/" → 21 karakter
- "/cases/" → 23 karakter
- "/contact/" → 20 karakter

Google bu kadar kısa title'ı bazen kendisi "Diensten - Aanloop AI - AI voor MKB" şeklinde otomatik genişletiyor (sevimsiz).

**Önerilen format:** `[Primary keyword] | [Secondary keyword] | [Marka]` (≤60 karakter)

| Sayfa | Mevcut | Önerilen |
|---|---|---|
| / | Aanloop AI · AI-oplossingen voor het Nederlandse MKB | AI Assistent voor MKB Nederland · AI Receptionist & Chatbot — Aanloop AI |
| /diensten/ | Diensten · Aanloop AI | AI Diensten voor MKB · Receptionist, WhatsApp Bot, Maatwerk — Aanloop AI |
| /diensten/marco/ | Marco — AI sekreter · Aanloop AI | Marco · AI Receptionist 24/7 voor MKB Nederland — vanaf €297/mnd |
| /diensten/emma/ | Emma — WhatsApp agent · Aanloop AI | Emma · AI WhatsApp Agent voor Klantenservice — Live binnen 7 dagen |
| /diensten/telefoon-assistent/ | AI telefoon assistent · Aanloop AI | AI Telefoon Assistent · Volledige Telefooncentrale met AI — Nederlands |
| /sectoren/ | Sectoren · Aanloop AI | AI Oplossingen per Sector · Horeca, Logistiek, Vastgoed & Meer |
| /sectoren/horeca/ | (n/a) | AI voor Horeca · Reserveringen, No-show & Voorraadprognose — Aanloop AI |
| /tarieven/ | Tarieven · Aanloop AI | Tarieven AI Assistent · Vanaf €297/mnd, geen verrassingen — Aanloop AI |
| /cases/ | Klantcases · Aanloop AI | AI Succesverhalen · Hoe MKB-bedrijven AI inzetten — Aanloop AI |
| /kennisbank/ | Kennisbank & Blog · Aanloop AI | AI voor MKB Kennisbank · Gidsen, Tutorials & Tips voor 2026 |

#### 2.2.2 Meta description'lar

Çoğu 100-160 karakter — bu OK. Ama şunlar düzeltilmeli:
- Voorwaarden: 74 karakter (çok kısa)
- Cookies: 99 karakter (sınırda)
- Cases: 111 karakter (zayıf, action verb yok)

**Pattern:** `[Hook] [Value prop] [Action]`. Örnek:
> "Marco neemt 24/7 uw telefoon aan, plant afspraken en levert leads — vloeiend Nederlands, live in 7 dagen. Plan een gratis demo →"

#### 2.2.3 H1/H2 hiyerarşisi

Homepage H1: `"AI die écht werkt voor uw bedrijf."`

**Sorun:** "écht werkt" tipo'lu animasyonla yazılıyor ama crawler için de hâlâ statik metin. Buradaki sorun **keyword density**: H1'de "AI assistent", "MKB" veya "Nederland" geçmiyor.

**Önerilen H1:** `"AI-assistenten voor het Nederlandse MKB die écht werken"`
(animasyon `<span>` içinde, "écht werken" kısmı dinamikçe değişir)

H1'de tek odaklı arama-niyetli bir keyword olmalı. Şu an "AI die werkt" diye arayan yok.

#### 2.2.4 Internal linking

27 internal link homepage'de — sayı OK. Ama:
- "Blog" linkleri yok (kennisbank içeriği yok)
- Sektör sayfalarından ilgili dienst sayfalarına çapraz link yok (görmedim — kontrol edilmeli)
- Cases'ten dienst'e geri link yok

**Internal link silo stratejisi:**

```
homepage
  ├── /diensten/  (hub)
  │     ├── /diensten/marco/  ←→  /sectoren/horeca/, /sectoren/vastgoed/
  │     ├── /diensten/emma/   ←→  /sectoren/detailhandel/, /sectoren/logistiek/
  │     ├── /diensten/telefoon-assistent/
  │     └── /diensten/custom/
  ├── /sectoren/ (hub)
  │     └── her sektör → ilgili 1-2 case + ilgili dienst
  ├── /cases/  → her case kartından ilgili dienst sayfasına
  └── /kennisbank/ → her yazıdan ilgili dienst+sektöre kontekstüel link
```

### 2.3 Structured Data / Schema.org

#### 2.3.1 Mevcut

Yalnızca iki schema:
- `Organization` (eksik: founder, foundingDate, vatID)
- `LocalBusiness` (eksik: openingHours, priceRange, geo, image; phone fake!)

#### 2.3.2 Eksik schemalar

| Sayfa tipi | Schema'lar | Etki |
|---|---|---|
| Hizmet sayfaları (Marco, Emma, vb.) | `Service` + `Product` + `Offer` + `AggregateRating` | Rich snippet, Google Shopping, fiyat görünümü |
| Cases | `Article` + `Review` (case = review) | Star rating SERP'de |
| Kennisbank yazıları | `BlogPosting` / `Article` + `Author` + `Publisher` | E-E-A-T, AI Overview |
| Tüm sayfalar | `BreadcrumbList` | SERP'de breadcrumb gösterimi |
| Tarieven | `PriceSpecification` | Pricing snippet |
| FAQ bölümleri | `FAQPage` | Accordion SERP gösterimi (50% CTR artışı) |
| Vacatures | `JobPosting` | Google Jobs panel |

#### 2.3.3 Önerilen Service schema (Marco için)

```json
{
  "@context": "https://schema.org",
  "@type": "Service",
  "name": "Marco — AI Receptionist",
  "serviceType": "AI Phone Receptionist",
  "provider": {
    "@type": "Organization",
    "name": "Aanloop AI",
    "url": "https://aanloopai.nl"
  },
  "areaServed": { "@type": "Country", "name": "Netherlands" },
  "audience": { "@type": "BusinessAudience", "audienceType": "MKB" },
  "availableLanguage": ["nl", "en", "de", "fr", "es"],
  "offers": [
    {
      "@type": "Offer",
      "name": "Starter",
      "price": "297",
      "priceCurrency": "EUR",
      "billingDuration": "P1M",
      "availability": "https://schema.org/InStock"
    },
    {
      "@type": "Offer",
      "name": "Groei",
      "price": "497",
      "priceCurrency": "EUR",
      "billingDuration": "P1M"
    }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.9",
    "reviewCount": "27",
    "bestRating": "5"
  }
}
```

⚠️ **AggregateRating'i sadece gerçek review'lar varsa kullan.** Şu anki testimonialler fake, schema'ya koyarsak Google manuel cezası riski (Google Reviews Spam Update 2024).

### 2.4 Indexability & Crawling

#### Hızlı kontrol komutları

```bash
# Google'ın indekslediklerini gör
site:aanloopai.nl

# Search Console'a kayıt ol (DNS TXT veya HTML upload)
# Property: https://aanloopai.nl/

# URL Inspection ile / sayfasını test et:
# - Crawled? Yes/No
# - Indexed? Yes/No
# - Canonical: aanloopai.nl olduğundan emin ol
```

#### Çekirdek metrikler hedef

| Metrik | Şu an (tahmini) | 30 gün hedef | 90 gün hedef |
|---|---|---|---|
| Indexlenen sayfa | 0-5 | 25+ | 60+ (kennisbank dahil) |
| Average position | yok | <30 | <15 |
| Impressions/ay | <100 | 5.000 | 25.000 |
| Clicks/ay | <10 | 200 | 800 |
| CTR | n/a | 4%+ | 5%+ |

### 2.5 Anahtar Kelime Stratejisi

#### Birincil keyword cluster'ları (NL, intent + zorluk + hacim tahmini)

| Cluster | Keyword | Aylık Hacim | KD | Niyet | Hedef sayfa |
|---|---|---|---|---|---|
| AI receptionist | ai receptionist nederland | 200 | 28 | Commercial | /diensten/marco/ |
| | ai telefoon assistent | 150 | 35 | Commercial | /diensten/telefoon-assistent/ |
| | ai sekretaresse | 80 | 22 | Commercial | /diensten/marco/ |
| WhatsApp AI | whatsapp ai agent | 320 | 38 | Commercial | /diensten/emma/ |
| | whatsapp business api ai | 210 | 42 | Informational | /kennisbank/whatsapp-ai-2026/ |
| | whatsapp chatbot mkb | 90 | 25 | Commercial | /diensten/emma/ |
| AI MKB | ai voor mkb | 1,300 | 48 | Mixed | / (ana sayfa) |
| | ai assistent mkb nederland | 110 | 30 | Commercial | / |
| | ai automatisering mkb | 480 | 45 | Mixed | /diensten/custom/ |
| AI by sector | ai voor horeca | 170 | 20 | Mixed | /sectoren/horeca/ |
| | ai voor makelaars | 90 | 18 | Commercial | /sectoren/vastgoed/ |
| | ai voor logistiek | 140 | 32 | Mixed | /sectoren/logistiek/ |
| | ai zorginstelling | 60 | 15 | Mixed | /sectoren/zorg/ |
| Long-tail bottom funnel | ai sekreter rotterdam | 30 | 8 | Commercial | /diensten/marco/ + sayfa içi |
| | ai chatbot bouwen kosten | 70 | 25 | Commercial | /tarieven/ |
| | gemiste telefoontjes oplossing | 40 | 12 | Problem-aware | /diensten/marco/ |
| Informational (kennisbank) | wat is een ai agent | 480 | 22 | Informational | /kennisbank/wat-is-ai-agent/ |
| | ai roi berekenen | 90 | 28 | Informational | /kennisbank/roi-ai-berekenen/ |
| | ai avg compliance | 320 | 35 | Informational | /kennisbank/ai-avg-mkb/ |

Sayılar tahmini — gerçek rakamlar için **Ahrefs / SEMrush / Mangools** ile doğrula. Önerim: **Mangools KWFinder (€29/ay)** veya **Ubersuggest free tier**.

#### İkincil strateji: GEO (Generative Engine Optimization)

ChatGPT/Perplexity/Gemini'da "AI assistent voor mijn restaurant" sorgusu yapıldığında çıkmak istiyorsan:

1. **AI bot'larını robots.txt'de ALLOW** (yukarıda anlatıldı)
2. **Yapılandırılmış cevap formatı**: Her hizmet sayfasında "Wat is X?", "Hoe werkt X?", "Wat kost X?" şeklinde net Q&A blokları
3. **llms.txt** dosyası ekle (anthropic'in önerdiği format):

```
# /public/llms.txt
# Aanloop AI - AI-oplossingen voor het Nederlandse MKB

> Aanloop AI levert kant-en-klare AI-assistenten voor MKB-ondernemers in NL.
> Hoofdproducten: Marco (AI receptionist), Emma (WhatsApp agent), Custom workflows.
> Prijzen: vanaf €297/mnd. Live binnen 7-14 dagen.

## Diensten
- [Marco AI Receptionist](https://aanloopai.nl/diensten/marco/): 24/7 AI telefoon
- [Emma WhatsApp Agent](https://aanloopai.nl/diensten/emma/): AI klantenservice op WhatsApp

## Sectoren
- Horeca, Logistiek, Vastgoed, Detailhandel, Zakelijke dienstverlening, Zorg

## Contact
- Email: hello@aanloopai.nl
- Telefoon: [GERÇEK NUMARA]
- Adres: Rotterdam, Nederland
```

### 2.6 E-E-A-T (Google'ın kalite skorları)

E-E-A-T = Experience · Expertise · Authoritativeness · Trustworthiness

Şu an site sıfır E-E-A-T sinyali veriyor:
- ❌ Yazar bilgisi yok (kennisbank yazılarında)
- ❌ Şirket sayfasında gerçek yüzler yok (placeholder fotoğraflar/initials)
- ❌ LinkedIn pages var ama içi boş (linke sadece firmanın LI'ı)
- ❌ Press / Pers sayfası yok
- ❌ Müşteri logoları yok
- ❌ Sertifika rozeti gerçek hyperlink yok (ISO 27001 nereden alındı?)

**Hızlı kazanım:**
1. Gerçek profil fotoğrafı koy (M kendisi + iki gerçek tanıdık veya freelancer)
2. Her kennisbank yazısının altına Author Box (LinkedIn linki + kısa bio)
3. ISO 27001 sertifika belgesini PDF olarak `/trust/` altına koy ve linkle
4. Gerçek müşteri 3-5 logo (Camping d'n Aanloop sahibinin sözlü+yazılı izni alınmış olmalı)

---

## 3. UX Stratejisi Denetimi (UX Strategist lensi)

### 3.1 Information Architecture (IA)

Mevcut nav: `Diensten · Sectoren · Cases · Werkwijze · Tarieven · Over ons` + Contact

**Eksikler / problem alanları:**

| Problem | Etki | Çözüm |
|---|---|---|
| "Boek een demo" CTA bir form'a gidiyor (`/contact/?type=demo`), Calendly entegrasyonu yok | %60-70 conversion kaybı | Cal.com / Calendly inline embed |
| "Bel direct: 010 — 000 0000" — fake numara | Güven kaybı + 0 conversion | Twilio Dutch number göster + click-to-call |
| Demo videosu yok (statik metin + grafik) | "Hoe klinkt het echt?" sorusu cevapsız | 60-90 saniyelik gerçek Marco call recording (gizliliği aşılmış demo) + autoplay-muted |
| Voice demo / arama sınama yok | Rakipler iam-ai.nl bunu yapıyor | "Bel +31-XX om Marco zelf te bellen" — gerçek bir ücretsiz demo number |
| Live chat yok | %30 ziyaretçi sorularını çözemiyor → ayrılır | Emma'nın kendisi widget olarak homepage'da! (dogfooding) |
| Footer'da "Aanvragen" var ama anlamı belirsiz | Confusing IA | "Aanvragen" → "Setup aanvragen" / "Onboarding portal" olarak adlandır |
| Vacatures sayfası var ama nav'da değil | Talent acquisition kaybı | Footer + `/over/` sayfasında "Werken bij" CTA |
| Trust merkezi yok (security, compliance, DPA) | Kurumsal müşteri için showstopper | `/trust/` veya `trust.aanloopai.nl` ekle |

### 3.2 Conversion Funnel Audit

**Mevcut funnel:**
```
Homepage → /diensten/marco/ → /contact/?type=demo → form gönder → ???
```

Ne süreden sonra reply geliyor? Email handling backend'i ne? Form'un kendisi nereye POST ediyor? **HTML'de gördüm: form action belirtilmemiş, form ID'si var ama JS handler kontrol edilmedi.** Bu **kritik** — bir lead form çalışmıyorsa tüm SEO, growth çabaları boşa gidiyor.

**Test edilmesi gereken:**
- [ ] Form gerçekten gönderiliyor mu? (Resend / Postmark / SendGrid)
- [ ] Submit sonrası "Thank you" sayfasına yönlendiriliyor mu? (`/contact/bedankt/` — conversion event'i için kritik)
- [ ] Auto-reply geliyor mu? (60 saniye içinde gelmeli)
- [ ] CRM'e yazıyor mu? (HubSpot / Pipedrive / Notion)

### 3.3 Mevcut Conversion Path Skorları

| Touchpoint | Mevcut skor (10) | Sebep |
|---|---|---|
| Homepage hero | 7 | İyi headline, ROI calc, trust signals — ama fake numbers |
| Service page | 6 | Bullet'lar net, fiyat görünür — video/demo eksik |
| Tarieven | 7 | Tablolu, ay/yıl toggle var — but Stripe checkout entegre değil |
| Contact / Demo | 4 | Form var ama Calendly yok, fake numara, follow-up belirsiz |
| Mobil | 6 | Responsive ama hamburger nav, sticky CTA yok |
| Trust panel | 3 | Fake testimonialler, fake metrikler |
| Live chat | 0 | Yok |

### 3.4 Mobil UX

- ✅ Hamburger menü var
- ✅ Skip-to-content var
- ❌ **Sticky bottom CTA yok** — kurumsal sitelerde "Boek demo" sticky olmalı
- ❌ Click-to-call butonu yok (mobil için kritik)
- ❌ Click-to-WhatsApp butonu yok (NL %95 WhatsApp penetrasyonu — kullanmak zorundasın)
- ❌ Touch target boyutları kontrol edilmeli (Apple HIG: 44pt min)

### 3.5 Erişilebilirlik (Accessibility / WCAG 2.1 AA)

Hızlı tarama:
- ✅ `lang="nl"` tanımlı
- ✅ Skip link var
- ✅ ARIA-label çoğunlukla mevcut
- ⚠️ Renk kontrastları kontrol edilmeli (özellikle `text-slate-400` ve `text-slate-500` — koyu fonlarda WCAG AA fail edebilir)
- ⚠️ Form field error states (red border + error text) kontrol edilmeli
- ⚠️ Modal/cookie banner focus trap çalışıyor mu?
- ⚠️ Keyboard-only navigation tüm CTA'lara erişebiliyor mu?

**Aksiyon:** Lighthouse + axe DevTools + WAVE ile tüm sayfaları tara. Hedef: **Accessibility skoru ≥95**.

### 3.6 Mikro-etkileşimler ve Polish

İyi olan:
- Hero'da typing animation
- Reveal animasyonları
- Floating stats card
- Counter animations
- Cookie banner

Eksik:
- Form submit sonrası confetti/success animasyonu
- "Live demo" interactive widget (kullanıcı kendi mesajını yazıp Emma'nın cevabını canlı görsün)
- Pricing toggle haptic feedback (mobil için)
- "Live now: Marco beantwoordt nu een gesprek" — sosyal proof real-time widget

---

## 4. Growth Hacking Denetimi (Growth Hacker lensi)

### 4.1 AARRR Funnel Audit

**Pirate Metrics:** Acquisition · Activation · Retention · Referral · Revenue

#### Acquisition (Trafik kaynakları)

| Kanal | Mevcut durum | 30/60/90 gün önerim |
|---|---|---|
| **Organik (SEO)** | 0 (henüz indekslenmemiş) | Sitemap, schema, kennisbank → 30g'de 500 ziyaret/ay, 90g'de 5K |
| **AI Overviews / GEO** | Bloklu (robots.txt) | Aç + llms.txt → 90g'de 1K AI-driven ziyaret |
| **Local SEO (Rotterdam)** | LocalBusiness schema fake | Google Business Profile + gerçek adres + 10 review = "ai assistent rotterdam" top 3 |
| **Google Ads** | Yok | Marco için €15/gün → "ai receptionist nederland" → CPL hedef <€80 |
| **LinkedIn Ads** | Yok | Sponsored InMail → "MKB eigenaar 50-250 personeel" → CPL hedef <€150 |
| **Meta Ads (FB/IG)** | Yok | Awareness video kampanya — restoran/makelaar persona retargeting |
| **Cold outreach (e-mail)** | M zaten yapıyor (FleetTrack için) | FTH-OutreachBot mantığını Aanloop için klonla, Telecommunicatiewet'e uy |
| **Cold outreach (telefoon)** | Yok | Marco kendisini satabilir! Bu meta-pitch güçlü |
| **Partner kanalı** | Yok | Bookkeeper'lar, IT-MSP'ler, marketing bureauları affiliate (15% recurring) |
| **Content / Guest posts** | Yok | mkbservicedesk.nl, sprout.nl, emerce.nl gibi yayınlara guest post |
| **Webinar / Events** | Yok | KvK events, MKB Nederland branche bijeenkomsten |
| **Direct (marka)** | Henüz yok | M'in LinkedIn'i (kişisel brand) → company brand pull |
| **Referral** | Sistemik değil | Bkz. §4.4 |

#### Activation (İlk faydayı yaşatma)

Şu anki "activation" = demo görüşmesi yapmak. Ama:
- Demo'ya gelen %50'si demo iptal ediyor (rakip benchmark)
- Demo gelen %30'u "düşüneyim" diyor

**Hızlı kazanımlar:**

1. **Self-serve interactive demo**: kullanıcı kendi telefon numarasını girer, Marco onu **gerçekten** arar, kendi sesini deneyimler. Twilio + ElevenLabs entegrasyonu var → 2 saatte yapılır. Bu özellik tek başına conversion'ı 2-3x artırır.

2. **Demo öncesi interactive ROI calculator e-posta**: Kullanıcı slider'ları çekti → e-mail formu çıktı → "Stuur mij dit rapport" + lead capture. Şu anki ROI calc lead capture etmiyor.

3. **No-touch trial**: 7-gün ücretsiz "lite" Marco — sadece 50 telefon, kullanıcı kendi numarasını verir. Stripe trial otomatik. (60 günlük dev iş)

#### Retention

Marco/Emma SaaS modeli — retention KPI'leri:
- MRR churn rate (hedef: <%3/ay kurumsal, <%6/ay starter)
- NPS (hedef: 50+)
- Feature adoption (kullanıcı transcripts'i okuyor mu? CRM entegrasyonunu yapıyor mu?)

**Şu an retention bilgisi yok — çünkü belki gerçek müşteri yok.** İlk 10 müşteri iyi onboard edilmeli:
- Concierge onboarding (M telefon/Zoom ile)
- Weekly check-in ilk 4 hafta
- "Aanloop Slack/Discord community" — müşteriler birbirleriyle konuşur, churn düşer
- Aylık "Marco Insights" raporu — kullanıcı kaç gemiste lead'i Marco yakaladı, ne kadar para kazandırdı

#### Referral

Şu an sıfır. Aşağıdaki sistem öneriyorum:

**"Aanloop Ambassadors"** programı:
- Mevcut müşteri yeni müşteri getirirse: yeni müşteriye %20 ilk 6 ay indirim, ambassador'a €250 cash bonus VEYA 3 ay ücretsiz
- Otomatik tracking: her müşteriye unique link `aanloopai.nl/?ref=demoeknik` (UTM parametreli)
- Stripe Coupons + Notion'da ambassador dashboard

#### Revenue

Pricing yapısı OK ama:
- Yıllık plan iskontosu **%16** — düşük (industry std %20-25)
- "Starter" gerçek bir adım taşı değil — €297 hâlâ pahalı, dönüşüm yüzdesi düşük olur
- "Try before buy" yok

**Önerilen revenue katmanları:**

| Katman | Fiyat | Hedef segment | Stratejik amaç |
|---|---|---|---|
| Free trial (lite) | €0 / 14 gün | Tüm leads | Activation funnel |
| Solo | €97/ay | Eenmanszaak (50 calls/ay) | Land |
| Starter | €297/ay | Küçük MKB | Mevcut OK |
| Groei | €497/ay | Orta MKB | Mevcut OK |
| Pro | €1.250/ay | Büyük MKB (50-250 personel) | **YENİ** — multi-team, white-label, advanced reporting |
| Enterprise | Maatwerk (€2.500-€15.000+/ay) | 250+ personel, multi-locatie | SSO, on-prem optie, custom SLA, dedicated CSM |

### 4.2 Lead Magnet Stratejisi

Şu an sadece "Boek demo" CTA'sı. Tek touch — demo bookladı veya bookladmadı. Daha çok touch noktası gerekiyor:

| Lead magnet | Format | Hedef Persona | Funnel stage |
|---|---|---|---|
| "AI ROI Rapport" | PDF (auto-gen ROI calc'tan) | Owner / CFO | TOFU |
| "AI Implementatie Checklist 2026" | PDF (15 adımlık checklist) | Operations manager | MOFU |
| "Gemiste Telefoongesprekken Audit" | 5-min self-test (web tool) | Sales/service manager | MOFU |
| "Demo Marco — gratis 7-dagen toegang" | Video + trial credentials | Decision maker | BOFU |
| "AI in [Sector] — Brancherapport" | PDF, sektör başına 1 tane | Sektör müdürü | TOFU |
| Wekelijkse newsletter "Aanloop Insights" | Email | Tüm leads | Nurture |

### 4.3 Email Marketing / Nurture Sequence

Demo book ettikten sonra şu sequence:

```
Day 0 (instant): "Bedankt voor de boeking — voorbereiden in 3 stappen"
Day 1: Marco demo video (60 sec) "Hoe klinkt Marco?"
Day 2: Case study (sektörüne uygun)
Day 3: ROI hesaplama "Wat zou Marco voor uw bedrijf doen?"
Day 4 (demo dag): "Tot zo!" + agenda
Day 5 (post-demo): "Bedankt — hier is uw voorstel"
Day 7: Voorstel reminder
Day 10: "Vragen? Plan een follow-up call"
Day 14: "Last call — limited slot voor maand X"
```

Tool: **Loops.so (modern, simple, €49/ay)** veya **Resend Broadcasts** veya **HubSpot Free CRM + Marketing Hub Starter**.

### 4.4 Sosyal Kanıt Pompası

**Şu anki sosyal kanıt = sıfır gerçek.**

İlk 90 gün için "social proof velocity" kampanyası:

1. **İlk 5 müşteri = founding customer** programı (50% indirim ilk yıl, sözleşmesi karşılığında video testimonial + logo kullanım hakkı)
2. **Google Business Reviews**: müşterilerden review iste (otomatik post-onboarding e-mail)
3. **Trustpilot / KiyOh / Klantenvertellen**: NL'de B2B için Klantenvertellen veya Trustpilot
4. **LinkedIn case studies**: M'in kişisel LI'da haftada 1 case story
5. **Press**: Sprout.nl, Emerce.nl, MKB Nederland'a "Rotterdamse AI startup helpt MKB" PR'ı

### 4.5 PLG (Product-Led Growth) Sinyali

Aanloop AI henüz Sales-Led. Ama bazı PLG katmanları eklenmeli:

- **Public dashboard demo** (read-only): app.aanloopai.nl/demo — ziyaretçi görür "Bu Marco'nun gerçek dashboard'u"
- **Free tools**:
  - "AI Readiness Quiz" (10 soruluk webform → kişiselleştirilmiş rapor)
  - "Telefoongesprek transcript analyzer" — kullanıcı kendi recording'ini yükler, AI özetler
  - "AI prompt library voor MKB" — açık şablonlar
- **API explorer** — geliştirici-müşteri persona için

---

## 5. Kurumsal Hazırlık (Enterprise Readiness) Boşluk Analizi

Büyük şirketin (500+ personel, IT/Hukuk/Procurement süreciyle) sözleşme imzalama checklist'i:

### 5.1 Güvenlik & Uyumluluk (P0)

| Gereksinim | Mevcut | Gap |
|---|---|---|
| ISO 27001 sertifikası | İddia ediliyor (homepage trust signal) | **Belge yok**, "FleetTrack'in ISO'su" karıştırılmış |
| SOC 2 Type II | Yok | 6-12 aylık audit yolu — Vanta/Drata ile başla |
| AVG/GDPR DPA template | Yok | `/trust/dpa.pdf` indirilebilir olmalı |
| Pen-test raporu | Yok | Yıllık üçüncü-taraf pen-test — Cure53/Tweakers benzeri |
| Subprocessor listesi | Yok | `/trust/subprocessors/` — Twilio, ElevenLabs, OpenAI, Cloudflare, Hetzner kim ne yapar |
| Incident response policy | Yok | Trust merkezi'nde public excerpt |
| Data retention policy | Privacy verklaring var ama detay yok | Gespreksopname kaç gün saklanır? Transcripts? PII? |
| Right to be forgotten | UI yok | Self-serve "Verwijder mijn data" form |
| BCP / DR plan | Yok | RPO/RTO publik anlatım |
| Encryption at rest / in transit | Belirtilmemiş | "AES-256 at rest, TLS 1.3 in transit" trust sayfasında |

### 5.2 Hukuki & Sözleşmesel (P0-P1)

- [ ] Algemene voorwaarden — var mı kontrol etmeli (`/voorwaarden/` 200 dönüyor — içeriği kontrol et)
- [ ] Master Services Agreement (MSA) template
- [ ] Service Level Agreement (SLA) template — uptime %, response time, credits
- [ ] Data Processing Agreement (DPA) — AVG md.28
- [ ] Joint Controller Agreement (gerekirse)
- [ ] Terms of Use (eindgebruiker)
- [ ] Acceptable Use Policy (kötüye kullanım önleme)

### 5.3 Procurement-Friendly Materyaller (P1)

Kurumsal IT departmanı şunları ister:
- Security questionnaire (SIG-Lite, CAIQ, VSAQ formatları) — hazır cevaplar
- Vendor onboarding paketi
- W-form / KvK uittreksel
- Liability insurance certifikası
- Tax residency certifikası
- ISAE 3402 type II (hosting için Hetzner'in kendi raporu var)

### 5.4 Implementation & Onboarding (P1)

Kurumsal implementation 2-3 ay sürer. Site şunu göstermeli:
- Implementation timeline (visual gantt)
- Dedicated CSM (Customer Success Manager) iletişimi
- Project kick-off template
- Change management gids
- End-user training materyalleri
- Train-the-trainer modülü
- Hyperlink to support / SLA

### 5.5 Sales Enablement (P2)

Bunlar M'in commercial sürecini hızlandırır:
- ROI calculator detail edition (Excel/Google Sheets indirilebilir)
- Comparison sheet (vs. Genesys, vs. Zendesk Talk, vs. CallCenter Software)
- Battlecards (rakipler için)
- Case studies (gerçek)
- Reference architecture diagrams (kurumsal IT için)

---

## 6. İçerik Stratejisi (Content Strategy)

### 6.1 İlk 30 günde yazılması gereken kennisbank yazıları

Bunlar mevcut TOC'ta listeli ama 404 — yazılmaları lazım:

| # | Slug | Hedef KW | Aylık hacim | Pillar/cluster |
|---|---|---|---|---|
| 1 | `/kennisbank/wat-is-ai-receptionist/` | wat is een ai receptionist | 90 | Marco pillar |
| 2 | `/kennisbank/ai-implementatie-mkb-7-stappen/` | ai implementeren mkb | 110 | Implementation cluster |
| 3 | `/kennisbank/roi-ai-assistent-berekenen/` | roi ai berekenen | 90 | ROI cluster |
| 4 | `/kennisbank/whatsapp-business-api-ai-2026/` | whatsapp business api ai | 210 | Emma pillar |
| 5 | `/kennisbank/ai-horeca-toepassingen/` | ai voor horeca | 170 | Sector cluster |
| 6 | `/kennisbank/ai-avg-mkb-compliance/` | ai avg compliance | 320 | Compliance cluster |

**Yazı uzunluğu hedefi:** Pillar yazılar 2.000-3.000 kelime, cluster yazılar 1.200-1.800. Her yazıda:
- TOC (anchor link'li)
- Yazar kutusu (LinkedIn link'li)
- En az 1 grafik/diagram (kendin oluştur)
- "Verder lezen" — ilgili 3 yazı
- Soft CTA (lead magnet)
- Hard CTA (demo book)
- FAQ schema (en az 4 Q&A)

### 6.2 İlk 90 günde sektör pillarları

Her sektör sayfası şu alt sayfalara sahip olmalı:

```
/sectoren/horeca/
├── /sectoren/horeca/no-show-reductie/
├── /sectoren/horeca/reserveringen-ai/
├── /sectoren/horeca/voorraadprognose/
└── /sectoren/horeca/tafel-omloop-optimaliseren/

/sectoren/vastgoed/
├── /sectoren/vastgoed/bezichtigingen-plannen/
├── /sectoren/vastgoed/lead-kwalificatie/
└── /sectoren/vastgoed/whatsapp-makelaar/

(her sektör için 3-4 alt sayfa = ~24 yeni sayfa, hepsi keyword-targeted)
```

### 6.3 Programmatic SEO Fırsatı

Aanloop'un yapısı programmatic SEO için ideal:

- 6 sektör × 4 dienst = **24 kombinasyon sayfası** otomatik (örnek: `/sectoren/horeca/marco/` "AI Receptionist voor Horeca")
- 12 büyük NL şehri × 5 ana keyword = **60 lokal sayfa** (örnek: `/locaties/rotterdam/ai-receptionist/`)

Astro content collections + dinamik route ile 1 günde build edilir, doğru yapılırsa **6 ayda 200-500 long-tail keyword'de top 10**.

⚠️ **Dikkat:** Programmatic SEO **thin content** olursa Google penalty verir. Her sayfa MİNİMUM 800 kelime özgün içerik + sektör/şehir-spesifik veri (gerçek müşteri sayısı, vaka, contact bilgisi) olmalı.

---

## 7. Performans / Core Web Vitals

Şu anki ölçüm (curl ile, sentetik):
- TTFB: 73ms ✅ (mükemmel — hedef <200ms)
- HTML size: 52KB ✅ (hedef <100KB)
- CSS bundle: `aanvragen.B6oXhPxV.css` (boyut bilinmiyor)
- JS bundle: `hoisted.BEBOEhsY.js`

**Yapılması gerekenler:**

1. **Lighthouse audit çalıştır** her sayfa için (mobile + desktop):
   ```bash
   npx lighthouse https://aanloopai.nl --form-factor=mobile --view
   ```
   Hedef skorlar: **Performance 95+, Accessibility 95+, Best Practices 95+, SEO 95+**

2. **Real User Monitoring (RUM)** kur — Cloudflare Web Analytics (ücretsiz) veya Speedcurve

3. **Core Web Vitals hedefleri** (Mart 2024 SI):
   - LCP < 2.5s ✅ (muhtemelen şu an OK)
   - INP < 200ms (yeni metric — JS heavy sayfalarda risk)
   - CLS < 0.1 (font swap, image dimensions check)

4. **Image strategy**:
   - Logo SVG ✅
   - Diğer görseller: WebP/AVIF, `<picture>` ile fallback, lazy loading, `width`/`height` set
   - Astro'nun `<Image>` component'ini kullan (otomatik optimization)

5. **Font strategy**:
   - Google Fonts → self-host woff2 (Cloudflare cache'i)
   - `font-display: swap`
   - Preload yalnızca above-fold font

---

## 8. Analytics, Attribution, Experimentation

### 8.1 Mevcut

Hiç yok. ❌

### 8.2 Önerilen Stack (Privacy-first, AVG-uyumlu)

| Katman | Tool | Maliyet | Kurulum süresi |
|---|---|---|---|
| Web analytics | **Plausible** (privacy-first, NL hosted) veya **PostHog Cloud EU** | €9-19/ay | 1 saat |
| Server-side tagging | Cloudflare Web Analytics + Custom events | Free | 2 saat |
| Heatmap / session replay | **PostHog** (her ikisini de yapar) | Same as above | Built-in |
| Form analytics | Plausible custom events veya HotJar EU | €0-49/ay | 2 saat |
| A/B testing | PostHog Experiments veya VWO | $0-99/ay | 1 gün |
| Conversion tracking | Cloudflare + Stripe webhook | Free | 4 saat |
| Error tracking | Sentry EU region | €26/ay | 2 saat |
| Uptime monitoring | UptimeRobot veya Better Stack | €0-29/ay | 30 dk |

**AVG önemli:** Google Analytics 4 NL'de tartışmalı (DPA Hollanda 2022 ruling — uygunsuz). **Plausible / PostHog EU** önemli — cookie banner'a ihtiyaç bile yok (Plausible çerez kullanmıyor).

### 8.3 Kritik Conversion Events

Bu event'leri hemen tanımla:

```js
// Plausible / PostHog
plausible('Demo Booked', { props: { source: 'hero', service: 'marco' } });
plausible('ROI Calculator Used', { props: { savings: 18720 } });
plausible('Pricing Plan Clicked', { props: { plan: 'groei' } });
plausible('Service Page Viewed', { props: { service: 'marco' } });
plausible('Form Submitted', { props: { type: 'contact' } });
plausible('Phone Click', { props: { source: 'header' } });
plausible('Newsletter Signup', { props: {} });
```

### 8.4 Hedef Funnel KPI'ları (90 gün)

| Stage | Mevcut | 90 gün hedef |
|---|---|---|
| Aylık unique visitors | <100 | 5.000 |
| Demo booking rate | n/a | %3 (= 150 demo/ay) |
| Demo → proposal | n/a | %60 |
| Proposal → close | n/a | %30 |
| Aylık net new MRR | €0 | €5.000 (~10 starter klant) |
| Funnel conversion (visitor → klant) | n/a | %0.5-1.0 |

---

## 9. Rakip Karşılaştırması (Competitive Benchmark)

NL'de yapılan AI MKB pazarındaki yakın rakipler:

| Rakip | Güçlü yanı | Zayıf yanı | Aanloop'un farkı (olmalı) |
|---|---|---|---|
| **easydata.nl** (Apeldoorn) | Microsoft 365 derin entegrasyon, ISO 27001 gerçek | Ürün dağınık, fiyat opak | Ürün tabanlı: Marco/Emma açık SKU |
| **iam-ai.nl** | Voice AI demo number, CRM dahil | Marka korkutucu jargon | Daha temiz UX + sektörel odak |
| **slimiq.nl** | Net case (Pieter, installatie) + concrete cijfers | Az ürün, projeler bazlı | Aanloop self-serve productized |
| **aiagency.nl** | "50+ implementations" dürüst | Vague offering | Aanloop daha keskin: 4 net SKU |
| **mk-beter.nl** | "WebLLM = €0 AI kosten" — radikal pricing | Niche (sadece factuur+BTW) | Aanloop genel-amaçlı |
| **timmermansmedia.nl** | GEO + SEO uzmanlığı | Marketing ajansı, AI yan ürün | Aanloop **AI-first** |

### 9.1 Aanloop'un olası farklılaştırma açıları

Bunlardan **EN AZ İKİSİNİ** açıkça sahiplen:

1. **"AI agent voor MKB die uw taal spreekt — letterlijk én figuurlijk"**
   - Vloeiend NL TTS (ElevenLabs Dutch voices)
   - Bilingual (Türkçe-NL desteği — NL'de 400K Türk kökenli, ulaşılmamış pazar 🎯)

2. **"Live binnen 7 dagen — gegarandeerd"**
   - SLA: ödeme iadesi eğer geç kalırsa
   - Net rakipsiz pozisyon (rakipler 4-12 hafta diyor)

3. **"Geen kosten per gesprek, geen verrassingen"**
   - Flat-rate pricing (Aanloop bunu zaten yapıyor — ÇOK güçlü, daha vurgu)
   - Karşılaştırma sayfası: "Genesys vs Aanloop: bei 5K calls/maand, Genesys €4.500, Aanloop €497"

4. **"Multi-channel uit één centrale stem"** — telefon + WhatsApp + e-mail aynı brain
   - Rakipler tek kanal, Aanloop bütünleşik

5. **"Dogfooding"** — Marco, Aanloop'un kendi telefonunu da yönetiyor; Emma, Aanloop'un kendi WhatsApp'ını
   - "Bel ons en spreek met Marco zelf" — rakipler bunu yapmıyor

---

## 10. Hızlı Düzeltmeler (Code-Ready Snippets)

### 10.1 Astro config — canonical fix

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://aanloopai.nl',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
  ],
});
```

### 10.2 robots.txt (yeni)

```
# /public/robots.txt
User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: CCBot
Allow: /

Sitemap: https://aanloopai.nl/sitemap-index.xml
```

### 10.3 Düzeltilmiş JSON-LD (homepage'a yapıştır)

```html
<!-- Organization -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://aanloopai.nl/#organization",
  "name": "Aanloop AI",
  "alternateName": "AanloopAI",
  "url": "https://aanloopai.nl",
  "logo": {
    "@type": "ImageObject",
    "url": "https://aanloopai.nl/brand/logo-512.png",
    "width": 512,
    "height": 512
  },
  "description": "AI-oplossingen voor het Nederlandse MKB — kant-en-klare AI-assistenten en custom workflows.",
  "foundingDate": "2026-04",
  "founder": { "@type": "Person", "name": "[GERÇEK İSİM]" },
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[GERÇEK SOKAK]",
    "addressLocality": "Rotterdam",
    "postalCode": "[3000-3099 GERÇEK]",
    "addressCountry": "NL"
  },
  "vatID": "NL[GERÇEK BTW]B01",
  "taxID": "[GERÇEK KvK]",
  "contactPoint": [{
    "@type": "ContactPoint",
    "telephone": "+31[GERÇEK]",
    "email": "hello@aanloopai.nl",
    "contactType": "sales",
    "availableLanguage": ["Dutch", "English"]
  }],
  "sameAs": [
    "https://www.linkedin.com/company/aanloop-ai",
    "https://twitter.com/aanloopai"
  ]
}
</script>

<!-- WebSite + SiteSearch -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://aanloopai.nl/#website",
  "url": "https://aanloopai.nl",
  "name": "Aanloop AI",
  "publisher": { "@id": "https://aanloopai.nl/#organization" },
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://aanloopai.nl/zoeken/?q={search_term}",
    "query-input": "required name=search_term"
  },
  "inLanguage": "nl-NL"
}
</script>

<!-- Service: Marco (örnek — diğer hizmetler için tekrar et) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://aanloopai.nl/diensten/marco/#service",
  "name": "Marco AI Receptionist",
  "provider": { "@id": "https://aanloopai.nl/#organization" },
  "serviceType": "AI Phone Receptionist",
  "areaServed": { "@type": "Country", "name": "Netherlands" },
  "audience": {
    "@type": "BusinessAudience",
    "audienceType": "MKB Nederland"
  },
  "availableLanguage": ["nl", "en", "de", "fr", "es"],
  "offers": {
    "@type": "AggregateOffer",
    "priceCurrency": "EUR",
    "lowPrice": "297",
    "highPrice": "497",
    "offerCount": 2
  }
}
</script>

<!-- BreadcrumbList (her iç sayfaya) -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://aanloopai.nl/" },
    { "@type": "ListItem", "position": 2, "name": "Diensten", "item": "https://aanloopai.nl/diensten/" },
    { "@type": "ListItem", "position": 3, "name": "Marco", "item": "https://aanloopai.nl/diensten/marco/" }
  ]
}
</script>
```

### 10.4 Security headers (Cloudflare Pages `_headers` dosyası)

```
# /public/_headers
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://plausible.io https://*.posthog.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://plausible.io https://*.posthog.com; frame-ancestors 'none';

/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/brand/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=604800
```

### 10.5 Meta improvements (her sayfaya ek)

```html
<!-- Eksikleri ekle -->
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta name="googlebot" content="index, follow">
<meta name="author" content="Aanloop AI">
<meta name="publisher" content="Aanloop AI">
<meta name="format-detection" content="telephone=yes, address=no, email=yes">

<!-- Hreflang (EN versiyonu yapıldıysa) -->
<link rel="alternate" hreflang="nl-NL" href="https://aanloopai.nl/" />
<link rel="alternate" hreflang="en-US" href="https://aanloopai.nl/en/" />
<link rel="alternate" hreflang="x-default" href="https://aanloopai.nl/" />

<!-- Twitter handle -->
<meta name="twitter:site" content="@aanloopai">
<meta name="twitter:creator" content="@aanloopai">

<!-- Article meta (kennisbank için) -->
<meta property="article:published_time" content="2026-04-29T10:00:00+02:00">
<meta property="article:modified_time" content="2026-04-29T10:00:00+02:00">
<meta property="article:author" content="https://www.linkedin.com/in/[GERÇEK]">
<meta property="article:section" content="AI voor MKB">
<meta property="article:tag" content="AI, MKB, Nederland">
```

### 10.6 Sticky mobile CTA bar

```html
<!-- Bottom of <body>, mobil only -->
<div class="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 px-4 py-3 flex gap-2 shadow-2xl">
  <a href="tel:+31[GERÇEK]" class="flex-1 btn-outline text-center text-sm py-3">
    📞 Bel ons
  </a>
  <a href="https://wa.me/31[GERÇEK]" class="flex-1 btn-outline text-center text-sm py-3">
    💬 WhatsApp
  </a>
  <a href="/contact/?type=demo" class="flex-1 btn-primary text-center text-sm py-3">
    🚀 Demo
  </a>
</div>
<!-- main content alt padding'i: pb-24 lg:pb-0 -->
```

### 10.7 ROI Calculator → Lead Capture

```js
// ROI sonucunu lead'e çevir — calculator'ın altına ekle
<button id="roi-email" class="btn-outline w-full mt-3">
  📧 Stuur dit rapport naar mijn e-mail
</button>

<script>
document.getElementById('roi-email').addEventListener('click', () => {
  // Modal aç
  // Email + Bedrijfsnaam fields
  // Submit → POST to /api/roi-report (Cloudflare Pages Function)
  // Loops.so / Resend ile auto-send PDF
  // plausible('ROI Report Requested', { props: { savings: ... } });
});
</script>
```

---

## 11. Uygulama Yol Haritası — 14 / 30 / 60 / 90 Gün

### 🔴 İlk 14 gün (BLOCKER fixes — bu olmadan Google'a sunma)

**Gün 1-2 (CRITICAL — bugün bitir)**

- [ ] **Astro config'de `site: "https://aanloopai.nl"`** — tek satır, 1 dakika, deploy
- [ ] **Tüm fake bilgileri çıkar** — KvK 12345678, telefon 010-000-0000, hello@aanloop.ai (→ aanloopai.nl)
- [ ] **Fake testimonialları kaldır** veya "Voorbeeldscenario" diye etiketle (yasal güvenli)
- [ ] **Fake team üyeleri kaldır** veya gerçek isimleri/fotoğrafları koy
- [ ] **"500+ klanten", "ISO 9001/27001", "€2.4M bespaard" iddialarını kaldır** veya kanıtla
- [ ] **Cloudflare DNS panel'den `aanloop.ai` domain'i sat** (~€100-300 yıl) veya kalıcı olarak `.nl`'ye karar ver

**Gün 3-7 (HIGH PRIORITY)**

- [ ] **Sitemap.xml ekle** (`@astrojs/sitemap` paketi)
- [ ] **robots.txt'i custom yap** (AI bot'ları allow)
- [ ] **Google Search Console** (DNS TXT verify) + sitemap submit
- [ ] **Bing Webmaster Tools** kayıt + sitemap
- [ ] **Plausible / PostHog EU** kur (5 dakika iş)
- [ ] **Twilio NL number** + Cloudflare Pages Function for click-to-call event
- [ ] **WhatsApp Business** + click-to-WhatsApp link
- [ ] **Tüm sayfalara meta robots ve max-image-preview** ekle
- [ ] **Schema.org temizliği** — Organization (gerçek bilgilerle), WebSite, Service, BreadcrumbList

**Gün 8-14 (Foundation)**

- [ ] **Calendly / Cal.com** entegrasyon (`/contact/?type=demo` → embedded calendar)
- [ ] **Form backend** — Cloudflare Pages Functions + Resend (5 satır kod)
- [ ] **"Bedankt"-pagina** (`/contact/bedankt/`) + conversion event tracking
- [ ] **Sticky mobile CTA bar**
- [ ] **Voice demo number** — kullanıcı arasın, Marco cevaplasın (M zaten Marco'yu canlı yaptı, sadece public expose et)
- [ ] **Tüm title/meta description'ları** §2.2.1 tablodaki gibi güncelle

### 🟠 14-30 gün (MOMENTUM)

- [ ] **Trust merkezi** (`/trust/` veya `trust.aanloopai.nl`):
  - Security overview
  - Compliance certificates (gerçekleri)
  - DPA template (PDF)
  - Subprocessor list
  - Incident response policy excerpt
- [ ] **6 kennisbank yazısı yayınla** (§6.1)
- [ ] **3 gerçek case study** (founding customers'tan, anonimleştirilebilir)
- [ ] **Comparison sayfaları** — `/vergelijk/genesys/`, `/vergelijk/zendesk-talk/`
- [ ] **EN sayfası** (homepage + 4 service page) — kurumsal multinational için
- [ ] **Google Business Profile** (Rotterdam) + ilk 5 review iste
- [ ] **LinkedIn Company Page**'i tamamen doldur (founding story, services, jobs)

### 🟡 30-60 gün (GROWTH ENGINE)

- [ ] **Self-serve trial flow** — kullanıcı websitesinde formla başlatır, 14 gün sonra Stripe checkout
- [ ] **Email nurture sequence** (§4.3)
- [ ] **Referral programı** (Aanloop Ambassadors)
- [ ] **Sektörel programmatic SEO** — 24 dienst×sektör kombinasyon sayfası
- [ ] **Şehir bazlı landing'ler** — Amsterdam, Utrecht, Den Haag, Eindhoven, Rotterdam
- [ ] **Webinars** — "AI in [sektör]" 4 haftalık seri
- [ ] **Video content** — Marco/Emma demo videoları (YouTube + embedded)
- [ ] **Free tools** — AI Readiness Quiz, ROI Calculator (downloadable Excel), Transcript Analyzer
- [ ] **Google Ads** — €15-30/gün, kontrollü + LinkedIn Ads test
- [ ] **3 cold outreach kanalı** — e-mail (FTH-style bot), LinkedIn DM, telefon (Marco kendisi!)

### 🟢 60-90 gün (SCALE)

- [ ] **SOC 2 Type II audit** başlat (Vanta/Drata) — kurumsal müşteri için 6+ aylık yolculuk
- [ ] **API documentation** (`docs.aanloopai.nl` — Mintlify)
- [ ] **Status page** (`status.aanloopai.nl` — Better Stack)
- [ ] **Customer dashboard** v1 (`app.aanloopai.nl`)
- [ ] **"Aanloop Academy"** — eğitim kursu (lead magnet + community)
- [ ] **Partner programı** — bookkeeper'lar, marketing ajansları (15% revshare)
- [ ] **PR campaign** — Sprout, Emerce, MKB Servicedesk, BNR Nieuwsradio
- [ ] **3 büyük guest post** (mkbservicedesk.nl, sprout.nl, frankwatching.com)
- [ ] **Conferences** — Emerce eDay, MKB Nederland Innovation Day
- [ ] **A/B testing programı** — homepage hero, pricing page, demo CTA copy

---

## 12. Risk & Compliance Notları

### 12.1 Yasal Riskler (Hollanda hukuku)

| Risk | Şu anki ihlal | Düzeltme |
|---|---|---|
| Misleidende handelspraktijken (Wet OHP, Burgerlijk Wetboek 6:194) | Fake testimonialler, "500+ klanten", "ISO 9001/27001 sertifikalı" | Kaldır veya kanıtla |
| Reclame Code Commissie (NRC) | "vloeiend Nederlands" net ama "best in class" gibi superlative kontrol et | Specific claims |
| Fake KvK numarası | 12345678 — düzgün sözleşme imzalanamaz | Gerçek KvK gereksinimi |
| AVG md. 13/14 (privacy notice) | Privacy verklaring var ama detay düşük | DPA template + Subprocessor list ekle |
| Cookie wet (Telecommunicatiewet 11.7a) | Cookie banner var ama "alleen functioneel" varsayılan değil | Default reject + opt-in tracking |
| Telecommunicatiewet 11.7 (cold e-mail) | Bilinmiyor — outreach plan yapılınca gerekli | ZZP/eenmanszaak listelerinden uzak dur (M zaten biliyor) |

### 12.2 Marka/Trademark

- "Aanloop AI" ismi BOIP / EUIPO'da tescilli değilse, başkası alabilir
- **Aksiyon:** BOIP Benelux merkez tescilini başlat — €260, online, 4 ay (boip.int)
- Domain portfolio: `aanloopai.com`, `aanloop.ai`, `aanloop.nl`, `aanloop-ai.nl` — tümünü al + 301 redirect

### 12.3 Veri Lokalizasyon

Site "100% EU dataverwerking" diyor. Bu doğru olmalı:
- ElevenLabs (US-based) — Enterprise plan'de EU region var, ama Starter'da yok
- OpenAI — EU residency Q3 2024'ten beri var ama ücretli tier
- Twilio — Frankfurt (eu-fra) bölgesi var
- Cloudflare — global CDN ama EU data centers
- Hetzner — Almanya, OK
- Dify — self-hosted in M's VPS, OK

**Aksiyon:** Trust sayfasında "Subprocessor list" altında her vendor'un EU residency durumunu açık yaz.

---

## 13. Hedef KPI'lar / Success Metrics

| KPI | Bugün | 30 gün | 90 gün | 12 ay |
|---|---|---|---|---|
| Indexlenen sayfa | 0-5 | 25 | 80 | 250+ |
| Organik trafik (uniques/ay) | <100 | 800 | 5.000 | 25.000 |
| Aylık demo bookings | 0 | 8 | 40 | 200 |
| Aylık new customers | 0 | 1-2 | 8-12 | 30-50 |
| MRR | €0 | €500 | €5.000 | €40.000 |
| Average customer LTV | n/a | n/a | €3.500 | €8.000 |
| CAC (yapay) | n/a | <€500 | <€800 | <€1.200 |
| LTV:CAC | n/a | n/a | 4.4:1 | 6.7:1 |
| NPS | n/a | n/a | 40+ | 55+ |
| Aylık churn | n/a | <%8 | <%5 | <%3 |
| Google Pagerank "ai assistent mkb" | yok | top 50 | top 15 | top 5 |
| Google Pagerank "ai receptionist nederland" | yok | top 30 | top 10 | top 3 |

---

## 14. Önemli Notlar (M için kişisel)

### 14.1 FleetTrack ile sinerji

Aanloop AI henüz erken ama FleetTrack'in 500+ aktif klantı **inanılmaz değerli**. Bunlar:
- Halen telefon görüşmesi yönetiyor (filo yöneticisi olduğu için)
- AI asistana ihtiyacı yüksek
- M ile zaten ilişkisi var → güven hazır

**Stratejik öneri:** "FleetTrack klantlarına özel Aanloop AI kampanyası" — €100/ay 6 ay indirim. 50 müşteri'den 5'i alırsa = €1.500/ay startup gelir + canlı case study + güçlü social proof.

### 14.2 İki marka, tek strateji

Aanloop AI ve FleetTrack Holland aynı altyapıyı (Hetzner VPS, OpenClaw, Dify) paylaşıyor. Ama markalar ayrı görünmeli:
- Aanloop AI = horizontal AI agent platformu (sektör nötr)
- FleetTrack Holland = vertical fleet management
- Asla site içinde "ayrıca FleetTrack..." referansı verme — markaları sulandırır
- Ama M'in LinkedIn profilinde "Founder, Aanloop AI & FleetTrack Holland" göstermek **founder credibility** verir

### 14.3 Marco'yu kendin sat

Şu anki en güçlü satış demos: M'in Aanloop AI'ya gelen lead'lere **Marco'nun kendisi cevap versin**. "Hello, dit is Marco. Ik ben de AI-receptionist van Aanloop AI. Hoe kan ik u helpen?" Eğer doğru çalışırsa "show, don't tell" — rakipler bunu yapmıyor.

### 14.4 İlk 10 müşteri kuralı

İlk 10 müşteriye **konsiyerj-seviyesinde** servis ver:
- M kişisel olarak haftalık check-in
- Custom slack/discord channel
- Free additions (extra callscript, free CRM integration)
- Karşılığında: Anonim olmayan video testimonial + LinkedIn referral

Bu 10 müşteri 6 ay sonra büyüme motoru olur. Bütün scaling stratejileri **5'inci müşteriden sonra** anlam kazanır, daha önce müşteri başına 50% zamanını ver.

---

## 15. Kapanış — Eylem Çağrısı

Bu sitede temel mimari ve görsel iyi. Yıkıcı sorunlar **veri kalitesi (fake info) + SEO yapılandırması (canonical/sitemap)** çevresinde. Bunlar 1-2 günlük teknik iş + 3-5 günlük içerik temizliği.

Eğer sırayla çalışırsan:
1. **Bugün (2 saat):** §11'in "Gün 1-2" maddelerini bitir → site indekslenmeye hazır hale gelir
2. **Bu hafta (8-12 saat):** §11'in "Gün 3-7" + "Gün 8-14" maddeleri → ölçülebilir + dönüştürebilir hale gelir
3. **Bu ay (40-60 saat):** §11'in "14-30 gün" maddesi → ilk 5-8 müşteri gelir
4. **3 ayda:** Kurumsal hazırlık + ölçek motoru → MRR €5K+

Bu yol haritası **growth ile mimari**yi aynı düzleme koyar — birini ihmal edersen diğeri çürür. Her sprint sonunda `tasks/lessons.md`'yi güncelle (CLAUDE.md kuralı), ölçüm yap, iterate et.

— Hazırladı: System Architect + Growth Hacker + UX Strategist + SEO Engineer roller, Aanloop AI için.

---

**Versiyon:** 1.0 · 29 April 2026
**Sonraki gözden geçirme:** 14 gün sonra (P0 düzeltmeleri sonrası teknik tekrar audit)
