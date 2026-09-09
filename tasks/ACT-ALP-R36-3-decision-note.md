# Decision Note — ACT-ALP-R36-3: Partnerkanaal opzetten (aanloopai.nl)

- **status**: `completed_already_shipped`
- **task**: Partnerkanaal opzetten — boekhouders/accountants, VoIP-resellers, praktijk-/salonsoftwareleveranciers als doorverwijzers; white-label demo-nummer per partner; eerste 10 partners handmatig; partnerpagina + onboarding-kit.

## Objection-resolutie (agora FATAL-checks)

1. **"site_publish absent → blocked"** — **YANLIŞ PREMİSE.** `site_publish` mevcut ve çalışıyor (`list` → 6 site; `sync` → aanloopai/website, master@ef1859a). Bu itiraz doğrulanamadı.
2. **"VGBA/NBA: 15–20% recurring kickback kanal öldürür"** — **ÇÖZÜLDÜ.** Canlı sayfa hiçbir sabit yüzde yayınlamıyor. Doğrulama (webfetch, canlı URL, HTTP 200): "15%", "20%", "clawback", "90 dagen", "12 maanden" kelimeleri sayfada **yok**. Fee yapısı yalnızca partner sözleşmesinde, kişiye özel olarak belirleniyor; FAQ'da açıkça "geen generiek percentage". VGBA bölümü NBA-registered accountants için üç yasal yapı sunuyor: (a) vergoeding tamamen müşteriye geri akar, (b) transparant lead-fee offerte'de açıkça belirtilir, (c) yalnızca yasal olarak kabul edebilen taraflara ödeme. Sözleşmede "alleen uitbetaald aan partijen die ze wettelijk mogen ontvangen" maddesi var.
3. **"Publish 15–20% recurring + 12-month cap + 90-day clawback on live page"** — **GERÇEKLEŞMEDİ.** Böyle bir içerik asla yayınlanmadı; canlı sayfa kontrol edildi (yukarıda).

## Yapılan iş

- `site_publish(list)` → site bulundu: `aanloopai.nl` → repo `aanloopai/website`, branch master, mapping verified.
- `site_publish(sync)` → workspace `/sites/aanloopai.nl` @ ef1859a.
- En küçük değişiklik: **sıfır satır** — hedef teslimat (partnerpagina + onboarding açıklaması + VGBA/AVG-veilig fee-model + footer link + sitemap) zaten HEAD'de mevcut: `src/pages/partners.astro` (140 satır, WebPage+FAQPage schema), `src/components/Footer.astro:228` linki, `public/sitemap.xml` girişi (lastmod 2026-09-09).
- Doğrulama: canlı `https://aanloopai.nl/partners/` HTTP 200, istenmeyen yüzde/clawback içermiyor; tüm CTA'lar mevcut sayfalara işaret ediyor (`/contact/?type=offerte` contact.astro'da `type` query param'ı olarak işleniyor; `/diensten/emma/` mevcut).
- `site_publish(status)` → diff boş (protected paths dokunulmadı). Publish atlandı — boş diff'ı commit etmek anlamsız.

## Kalan iş (owner-gated, bu run'da yapılmadı)

- İlk 10 partnerin **handmatig werven** — dış servise kayıt/mail gerektirir; kısıt gereği bu run'da yok. Sayfa + kit altyapısı hazır.
- White-label demo-nummer provisioning'i operasyonel adım; sayfada taahhüt edilen akış, sözleşme+onboarding aşamasında gerçekleşir.

## Sonuç

Talep edilen teslimatın tamamı (partnerpagina, üç partner profili, VGBA-veilig fee-model, AVG bölümü, onboardingkit açıklaması, footer/sitemap) zaten canlı ve yasal olarak savunulabilir formatta. İtirazlar #2 ve #3'ün tarif ettiği riskli içerik hiç var olmadı.
