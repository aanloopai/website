# LinkedIn Company Page Setup — Aanloop AI

**Status:** READY-TO-PUBLISH — kopieer-plak naar linkedin.com/company/setup
**Why:** Master plan target #2 (na Wikidata). LinkedIn Company Page is een kerngrounding-bron voor ChatGPT/Gemini/Perplexity entity-recognition. Permanent multiplier op AI-citations.
**Datum draft:** 2026-05-04
**Estimated tijd:** 20-30 minuten

---

## Stap 1 — Account-vereisten

LinkedIn vereist:
1. Persoonlijk LinkedIn-profiel (Daan Verhoeven heeft al → linkedin.com/in/daanverhoeven)
2. Minimum 1 connection
3. Aanloop-bedrijfsdomein (aanloopai.nl) als geverifieerd e-mail (`hello@aanloopai.nl`)

Ga naar: **https://www.linkedin.com/company/setup/new/**

---

## Stap 2 — Page Type

Selecteer: **"Small business"** (1-200 werknemers)
- *Niet "Showcase Page"* — dat is een sub-page van een bestaande hoofd-pagina
- *Niet "Educational institution"* — dat is voor scholen/universiteiten

---

## Stap 3 — Page Identity

### Page name
```
Aanloop AI
```

### LinkedIn public URL
```
linkedin.com/company/aanloop-ai
```
(Als bezet: probeer `aanloopai` of `aanloop-ai-nederland`)

### Website URL
```
https://aanloopai.nl
```

### Industry
Selecteer dropdown — twee opties, kies de meest passende:
- **Software Development** (eerste keuze — past bij AI agents)
- **IT Services and IT Consulting** (alternatief — past bij managed service)

### Company size
**2-10 employees**

### Company type
**Privately held**

### Logo (vereist, 300×300 PNG)
Upload: `public/logo-mark-light-1024.png` (downscaled naar 300×300, transparant)
Lokaal pad: `C:\Users\Hallo\OneDrive\Claude\AGA\aanloop\public\logo-mark-light-1024.png`

### Cover image (1128×191 PNG/JPG, optioneel maar aanbevolen)
Suggestie: navy (`#0B1739`) achtergrond + accent-emerald gradient + tekst "Nederlandse AI-agents voor het MKB"
- Of: brand-photo van Daan + Marco-stem-icon + tagline

### Tagline (vereist, max 120 tekens)
```
Nederlandse AI-agents voor het MKB. Marco belt op, Emma WhatsAppt terug. Vanaf €197/mnd.
```
*(115 tekens — past)*

---

## Stap 4 — About-sectie (vereist, max 2.000 tekens)

Kopieer onderstaande in zijn geheel:

```
Aanloop AI bouwt Nederlandse AI-agents voor het Midden- en Kleinbedrijf — telefoon, WhatsApp, intake — done-for-you.

Onze AI receptionist Marco neemt 24/7 uw telefoon op: pre-juridische intake, agenda, escalatie. WhatsApp-agent Emma handelt cliëntvragen af in zes talen, 70% no-show reductie. Beide spreken vloeiend Nederlands via ElevenLabs en draaien EU-only op ISO 27001-cloud in Frankfurt en Amsterdam.

Onze klanten: notariskantoren, accountantskantoren, huisartsen, installatiebedrijven, rijscholen, dierenartsen, sportclubs, woningcorporaties, uitvaartondernemers en zorginstellingen. Voor AVG-strict sectoren leveren we standaard DPIA-template, NEN 7510-bewuste configuratie en NBA/KNB/Wta-conforme prompt-restricties.

Verschil met self-service platforms (Voicelabs, internationale tools): Aanloop is managed. Wij bouwen, trainen en onderhouden de AI voor u — onboarding 7-14 werkdagen, maandelijkse optimalisatie inbegrepen, geen interne setup-uren of AVG-compliance-onderzoek voor u. Vanaf €597/mnd voor Marco Starter, €1.197/mnd voor Marco + Emma + CRM-integratie.

Gevestigd in Rotterdam, KvK 88606902, hello@aanloopai.nl, +31 6 24 74 15 97.

Oprichter: Daan Verhoeven — combineert 10+ jaar enterprise-software ervaring met diepe NL MKB-domeinkennis. Werkt met Anthropic Claude, OpenAI, ElevenLabs, GrowthBook, Brevo en Cloudflare onder de motorkap.

Tools en kennisbank op aanloopai.nl: ROI-calculator, gratis AI-readiness scan, 70+ kennisbank-artikelen over sector-implementaties, AVG-compliance, Wwft-respecterende intake en NBA-conforme AI-inzet.

Bel +31 6 24 74 15 97 voor een 15-minuten demo, of vraag een kostenoffer aan via aanloopai.nl/demo-aanvragen.
```

*(~1.620 tekens — ruim binnen limiet)*

---

## Stap 5 — Specialties (max 20)

Voer toe (één per regel in de UI, comma-separated in API):

```
AI receptionist
AI telefoonagent
WhatsApp business automation
Voice AI Nederland
MKB AI implementatie
AVG compliant AI
NEN 7510 voice
Multilingual customer service
NBA-bewuste AI
KNB-conforme intake
Wwft-respecterende AI
No-show reductie
ElevenLabs voice cloning
Anthropic Claude integratie
ISO 27001 cloud AI
EU-only data processing
Yuki integratie
Twinfield integratie
AFAS integratie
Exact Online integratie
```

