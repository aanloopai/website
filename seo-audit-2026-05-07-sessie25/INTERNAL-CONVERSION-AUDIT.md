# INTERNAL CONVERSION AUDIT — Aanloop AI
**Datum:** 2026-05-07 | **Sessie:** 25 | **Scope:** Read-only CRO audit, geen nieuwe paginas

---

## TOP 10 CONVERSION BLOCKERS

| Rang | Bevinding | Pagina | Ernst |
|------|-----------|--------|-------|
| 1 | **500+ vs 80+ klanten tegenstrijdigheid** — Hero zegt 500+, over/index zeggen 80+. Directe geloofwaardigheidskiller. | Hero.astro:146 vs over.astro:50 | CRITICAL |
| 2 | **Geen prijs above the fold** — Bezoeker ziet geen euro-teken in eerste viewport. Tarieven pagina heeft 0 contextuele inbound links. | index.astro, tarieven.astro | CRITICAL |
| 3 | **3-step wizard gebruikt alert() validatie** — Native browser alert breekt UX op mobiel, derankt Google UX-score. | demo-aanvragen.astro:208 | HIGH |
| 4 | **Mid-funnel escape link in stap 3** — "Open de online agenda" stuurt warme leads weg uit conversie-funnel. | demo-aanvragen.astro:141-148 | HIGH |
| 5 | **Zorg-sector anonieme testimonial** — Strijdig met cases.astro no-fake-testimonials beleid, juridisch risico. | sectoren/zorg.astro:116-117 | HIGH |
| 6 | **Founder foto = placeholder** — "DV" initialen in gradient-box, TODO-comment zichtbaar in broncode. | over.astro:248 | HIGH |
| 7 | **demo-inplannen is 100% JS-afhankelijk** — Geen noscript fallback, lege zwarte pagina bij JS-fout. | demo-inplannen.astro:76-252 | HIGH |
| 8 | **0 contextuele inbound links naar tarieven** — Geldpagina bereikbaar alleen via header-nav, geen enkel content-page linkt ernaar. | tarieven.astro | HIGH |
| 9 | **Gebroken title-tag audit-pagina** — Eindigt op em-dash, incompleet voor zoekmachines. | diensten/audit.astro:52 | HIGH |
| 10 | **Lege press-sectie over-pagina** — Trust-signaal sectie toont verontschuldiging ipv backlinks/media. | over.astro:443 | MEDIUM |

---

## QUICK WINS (elk max 2 uur)

| # | Fix | Bestand:Regel | Tijdschatting |
|---|-----|---------------|---------------|
| QW-1 | Vervang "500+ actieve klanten" door "80+ MKB-bedrijven" in Hero logo-cloud | Hero.astro:146 | 15 min |
| QW-2 | Voeg prijs-pill toe boven H1: vanaf 597/mnd | index.astro / Hero.astro | 30 min |
| QW-3 | Fix broken title-tag audit-pagina (verwijder trailing em-dash) | diensten/audit.astro:52 | 5 min |
| QW-4 | Verwijder "Open de online agenda" escape-link uit stap 3 wizard | demo-aanvragen.astro:141-148 | 10 min |
| QW-5 | Voeg tarieven-link toe in werkwijze-CTA + cases-CTA + over-CTA | werkwijze.astro, cases.astro, over.astro | 45 min |
| QW-6 | Voeg noscript-fallback toe aan demo-inplannen (tel-link + mailto) | demo-inplannen.astro | 20 min |
| QW-7 | Vervang alert() validatie door inline error-divs in step-2 | demo-aanvragen.astro:208 | 30 min |
| QW-8 | Voeg amber disclaimer toe aan zorg-sector quote | sectoren/zorg.astro:116-117 | 10 min |

---

## A. ABOVE-THE-FOLD ANALYSE

### index.astro (homepage)
- **CRITICAL** Hero.astro:146 — Logo-cloud tekst `500+ actieve klanten` staat op homepage, over-pagina en sector-pages tonen `80+ MKB-bedrijven`. Kies een getal, hanteer het consistent over ALLE paginas.
- **HIGH** Geen enkel euro-teken zichtbaar in eerste viewport. 597 verschijnt pas in trust-bar twee secties lager (index.astro:139, positie 4 van 4 kolommen). **Fix:** Voeg prijs-pill in Hero toe direct onder de H1: span met "Vanaf 597/mnd — geen verborgen kosten".
- **MEDIUM** Hero image `class="hidden lg:block"` (Hero.astro:90) — onzichtbaar op mobile en tablet. Waardepropositie is visueel kaal op 60%+ van het verkeer.
- **MEDIUM** 3 CTA-knoppen above fold (Hero.astro:43-59): "Demo aanvragen", "Bekijk tarieven", "Hoe werkt het". Keuze-paradox. Primaire CTA moet alleenstaand zijn; secundaire max 1.

