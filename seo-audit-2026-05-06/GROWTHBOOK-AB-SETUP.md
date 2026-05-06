# GrowthBook A/B Test Framework — Top 5 Aanloop AI Landing Pages

**Datum:** 2026-05-06
**SDK:** `@growthbook/growthbook` v1.6.5 (client-side singleton — `src/lib/growthbook.ts`)
**API host:** `https://gb-api.aanloopai.nl` · client key: `sdk-rCwWmUBjbXcmteRx`
**GA4 measurement ID:** `G-VS8SZZ6W45` (thirdPartyTrackingPlugin actief)
**Astro build mode:** Static (SSG) — varianten worden client-side gehydrateerd na cookie-consent

---

## 1. Architectuur: SSG + Client-side hydration

Aanloop is volledig statisch (Astro SSG). Varianten kunnen **niet** build-time worden gebaked zonder de CI te herschrijven tot per-variant builds — dit schaadt SEO (URL-gebaseerde varianten) en verhoogt build-tijd drastisch.

### Gekozen aanpak: Cookie-gate pattern

```
Page load (static HTML met control variant)
    ↓
Consent banner — als user accepteert:
    ↓
initGrowthBook() → fetch feature flags van gb-api.aanloopai.nl
    ↓
applyVariant() — DOM swap: control → variant copy
    ↓
GA4 event: experiment_viewed {experiment_id, variant_id}
```

**SEO-impact: nihil** — Google crawlt de statische HTML (altijd control). Variant-swap vindt plaats na gebruikersinteractie (consent). Google beschouwt dit niet als cloaking omdat de URL identiek blijft en de content niet voor crawlers verborgen wordt.

**Risico's:**
- Flicker (FOUC) bij DOM-swap: mitigatie via `opacity:0` op test-elementen tot GB init klaar is (max 400ms)
- GB-API timeout: fail-open (control blijft staan) — al ingebouwd in `src/lib/growthbook.ts` (3s timeout)
- AVG: geen tracking voor consent; `aanloop_anon_id` in localStorage pas na opt-in

---

## 2. Implementatie-utility

Centraal register van alle experiment-keys, variant-IDs en DOM-swap functies per pagina:
`src/lib/ab-experiments.ts` — zie dat bestand voor de implementatie.

---

## 3. GrowthBook Feature Flags JSON (importeer in GB dashboard)

