# Pillar Prompts — 5 İçerik Direği

> Her direk Claude'a verilecek **user prompt**'tur.
> Her zaman `brand-voice.md` ile beraber gönderilir (system prompt olarak brand-voice).
> Output her zaman JSON, **per-platform array** olarak.

---

## Pillar 1 — Monday: AI News & Aanloop Take

**Trigger:** Her Pazartesi 07:30 NL
**Platform set:** LinkedIn, Instagram, Facebook, X
**Source:** RSS feeds (TechCrunch AI, AI News, Bright NL, NRC Tech)

```
Kontekst:
{rss_top_5_articles}  ← n8n RSS node'undan top 5 Hollanda/AI haberi

Görevin:
1. Bu 5 haber arasından bir tanesini seç — Hollanda MKB için en alakalı olan.
2. O habere Aanloop AI'nin ilkesel duruşunu ifade eden bir post yaz.
3. Güçlü hook (ilk satır soru ya da paradox).
4. Aanloop'un nasıl bir çözüm sunduğunu doğrudan satmadan ima et.
5. CTA rotasyonundan #3'ü kullan: "Welke taak kost jou de meeste tijd? Reageer hieronder."

Platform variants oluştur:
- LinkedIn (NL, 700-900 char)
- Instagram (NL, 250-350 char + image_prompt)
- Facebook (NL, 350-500 char)
- X (EN, ≤270 char + 1 link to source article)

Output: JSON array of 4 platform objects per brand-voice.md format.
Pillar: news, weekday: monday, campaign: news_{YYYYMMDD}
```

---

## Pillar 2 — Tuesday: Sector Spotlight

**Trigger:** Her Salı 07:30 NL
**Platform set:** LinkedIn, Instagram, Facebook, X
**Source:** `data/sectors.json` — round-robin (haftalık index)

```
Kontekst:
Bu hafta sektör: {sector_data}  ← sectors.json'dan bu haftanın objesi
Mevcut AI servisi adayları: {top_3_matching_services}  ← services.json'dan sector ile uyumlu

Görevin:
1. Bu sektördeki MKB'nin somut bir ağrı noktasını al ({sector.pain_points_nl[0|1|2]} arasından).
2. Aanloop'un hangi servisi ile çözdüğünü göster — `{example_metric_nl}` ile somutlaştır.
3. Hollanda firmasıyla örnek senaryo: `{sector.example_company_nl}`. ASLA "müşterimiz" deme — `"voorbeeldscenario"` veya `"stel je voor"` kullan.
4. CTA: rotasyon #4 ("Stuur een DM voor een use case in jouw sector.")
5. Sector hashtag'lerini ek: `{sector.hashtags_nl}`

Platform variants:
- LinkedIn (NL, 800-900 char) — 3 paragraf: probleem, oplossing, resultaat
- Instagram (NL, 300-400 char + image_prompt: "{sector.name_nl} icoon + benefit text")
- Facebook (NL, 400-500 char) — soruyla aç
- X (EN, ≤270 char) — "How {sector EN} firms save X with AI"

Output: JSON array of 4 platform objects.
Pillar: sector, weekday: tuesday, campaign: sector_{sector.id}_{YYYYMMDD}
```

---

## Pillar 3 — Wednesday: Practical Tip

**Trigger:** Her Çarşamba 07:30 NL
**Platform set:** LinkedIn, Instagram, Facebook, X
**Source:** `data/tips.json` — round-robin

```
Kontekst:
Bu hafta tip: {tip_object}  ← tips.json'dan bu hafta seçilen
Tip: {tip_object.tip_nl}
Kategori: {tip_object.category}
İlgili sektör tag'leri: {tip_object.sector_tag}

Görevin:
1. Bu tip'i somutlaştır — adım adım nasıl uygulanır (3-5 adım).
2. Tahmini tasarrufu belirt (örn: "Bespaart 2 uur per week").
3. "Geen technische kennis vereist" gibi erişilebilirlik vurgula.
4. CTA: rotasyon #1 ("Plan een gratis demo van 15 minuten → aanloopai.nl")
5. Ne zaman aşmamalı: 800 karakter LinkedIn'de.

Platform variants:
- LinkedIn (NL, 600-800 char) — adım adım liste
- Instagram (NL, 200-300 char) — 1 cümle hook + 3 adım
- Facebook (NL, 300-400 char) — soruyla
- X (EN, ≤270 char) — single tip + link

Output: JSON array of 4 platform objects.
Pillar: tip, weekday: wednesday, campaign: tip_{tip.id}_{YYYYMMDD}
```

---

## Pillar 4 — Thursday: Service Spotlight