### tarieven.astro
- **GOOD** Prijzen volledig zichtbaar above the fold: 597 Starter, 1.197 Groei, op maat Partner.
- **GOOD** Maandelijks/jaarlijks toggle aanwezig.
- **MEDIUM** Setup-kosten in amber-box verborgen onder main-grid — bezoekers zien 597 maar niet de 495 setup. Overweeg setup in de kaart zelf te tonen.

### diensten/audit.astro
- **GOOD** Prijs-pill boven H1 aanwezig: "1.950 vaste prijs, oplevering in 14 dagen".
- **HIGH** Title-tag eindigt op em-dash: "AI Audit voor MKB —" (regel 52). Incompleet voor Google SERP. **Fix:** Vervang door `AI Audit voor MKB | Aanloop AI — 1.950 vaste prijs`.

---

## B. CTA FLOW

### index.astro
- **HIGH** CTA-dichtheid te hoog: Hero CTAs (3x) + mid-page CTA-band + ROI-calculator CTA + finale CTA. Bezoekers raken gedesoriënteerd. Reduceer naar 1 primaire CTA per sectie.
- **MEDIUM** ROI-calculator CTA linkt naar `/demo-aanvragen/` — consistent, goed.
- **MEDIUM** Geen tarieven-link in de finale CTA sectie onderaan de pagina.

### werkwijze.astro
- **HIGH** Finale CTA heeft maar 1 knop ("Plan een gratis gesprek") — geen tarieven-link. Bezoekers die klaar zijn om te kopen hebben geen directe route naar prijzen. **Fix:** Voeg ghost-button "Bekijk tarieven" toe naast primaire CTA.

### diensten/audit.astro
- **MEDIUM** CTA-inconsistentie: eerste CTA linkt naar `/contact/?type=audit`, finale CTA linkt naar `/contact/?type=offerte`. Gebruik consistent `?type=audit` door de hele pagina.

---

## C. TRUST SIGNALS

### over.astro
- **HIGH** Founder foto ontbreekt volledig — regel 248 toont "DV" initialen in gradient-box met TODO-comment. Dit is het meest zichtbare vertrouwenssignaal op een B2B site. **Fix:** Upload echte foto van Mustafa Agah Dogan, vervang gradient-div door img-tag.
- **HIGH** Press-sectie is leeg (regel 443): tekst verontschuldigt het gebrek aan pers. Verwijder de sectie volledig als er geen media-vermeldingen zijn, of vul met klant-logo grid.
- **MEDIUM** KvK-nummer ontbreekt in footer/contact (over.astro:44-45 comment verwijst naar ontbrekend adres). B2B kopers in NL verwachten KvK + volledig adres.

### cases.astro
- **GOOD** Expliciete no-fake-testimonials disclaimer met amber-box. Transparant en correct.
- **HIGH** Scenario-cards zijn gepositioneerd als echte klantquotes in carousel-format. Disclaimer-label "Voorbeeldscenario" is te subtiel. **Fix:** Verplaats disclaimer naar boven de carousel, niet eronder.

### sectoren/zorg.astro
- **HIGH** Anonieme quote regel 116-117: "Onze assistenten waren dagelijks 3 uur kwijt..." attributed to "Praktijkmanager, huisartsenpraktijk Rotterdam". Geen disclaimer. Strijdig met cases.astro beleid. **Fix:** Voeg direct onder quote toe: kleine amber tekst "Voorbeeldscenario gebaseerd op branche-benchmark — geen specifieke klant."

---

## D. PRICING TRANSPARENCY

### tarieven.astro
- **GOOD** Volledige transparantie: drie plans met exacte prijzen, setup-kosten, BTW-vermelding.
- **CRITICAL** 0 inbound links vanuit content-paginas. cases.astro, werkwijze.astro, over.astro, alle sector-pages — geen enkel linkt contextually naar tarieven. **Fix:** Voeg in finale CTA-sectie van elke money-page toe: "Of bekijk direct onze tarieven en packages."

### index.astro
- **HIGH** 597 verschijnt als 4e item in trust-bar (index.astro:139). Prijs is het sterkste B2B-trust signaal — moet positie 1 zijn. **Fix:** Herorden trust-bar: Prijs, Garantie, Klanten, Locatie.

---

## E. FOUNDER CREDIBILITY

### over.astro
- **HIGH** Foto placeholder (gradient + initialen) is het eerste wat bezoekers zien op de over-pagina. Zonder foto is persoonlijk vertrouwen onmogelijk.
- **MEDIUM** Credentials goed: BSc CE 2012, 20j IT-ervaring, Big 4 — maar verspreid door lange tekst. Overweeg een credential-badge rij boven de bio.
- **MEDIUM** Geen LinkedIn-link zichtbaar boven de fold.

### demo-inplannen.astro
- **MEDIUM** Pagina-intro noemt Mustafa Agah Dogan maar geen foto of credentials-badge. Bezoekers boeken een call met een naam zonder gezicht.

---

## F. CONVERSION KILLERS