---

## Stap 6 — Featured & Showcase

### Featured links (max 3, in About-sectie)
1. **Title:** ROI-calculator — bereken uw besparing
   **URL:** https://aanloopai.nl/ai-roi-calculator/
2. **Title:** Gratis AI-Readiness Scan
   **URL:** https://aanloopai.nl/gratis-ai-scan/
3. **Title:** Bekijk Marco — AI receptionist
   **URL:** https://aanloopai.nl/diensten/marco/

### Featured posts (na publicatie)
Maak 3 launch-posts:
1. **Marco demo-video** (15-30s) — link naar /diensten/marco/
2. **Voicelabs counter-content** — link naar /kennisbank/ai-telefoonagent-starter-tco-mkb-nederland/
3. **Wikidata + LinkedIn live** — entity-recognition unlock voor Nederlandse AI-grounding

---

## Stap 7 — Submit + na-publicatie

1. **Klik "Create page"**
2. **Verifieer e-mail** (LinkedIn stuurt verificatie naar `hello@aanloopai.nl`)
3. **Voeg eerste medewerker toe:** Daan Verhoeven (CEO) als beheerder
4. **Volg eerste content:** post 1× per week voor de eerste 6 weken om "active page" status te krijgen

---

## Stap 8 — Cross-link in BaseLayout schema

Na LinkedIn-publicatie: voeg de Company Page URL toe aan `src/layouts/BaseLayout.astro` Organization sameAs:

```js
// src/layouts/BaseLayout.astro — Organization schema sameAs:
sameAs: [
  'https://linkedin.com/in/daanverhoeven',
  'https://linkedin.com/company/aanloop-ai',  // ← deze toevoegen
  'https://www.kvk.nl/zoeken/?source=all&q=88606902',
  'https://www.wikidata.org/wiki/Q<NUMMER>',  // ← na Wikidata-publicatie
]
```

Dit maakt de cross-reference cycle compleet:
- Wikidata Q-item heeft `LinkedIn company ID` (P4264) statement
- LinkedIn About-sectie heeft Wikipedia/Wikidata-vermelding (in tekst)
- BaseLayout Organization schema linkt naar beide
- Schema.org Person Daan Verhoeven heeft `worksFor` Aanloop AI organization

ChatGPT/Gemini/Perplexity grounden entity-recognition op dit gehele referentie-cluster.

---

## Stap 9 — Wikidata-update (na LinkedIn-publicatie)

Ga terug naar uw Wikidata Q-item (zie `WIKIDATA-QITEM-DRAFT.md`) en voeg statement toe:

| Property | Value | Property-ID |
|----------|-------|-------------|
| LinkedIn company ID | aanloop-ai | P4264 |

(`aanloop-ai` is het deel ná `linkedin.com/company/` in uw URL — geen volledige URL)

---

## Stap 10 — Verify (na 7-14 dagen)

LinkedIn indexering: 7-14 dagen tot AI-grounding tools de Company Page ophalen.

Test queries:
- ChatGPT: "What does Aanloop AI do?" — moet entity-recognized zijn
- Perplexity: "Aanloop AI Nederland" — moet LinkedIn als bron citeren
- Gemini: "Who founded Aanloop AI?" — moet weten via LinkedIn About-sectie

Als nog niet bekend: wachten tot crawler-cycle door (kan 2-4 weken zijn voor full-grounding).

---

## Wat NIET op LinkedIn Company Page

- **Geen klantnamen zonder toestemming** — privacy + AVG
- **Geen prijsdetails in About** — kunnen veranderen, maandelijks bijwerken te bewerkelijk
- **Geen "beste AI-bureau Nederland" claims** — LinkedIn algoritme straft superlatieven
- **Geen schermafbeeldingen klantsystemen** — vertrouwelijkheid

---

## Verwachte impact

- **GEO Brand Authority:** +8-15 punten (van 67-77 na Wikidata naar 75-92 met LinkedIn)
- **Entity recognition unlock:** ChatGPT/Gemini/Perplexity binnen 7-14 dagen
- **B2B lead-channel:** LinkedIn outbound mogelijkheid (Sales Navigator, Inmail) na 30 dagen actieve content
- **Recruitment:** zichtbare jobs-banner als u toekomstig medewerkers wilt zoeken
- **Permanente multiplier op AI-citations** — eenmalige setup, langdurig effect

---

## Vervolgstappen na LinkedIn-publicatie

1. **GitHub Organization** — github.com/aanloopai officieel maken (al bestaand). Wikidata kan GitHub username (P2037) krijgen.
2. **Daan Verhoeven persoonlijk Q-item** — apart Person item creëren. Bidirectionele entity-graph = sterkere grounding.
3. **BaseLayout schema update** — voeg LinkedIn URL toe aan Organization sameAs (zie Stap 8).
4. **Eerste 3 launch-posts** voor 'active page' status.
5. **Tier-1 PR-outreach** — Emerce, Sprout, MT/MKB Servicedesk, De Ondernemer (master plan target #3+).

---

**Estimated tijd:** 20-30 minuten voor stap 1-7, daarna 7-14 dagen wachten op LinkedIn-indexering plus 1-2 weken voor AI-tool grounding.