```json
[
  {
    "id": "homepage-hero-copy",
    "description": "Homepage hero copy variant — 3 varianten",
    "owner": "aanloop-team",
    "valueType": "string",
    "defaultValue": "control",
    "tags": ["homepage", "hero", "phase2"],
    "environmentSettings": {
      "production": {
        "enabled": true,
        "rules": [
          {
            "type": "experiment",
            "trackingKey": "homepage-hero-copy",
            "hashAttribute": "id",
            "coverage": 1.0,
            "weights": [0.334, 0.333, 0.333],
            "variations": ["control", "emotional", "roi"]
          }
        ]
      }
    }
  },
  {
    "id": "homepage-cta-text",
    "description": "Homepage CTA knoptekst — 3 varianten",
    "owner": "aanloop-team",
    "valueType": "string",
    "defaultValue": "control",
    "tags": ["homepage", "cta", "phase2"],
    "environmentSettings": {
      "production": {
        "enabled": true,
        "rules": [
          {
            "type": "experiment",
            "trackingKey": "homepage-cta-text",
            "hashAttribute": "id",
            "coverage": 1.0,
            "weights": [0.334, 0.333, 0.333],
            "variations": ["control", "scan", "vandaag"]
          }
        ]
      }
    }
  },
  {
    "id": "homepage-social-proof-placement",
    "description": "Homepage social proof positie — 3 varianten",
    "owner": "aanloop-team",
    "valueType": "string",
    "defaultValue": "control",
    "tags": ["homepage", "social-proof", "phase2"],
    "environmentSettings": {
      "production": {
        "enabled": true,
        "rules": [
          {
            "type": "experiment",
            "trackingKey": "homepage-social-proof-placement",
            "hashAttribute": "id",
            "coverage": 1.0,
            "weights": [0.334, 0.333, 0.333],
            "variations": ["control", "above-fold", "near-cta"]
          }
        ]
      }
    }
  },
  {
    "id": "tarieven-layout",
    "description": "Tarieven pagina layout — cards vs tabel",
    "owner": "aanloop-team",
    "valueType": "string",
    "defaultValue": "control",
    "tags": ["tarieven", "layout", "phase2"],
    "environmentSettings": {
      "production": {
        "enabled": true,
        "rules": [
          {
            "type": "experiment",
            "trackingKey": "tarieven-layout",
            "hashAttribute": "id",
            "coverage": 1.0,
            "weights": [0.5, 0.5],
            "variations": ["control", "table"]
          }
        ]
      }
    }
  },
  {
    "id": "tarieven-cta-text",
    "description": "Tarieven CTA tekst — 3 varianten",
    "owner": "aanloop-team",
    "valueType": "string",
    "defaultValue": "control",
    "tags": ["tarieven", "cta", "phase2"],
    "environmentSettings": {
      "production": {
        "enabled": true,
        "rules": [
          {
            "type": "experiment",
            "trackingKey": "tarieven-cta-text",
            "hashAttribute": "id",
            "coverage": 1.0,
            "weights": [0.334, 0.333, 0.333],
            "variations": ["control", "scan", "vandaag"]
          }
        ]
      }
    }
  },
  {
    "id": "marco-hero-copy",
    "description": "Marco diensten pagina hero copy variant",
    "owner": "aanloop-team",
    "valueType": "string",
    "defaultValue": "control",
    "tags": ["marco", "hero", "phase2"],
    "environmentSettings": {
      "production": {
        "enabled": true,
        "rules": [
          {
            "type": "experiment",
            "trackingKey": "marco-hero-copy",
            "hashAttribute": "id",
            "coverage": 1.0,
            "weights": [0.334, 0.333, 0.333],
            "variations": ["control", "emotional", "roi"]
          }
        ]
      }
    }
  },
  {
    "id": "bundel-hero-copy",
    "description": "AI-Website Bundel hero copy variant",
    "owner": "aanloop-team",
    "valueType": "string",
    "defaultValue": "control",
    "tags": ["bundel", "hero", "phase2"],
    "environmentSettings": {
      "production": {
        "enabled": true,
        "rules": [
          {
            "type": "experiment",
            "trackingKey": "bundel-hero-copy",
            "hashAttribute": "id",
            "coverage": 1.0,
            "weights": [0.334, 0.333, 0.333],
            "variations": ["control", "emotional", "roi"]
          }
        ]
      }
    }
  },
  {
    "id": "roi-calc-first-step",
    "description": "ROI Calculator eerste stap — simpel vs gedetailleerd",
    "owner": "aanloop-team",
    "valueType": "string",
    "defaultValue": "control",
    "tags": ["roi-calc", "ux", "phase2"],
    "environmentSettings": {
      "production": {
        "enabled": true,
        "rules": [
          {
            "type": "experiment",
            "trackingKey": "roi-calc-first-step",
            "hashAttribute": "id",
            "coverage": 1.0,
            "weights": [0.5, 0.5],
            "variations": ["control", "simple"]
          }
        ]
      }
    }
  },
  {
    "id": "roi-email-cta-button-text",
    "description": "ROI Calculator email capture CTA — bestaand experiment uitgebreid naar 3 varianten",
    "owner": "aanloop-team",
    "valueType": "string",
    "defaultValue": "Stuur rapport per e-mail →",
    "tags": ["roi-calc", "email", "phase2"],
    "environmentSettings": {
      "production": {
        "enabled": true,
        "rules": [
          {
            "type": "experiment",
            "trackingKey": "roi-email-cta-button-text",
            "hashAttribute": "id",
            "coverage": 1.0,
            "weights": [0.334, 0.333, 0.333],
            "variations": [
              "Stuur rapport per e-mail →",
              "Ontvang mijn ROI-rapport (gratis)",
              "Bereken mijn exacte besparing →"
            ]
          }
        ]
      }
    }
  }
]
```

---

## 4. Per-pagina test specificaties

### 4.1 Homepage (`/`) — doel: demo-aanvraag form starts

| Test | Feature flag | Control | Variant B | Variant C |
|------|-------------|---------|-----------|-----------|
| Hero copy | `homepage-hero-copy` | Feitelijk (huidig) | Emotioneel ("Stop gemiste leads voor altijd") | ROI ("Bespaar €40k+/jaar op personeelskosten") |
| CTA tekst | `homepage-cta-text` | "Boek een gratis demo" | "Gratis AI-scan aanvragen" | "Start vandaag — live binnen 14 dagen" |
| Social proof | `homepage-social-proof-placement` | Onder value prop (huidig) | Boven fold (direct na hero) | Direct boven CTA knop |