### demo-aanvragen.astro
- **HIGH** `alert()` validatie in step-2 (regel 208): Native browser alerts zijn UX-breakers op mobiel, verstoren de flow, en resulteren in form-abandonment. **Fix:** Vervang door inline error-divs per field.
- **HIGH** Stap 3 bevat escape-link naar `/demo-inplannen/` (regels 141-148). Dit stuurt een bezoeker die al 2 stappen heeft ingevuld weg. **Fix:** Verwijder deze link volledig. Na succesvolle submit kan de agenda-link getoond worden.
- **MEDIUM** Stap 2 heeft 3 verplichte velden + prominent optioneel tekstveld — cognitieve belasting hoog. Overweeg bedrijfsnaam optioneel te maken.
- **MEDIUM** Succesmelding na submit is vaag: "Wij nemen binnen 1 werkdag contact op". **Fix:** "U ontvangt binnen 4 uur een bevestiging van Mustafa."

### demo-inplannen.astro
- **HIGH** Volledig JS-afhankelijk zonder noscript fallback (regels 76-252). Bij JS-blokkade of laadproblemen: lege zwarte pagina. **Fix:** Voeg noscript sectie toe met directe mailto + telefoonnummer.
- **MEDIUM** Taalregisters inconsistent: pagina gebruikt "je/jou" (informeel) terwijl alle andere paginas "u/uw" (formeel) gebruiken (regel 13).

---

## G. TRANSACTIONAL INTENT MATCHING

### index.astro
- **MEDIUM** Homepage H1 is brand-gericht, niet intentie-gericht. High-intent queries als "AI bureau MKB prijzen" matchen beter op een H1 als "AI Automatisering voor MKB | Transparante Tarieven".

### tarieven.astro
- **GOOD** Goede transactionele content: expliciete vergelijking, FAQ met prijsvragen, setup-kosten uitgelegd.
- **MEDIUM** Geen klant-testimonial of social proof direct naast prijskaarten. Conversie op pricing pages stijgt significant met een short quote naast elke kaart.

### diensten/audit.astro
- **GOOD** "1.950 vaste prijs, oplevering in 14 dagen" — exacte, transactionele copy die werkt.

---

## H. FORM FRICTION

### demo-aanvragen.astro
- **HIGH** alert() validatie (zie F.) — meest kritieke form-friction issue.
- **MEDIUM** Stap 1 vraagt naam + email + telefoon. Telefoon lijkt verplicht maar UI toont geen asterisk. Inconsistente validatie-feedback.
- **MEDIUM** Progress-indicator is minimaal (enkel stapnummer in H2). Geen visuele progress-bar.

### contact.astro
- **MEDIUM** 4 verplichte velden aanvaardbaar, maar privacy-checkbox als required field voelt paternalistisch. Overweeg inline privacy-notice zonder checkbox voor lager formulier-friction.

### demo-inplannen.astro
- **GOOD** 3-stap booking wizard (dag, tijdslot, gegevens) is clean en logisch.
- **MEDIUM** Stap 3 heeft naam + email + telefoon + bedrijf + tekstveld in een grid — zwaar voor een kalender-booking. Reduceer tot naam + email minimaal.

---

## I. MOBILE EXPERIENCE

### Hero.astro
- **HIGH** Hero-afbeelding `hidden lg:block` (regel 90) — desktop-only. Mobiele bezoekers zien pure tekst hero zonder visuele anker.

### index.astro
- **MEDIUM** CTA-knoppen gebruiken `flex-col sm:flex-row` (mobiel gestapeld) — goed. Maar 3 gestapelde CTAs op mobiel nemen 60%+ van het eerste scherm in.

### demo-aanvragen.astro
- **HIGH** alert() validatie (zie F.) — extra destructief op mobiel waar native alerts het scherm volledig overnemen.

---

## J. INTERNAL LINKING VAN MONEY-PAGES

### tarieven.astro (meest kritieke money-page)
- **CRITICAL** Inbound contextual links: **0**. Onderstaande paginas linken NIET contextually naar tarieven:
  - cases.astro — geen tarieven-link in CTA
  - werkwijze.astro — finale CTA linkt alleen naar demo-aanvragen
  - over.astro — geen tarieven-link
  - Alle sector-pages (zorg, horeca, bouw, etc.) — geen tarieven-link in CTA-secties
  - kennisbank-artikelen — geen tarieven-link
- **Fix:** Minimaal in werkwijze + cases + over finale CTA: "Of bekijk direct onze tarieven en packages" met link naar /tarieven/.

### demo-aanvragen.astro (conversie-doel)
- **GOOD** Meerdere paginas linken ernaar via hero-CTAs.
- **MEDIUM** Mid-funnel escape naar demo-inplannen aanwezig (zie F.) — verwijder.

### diensten/audit.astro
- **MEDIUM** Linkt naar contact-pagina maar geen cross-link naar tarieven voor prijs-vergelijking.

---

*Audit gegenereerd: 2026-05-07 | Aanloop AI CRO Review | 28 bevindingen: 2 CRITICAL, 14 HIGH, 12 MEDIUM*