**Trigger:** Her Perşembe 07:30 NL
**Platform set:** LinkedIn, Instagram, Facebook, X
**Source:** `data/services.json` — round-robin (haftalık)

```
Kontekst:
Bu hafta servis: {service_data}  ← services.json'dan bu haftanın objesi

Görevin:
1. Bu servisin TEK ana faydasıyla aç (= `{service.primary_benefit_nl}`).
2. Servisin ne yaptığını business outcome terimleriyle açıkla, teknik jargonu minimum tut.
3. 3 kullanım senaryosu listele (`features_nl[0..2]` esinlenebilir).
4. Fiyat IPUCU: "vanaf €{pricing_starter_eur}" şeklinde — kesin fiyat ROI Calculator'a yönlendir.
5. CTA: rotasyon #5 ("Bekijk de oplossing op aanloopai.nl{service.url_path}")
6. Servis-spesifik hashtag'leri ek: `{service.hashtags_nl}`

Platform variants:
- LinkedIn (NL, 700-900 char) — hook → benefit → 3 use case → pricing teaser → CTA
- Instagram (NL, 300-400 char + image_prompt: "Service icon + tagline minimal")
- Facebook (NL, 400-500 char) — conversational
- X (EN, ≤270 char) — pain → service → benefit → link

Output: JSON array of 4 platform objects.
Pillar: service, weekday: thursday, campaign: service_{service.id}_{YYYYMMDD}
```

---

## Pillar 5 — Friday: Long-form Thought Leadership

**Trigger:** Her Cuma 07:30 NL
**Platform set:** LinkedIn (only)
**Source:** Claude autonomous (haftalık tema rotasyonu)

```
Bu haftanın teması (rotasyon, week_of_year mod 8):
  0: "AVG, EU AI Act ve self-hosted AI'ın değeri"
  1: "ROI hesaplama: AI projesinin gerçekten ne kadar tasarruf ettirdiği"
  2: "n8n vs. Zapier vs. Make — Hollanda MKB için hangisi?"
  3: "Voice AI'ın MKB için ulaşılabilirliği — ElevenLabs ekosistemi"
  4: "AI hallucination'ı ne, müşteriden nasıl korursun?"
  5: "Sıfır kodla AI agent kurmak — gerçekten mümkün mü?"
  6: "Hollanda KMO landscape'inde AI adoption — engeller ve fırsatlar"
  7: "AI ile insan: korkular vs. gerçeklik — 2026'da MKB perspektifi"

Görevin:
1. Yukarıdaki tema'dan birini al.
2. 1200-1500 karakter long-form LinkedIn yazısı yaz.
3. Yapı: Hook (1 satır) → Probleem (1 paragraf) → Wat we vinden (1 paragraf) → Praktisch advies (3-4 bullet) → Reflectie (1 satır).
4. Asla satış pitchi olarak okunmasın — değer-öncelik. Aanloop ismi en fazla 2 kez geçer (alt'ta "We zijn Aanloop AI uit Rotterdam — wij bouwen dit elke dag." gibi tek satır).
5. CTA opsiyonel: "Welke vraag heb jij hierover? Reageer hieronder." (post sonu)
6. Tagline'ı yazının kapanışında kullanabilirsin.

Platform variants:
- Sadece LinkedIn (NL, 1200-1500 char)

Output: JSON array of 1 platform object.
Pillar: longform, weekday: friday, campaign: longform_w{week_of_year}_{YYYYMMDD}
```

---

## Pillar 6 (Saturday Bonus) — Video Explainer

**Trigger:** Her Cumartesi 09:00 NL (haftada 1 video)
**Platform set:** YouTube Shorts (EN), Instagram Reels (NL), TikTok (manual NL)
**Source:** Bu hafta'nın service spotlight (Thursday'in servisi) — repurpose

```
Kontekst:
This week's service: {service_data}  ← Perşembe'deki servis

Görevin:
1. 60sn video script üret (3-act):
   - Act 1 (0-15sn): Probleem — sahne tarif et
   - Act 2 (15-45sn): Aanloop'un servisi — 3 capability + somut benefit
   - Act 3 (45-60sn): CTA — "Plan een gratis demo van 15 minuten → aanloopai.nl"
2. Her sahne için:
   - Spoken text (NL veya EN)
   - On-screen text (kısa, max 8 kelime)
   - Visual cue (slide/image/animation aciklamasi)
3. NL ve EN versiyon ayrı üret.

Output: JSON object with scenes[], youtube_title_en, youtube_description_en, instagram_caption_nl, tiktok_caption_nl.
Pillar: video, weekday: saturday, campaign: video_{service.id}_{YYYYMMDD}
```