**Conversie events (GA4):**
- `demo_form_start` — eerste input-focus in demo/scan formulier
- `demo_form_complete` — formulier submit success

**Implementatie:** `src/components/Hero.astro` bevat de hero tekst + CTA. Variant-swap via `data-ab="homepage-hero-copy"` attributen op tekst-nodes (zie `src/lib/ab-experiments.ts`).

---

### 4.2 Tarieven (`/tarieven/`) — doel: plan-selectie klik + aanvragen flow

| Test | Feature flag | Control | Variant B | Variant C |
|------|-------------|---------|-----------|-----------|
| Card layout | `tarieven-layout` | Pricing cards (huidig) | Vergelijkingstabel (features als rijen) | — |
| CTA tekst | `tarieven-cta-text` | "Start met [plan]" | "Gratis AI-scan" | "Plan demo voor [plan]" |

**Conversie events (GA4):**
- `pricing_cta_click` — klik op plan-CTA knop (`{plan_id: 'starter|groei|partner'}`)
- `aanvragen_page_view` — `/aanvragen/` page view met `?plan=` param

**CLS-preventie:** Layout-swap vereist dat beide varianten pre-rendered in de DOM staan (`display:none` op de niet-actieve). Dit voorkomt layout shift bij variant-toewijzing.

---

### 4.3 Marco (`/diensten/marco/`) — doel: demo-aanvraag form complete

| Test | Feature flag | Control | Variant B | Variant C |
|------|-------------|---------|-----------|-----------|
| Hero copy | `marco-hero-copy` | Feitelijk (huidig) | Emotioneel ("Nooit meer een gemiste klant") | ROI ("Marco vervangt een €42k/jaar receptionist voor €597/mnd") |
| CTA tekst | (gedeeld `homepage-cta-text`) | "Boek een gratis demo" | "Gratis AI-scan aanvragen" | "Start vandaag — live binnen 7 dagen" |

**Conversie events (GA4):**
- `demo_form_complete` — formulier submit op marco pagina
- `scroll_depth_75` — 75% scroll van pagina (engagement)

---

### 4.4 AI-Website Bundel (`/diensten/ai-website-bundel-mkb-nederland/`) — doel: demo-aanvraag form complete

| Test | Feature flag | Control | Variant B | Variant C |
|------|-------------|---------|-----------|-----------|
| Hero copy | `bundel-hero-copy` | Feitelijk (huidig) | Emotioneel ("Eén partner voor website én AI — eindelijk rust") | ROI ("Bespaar €8-15k in jaar 1 vs losse afname") |
| CTA tekst | (gedeeld) | "Plan een discovery call" | "Gratis AI-scan aanvragen" | "Bereken uw bundel-besparing" |

**Conversie events (GA4):**
- `demo_form_complete` — formulier submit
- `bundel_savings_section_view` — scroll tot besparings-sectie (IntersectionObserver)

---

### 4.5 ROI Calculator (`/ai-roi-calculator/`) — doel: full completion + email-capture

| Test | Feature flag | Control | Variant B |
|------|-------------|---------|-----------|
| Eerste stap UX | `roi-calc-first-step` | Alle 5 sliders direct zichtbaar (huidig) | Simpel: eerst 2 sliders, overige openen progressief |
| Email CTA | `roi-email-cta-button-text` | "Stuur rapport per e-mail →" | "Ontvang mijn ROI-rapport (gratis)" | "Bereken mijn exacte besparing →" |

**Conversie events (GA4):**
- `roi_calc_complete` — resultaat sectie visible (calc done)
- `roi_email_capture` — email submit success

---

## 5. Statistische drempels

- **Significantieniveau:** 95% (α = 0.05), tweezijdig
- **Minimum power:** 80% (β = 0.20)
- **Minimum conversies per variant:** 100 (absoluut)
- **Minimum runtime:** 14 dagen (elimineer weekdag-bias)
- **Maximum runtime:** 60 dagen (staleness-risico)
- **Minimum detecteerbaar effect (MDE):** 15% relatieve stijging
- **Multi-arm correctie:** Bij 3-variant tests Bonferroni-correctie (α_per_arm = 0.025)

**Aanbevolen testvolgorde (1 actieve test per pagina tegelijk):**
1. `roi-email-cta-button-text` — al gedeeltelijk live, uitbreiden naar 3 varianten
2. `homepage-cta-text` — hoogste traffic, snelst statistisch significant
3. `tarieven-layout` — directe revenue impact
4. `marco-hero-copy` — hoog conversie-potentieel
5. `bundel-hero-copy` — laagste volume, langste runtime nodig (~8 weken)

---

## 6. GA4 Custom Dimensions configuratie

In GA4 Admin → Custom Definitions → Custom Dimensions:

| Parameter naam | Scope | Omschrijving |
|----------------|-------|-------------|
| `experiment_id` | Event | Feature flag key (bijv. `homepage-cta-text`) |
| `variant_id` | Event | Variant-waarde (bijv. `control`, `scan`, `vandaag`) |
| `experiment_page` | Event | Paginanaam (homepage / tarieven / marco / bundel / roi-calc) |

GrowthBook's `thirdPartyTrackingPlugin({ trackers: ['ga4'] })` pusht automatisch een `experiment_viewed` event naar GA4 `dataLayer` bij elke variant-toewijzing. Geen extra code nodig.

**Analyse-segment in GA4:**
- Segment: `experiment_id = "homepage-cta-text"`, gesplitst op `variant_id`
- Doel: `demo_form_start` conversieratio per variant vergelijken

---

## 7. AVG-compliance

- **Geen tracking voor consent:** `initGrowthBook()` wordt pas aangeroepen na opt-in consent event (`gb-tracking-consent`)
- **`aanloop_anon_id`:** RFC 4122 v4 UUID in `localStorage` — behandel als opt-in vereist wegens AVG-profileringsregels
- **Sticky bucketing:** zelfde UUID zorgt dat gebruiker dezelfde variant krijgt elke sessie
- **Geen PII in GrowthBook:** attributes bevatten alleen `id` (UUID) + `url` + device metadata
- **Data-locatie:** GrowthBook self-hosted op Hetzner EU (Nürnberg) — geen data buiten EU

**Consent banner aanpassing (1 regel):**
```javascript
// In accept handler van bestaande consent banner:
window.dispatchEvent(new CustomEvent('gb-tracking-consent'));
```

`src/lib/ab-experiments.ts` luistert op dit event via `initExperimentsOnConsent()`.

---

## 8. CSP-impact

`gb-api.aanloopai.nl` staat al in `connect-src` (per geheugen). Geen CSP-wijzigingen nodig.

GrowthBook DevTools (`enableDevMode: true`) vereist `script-src 'unsafe-eval'` — dat is al alleen actief bij `import.meta.env.DEV === true` in `src/lib/growthbook.ts`. Geen productie-impact.

---

## 9. Performance-impact

- GB SDK bundle: ~28kB gzip — al aanwezig, geen extra download
- `gb.init()` fetch: ~2-5kB JSON payload van `gb-api.aanloopai.nl` (na consent, niet op critical path)
- Variant-swap: synchrone DOM mutatie, <1ms per element
- **LCP impact: nihil** — hero tekst staat in statische HTML (control), swap is na LCP
- **CLS risico:** alleen bij `tarieven-layout` (card→tabel swap). Mitigatie: render beide layouts in statische HTML, toggle `display:none/block` via JS. `min-height` op container instellen op grootste variant-hoogte.

---

## 10. Rollout plan

**Week 1 (setup):**
- [ ] Importeer feature flags JSON in GrowthBook dashboard (`gb.aanloopai.nl`)
- [ ] Maak GA4 custom dimensions aan (experiment_id, variant_id, experiment_page)
- [ ] Voeg `gb-tracking-consent` event dispatch toe aan consent banner
- [ ] Deploy `src/lib/ab-experiments.ts`

**Week 2 (eerste test live):**
- [ ] Activeer `roi-email-cta-button-text` experiment in GB (uitbreiden naar 3 varianten)
- [ ] Activeer `homepage-cta-text` experiment
- [ ] Verifieer `experiment_viewed` events in GA4 DebugView

**Week 3-4:**
- [ ] Analyseer ROI-calculator email CTA resultaten
- [ ] Start `tarieven-layout` experiment
- [ ] Start `marco-hero-copy` experiment

**Week 5-8:**
- [ ] Ship winnaars als significant (>95% conf, >100 conversies/variant)
- [ ] Start `bundel-hero-copy` (laag volume — plan 8 weken runtime)
- [ ] Documenteer winnaars + effect sizes in dit bestand

---

## 11. Implementatie-bestanden samenvatting

| Bestand | Status | Doel |
|---------|--------|------|
| `src/lib/growthbook.ts` | Bestaand (ongewijzigd) | SDK singleton, init, getFeatureValue |
| `src/lib/ab-experiments.ts` | Nieuw | Experiment-keys register + DOM-swap utilities + consent-gate |
