# Plak A — Koopweg (self-serve funnel) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een bezoeker van `/start` kan zonder enig menselijk contact een gepersonaliseerd voorstel krijgen, een geverifieerd account laten aanmaken en betalen.

**Architecture:** De bestaande wizard (`/start` → `POST /api/intake`) krijgt een vervolg: de intake produceert een `voorstellen`-rij met een 256-bit token. De publieke voorstelpagina leest die via `GET /api/voorstel`. "Ja, ik start" (`POST /api/voorstel/claim`) maakt **niets** aan; het stuurt alleen een verificatiemail. Pas na het klikken van die link (`/api/voorstel/verify`) worden customer, user en order gemint binnen een geverifieerde sessie, waarna de klant direct in de bestaande Mollie-checkout landt.

**Tech Stack:** Astro 4 (static output), Cloudflare Workers, D1 (SQLite), Mollie, Brevo, vitest (nieuw), Playwright (aanwezig).

## Global Constraints

- Prijzen komen **uitsluitend** uit `src/data/pricing.ts` via `src/data/portal-catalog.ts`. Nooit uit een LLM, nooit hardcoded in nieuwe bestanden.
- ROI-getallen komen uit een pure functie. De LLM levert alleen tekst en krijgt de getallen als input.
- Publieke tokens: `randomToken()` uit `src/lib/auth.js` (256 bit). **Nooit** `randomId()` voor iets dat in een URL belandt.
- Er wordt niets aan een account gekoppeld vóór e-mailverificatie.
- Merkfeiten: KvK **88606902**, oprichter **Mustafa**, persona **Emma**, verplichte AI-disclosure (EU AI Act art. 50). Het woord "marco" mag niet in HTML-output voorkomen (enige uitzondering: bestaand attribuut `data-ab="marco-hero-copy"`). Geen klantaantallen claimen.
- Tiernamen zijn catalogusstrings en staan zo in D1: de €497-tier heet `'Starter'`, de €997-tier `'Groei'` (`src/data/portal-catalog.ts:43-44`).
- Sellable in deze plak: **alleen** `emma-telefoon`. Alle andere wizard-diensten houden exact het huidige gedrag (intake opslaan + bedankscherm).
- Nederlandse teksten in alle klantgerichte output. Code en commits in het Engels/Nederlands zoals de omringende bestanden.
- Nooit `git add -A` in deze repo — de working tree is permanent vervuild. Altijd expliciete paden.
- Na elke deploy: `deploy-verify` skill draaien. Geen "klaar" zonder PASS.

---

### Task 1: Testharnas opzetten

Er is vandaag geen unit-testrunner (`package.json` kent alleen `smoke` via Playwright). Zonder runner kan geen enkele volgende taak zijn deliverable bewijzen.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.js`
- Create: `test/smoke.test.js`

**Interfaces:**
- Consumes: niets.
- Produces: commando `npm test` (vitest run), testmap `test/`.

- [ ] **Step 1: Installeer vitest**

```bash
cd "C:/Users/Hallo/OneDrive/Claude/AGA/aanloop"
npm install --save-dev vitest@^3
```

- [ ] **Step 2: Schrijf de configuratie**

Create `vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.js'],
    environment: 'node',
  },
});
```

- [ ] **Step 3: Voeg het testscript toe**

In `package.json`, binnen `"scripts"`, direct na `"smoke"`:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 4: Schrijf een falende smoketest**

Create `test/smoke.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { EMMA, GROEI } from '../src/data/pricing.ts';

describe('testharnas', () => {
  it('kan de prijsbron importeren', () => {
    expect(EMMA.monthlyCent).toBe(49700);
    expect(EMMA.setup).toBe(495);
    expect(GROEI.monthlyCent).toBe(99700);
    expect(GROEI.setup).toBe(795);
  });
});
```

- [ ] **Step 5: Draai de test**

Run: `npm test`
Expected: PASS, 1 test. Faalt de import van `.ts`, dan mist de vitest-esbuild-transform — dat is dan de bug om te fixen, niet de assertie.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.js test/smoke.test.js
git commit -m "test: vitest harnas toevoegen"
```

---

### Task 2: funnel-map — wizard-dienst naar product

**Files:**
- Create: `src/data/funnel-map.ts`
- Test: `test/funnel-map.test.js`

**Interfaces:**
- Consumes: `getCatalogTier` uit `src/data/portal-catalog.ts`.
- Produces:
  - `type FunnelEntry = { serviceId: string; productKey: string; tierNaam: string; sellable: boolean; roiInputs: string[]; fallbackKop: string; fallbackTekst: string }`
  - `FUNNEL_MAP: FunnelEntry[]`
  - `getFunnelEntry(serviceId: string): FunnelEntry | null`
  - `isSellable(serviceId: string): boolean`

- [ ] **Step 1: Schrijf de falende test**

Create `test/funnel-map.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { getFunnelEntry, isSellable, FUNNEL_MAP } from '../src/data/funnel-map.ts';
import { getCatalogTier } from '../src/data/portal-catalog.ts';

describe('funnel-map', () => {
  it('mapt voice-agent naar de betaalbare emma-telefoon Starter-tier', () => {
    const entry = getFunnelEntry('voice-agent');
    expect(entry.productKey).toBe('emma-telefoon');
    expect(entry.tierNaam).toBe('Starter');
    expect(entry.sellable).toBe(true);
  });

  it('verkoopt in plak A niets anders dan voice-agent', () => {
    expect(isSellable('agenda-assistant')).toBe(false);
    expect(isSellable('whatsapp-bot')).toBe(false);
    expect(isSellable('ai-scan-consult')).toBe(false);
  });

  it('geeft null voor een onbekende dienst', () => {
    expect(getFunnelEntry('bestaat-niet')).toBe(null);
  });

  it('verwijst voor elke sellable entry naar een bestaande, betaalbare tier', () => {
    for (const entry of FUNNEL_MAP.filter((e) => e.sellable)) {
      const tier = getCatalogTier(entry.productKey, entry.tierNaam);
      expect(tier, `${entry.productKey}/${entry.tierNaam} bestaat niet in de catalogus`).toBeTruthy();
      expect(tier.prijsCent).toBeGreaterThan(0);
      expect(tier.betaling).toBe('maandelijks');
    }
  });
});
```

- [ ] **Step 2: Draai de test en verifieer dat hij faalt**

Run: `npm test -- funnel-map`
Expected: FAIL — "Failed to resolve import ... funnel-map.ts".

- [ ] **Step 3: Schrijf de implementatie**

Create `src/data/funnel-map.ts`:

```ts
// Koppeling tussen de wizard op /start en de verkoopbare catalogus.
// De wizard kent dienst-ids (voice-agent, ...), de catalogus kent product_keys
// (emma-telefoon, ...). Zonder deze tabel kan een voorstel nooit een order worden.
//
// sellable = dit product richt zichzelf vandaag aantoonbaar in. Verkoop nooit
// iets dat handmatig geleverd moet worden; dat is precies het telefoontje dat
// deze funnel opheft. agenda-assistant gaat op sellable in plak B, samen met
// zijn provisioner. whatsapp-bot hangt op Meta Tech-Provider-status (spec §8).
// ai-scan-consult verkoopt vandaag een persoonlijk adviesgesprek — automatisch
// leveren zou er een ander product van maken; dat is een eigenaarsbeslissing.

export interface FunnelEntry {
  readonly serviceId: string;
  readonly productKey: string;
  /** Exacte catalogusnaam van de tier — deze string staat zo in D1 (service_orders.tier). */
  readonly tierNaam: string;
  readonly sellable: boolean;
  /** Namen van de antwoordvelden die de ROI-berekening nodig heeft. */
  readonly roiInputs: readonly string[];
  /** Statische copy wanneer de LLM-framing faalt. De funnel mag nooit omvallen. */
  readonly fallbackKop: string;
  readonly fallbackTekst: string;
}

export const FUNNEL_MAP: readonly FunnelEntry[] = [
  {
    serviceId: 'voice-agent',
    productKey: 'emma-telefoon',
    tierNaam: 'Starter',
    sellable: true,
    roiInputs: ['gemiste_gesprekken_week', 'gemiddelde_klantwaarde'],
    fallbackKop: 'Emma neemt vanaf volgende week uw telefoon aan',
    fallbackTekst:
      'Emma beantwoordt inkomende gesprekken 24/7 in het Nederlands, plant afspraken in en legt elke lead vast. '
      + 'U hoeft geen gesprek meer te missen omdat u aan het werk was.',
  },
  {
    serviceId: 'agenda-assistant',
    productKey: 'emma-telefoon',
    tierNaam: 'Starter',
    sellable: false,
    roiInputs: ['gemiste_gesprekken_week', 'gemiddelde_klantwaarde'],
    fallbackKop: 'Uw agenda, automatisch gevuld',
    fallbackTekst: 'Afspraken worden direct in uw agenda gezet, zonder heen-en-weer gemail.',
  },
  {
    serviceId: 'whatsapp-bot',
    productKey: 'emma-whatsapp',
    tierNaam: 'Standard',
    sellable: false,
    roiInputs: ['gemiste_gesprekken_week', 'gemiddelde_klantwaarde'],
    fallbackKop: 'Emma beantwoordt uw WhatsApp',
    fallbackTekst: 'Klanten krijgen binnen seconden antwoord, ook buiten kantooruren.',
  },
  {
    serviceId: 'ai-scan-consult',
    productKey: 'ai-scan',
    tierNaam: 'Scan',
    sellable: false,
    roiInputs: [],
    fallbackKop: 'AI-scan voor uw bedrijf',
    fallbackTekst: 'We brengen in kaart waar AI in uw bedrijf het snelst geld oplevert.',
  },
] as const;

export function getFunnelEntry(serviceId: string): FunnelEntry | null {
  return FUNNEL_MAP.find((e) => e.serviceId === serviceId) || null;
}

export function isSellable(serviceId: string): boolean {
  return getFunnelEntry(serviceId)?.sellable === true;
}
```

- [ ] **Step 4: Draai de test**

Run: `npm test -- funnel-map`
Expected: PASS, 4 tests. Faalt de laatste test, dan klopt `productKey`/`tierNaam` niet met `src/data/portal-catalog.ts` — pas de map aan, nooit de catalogus.

- [ ] **Step 5: Commit**

```bash
git add src/data/funnel-map.ts test/funnel-map.test.js
git commit -m "feat: funnel-map van wizard-dienst naar catalogusproduct"
```

---

### Task 3: ROI-berekening (pure functie)

**Files:**
- Create: `src/lib/roi.js`
- Test: `test/roi.test.js`

**Interfaces:**
- Consumes: niets.
- Produces:
  - `berekenRoi(answers: object): { modus: 'punt'|'bereik'|'geen', gemistPerMaand: number|null, verliesPerMaandCent: number|null, verliesLaagCent: number|null, verliesHoogCent: number|null, aannames: object }`
  - constanten `WEKEN_PER_MAAND`, `CONVERSIE_LAAG`, `CONVERSIE_HOOG`, `CONVERSIE_PUNT`

- [ ] **Step 1: Schrijf de falende test**

Create `test/roi.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { berekenRoi, WEKEN_PER_MAAND, CONVERSIE_PUNT } from '../src/lib/roi.js';

describe('berekenRoi', () => {
  it('rekent een puntschatting als beide inputs er zijn', () => {
    const r = berekenRoi({ gemiste_gesprekken_week: '5', gemiddelde_klantwaarde: '400' });
    expect(r.modus).toBe('punt');
    expect(r.gemistPerMaand).toBe(Math.round(5 * WEKEN_PER_MAAND));
    expect(r.verliesPerMaandCent).toBe(Math.round(5 * WEKEN_PER_MAAND * CONVERSIE_PUNT * 400 * 100));
  });

  it('geeft een bereik wanneer de klantwaarde ontbreekt', () => {
    const r = berekenRoi({ gemiste_gesprekken_week: '5' });
    expect(r.modus).toBe('bereik');
    expect(r.verliesLaagCent).toBeGreaterThan(0);
    expect(r.verliesHoogCent).toBeGreaterThan(r.verliesLaagCent);
    expect(r.verliesPerMaandCent).toBe(null);
  });

  it('verzint niets als er geen bruikbare input is', () => {
    const r = berekenRoi({});
    expect(r.modus).toBe('geen');
    expect(r.gemistPerMaand).toBe(null);
    expect(r.verliesPerMaandCent).toBe(null);
  });

  it('negeert onzin-input in plaats van NaN te produceren', () => {
    const r = berekenRoi({ gemiste_gesprekken_week: 'veel', gemiddelde_klantwaarde: '-3' });
    expect(r.modus).toBe('geen');
  });

  it('begrenst absurde invoer', () => {
    const r = berekenRoi({ gemiste_gesprekken_week: '100000', gemiddelde_klantwaarde: '999999' });
    expect(r.gemistPerMaand).toBeLessThanOrEqual(Math.round(200 * WEKEN_PER_MAAND));
  });
});
```

- [ ] **Step 2: Draai de test en verifieer dat hij faalt**

Run: `npm test -- roi`
Expected: FAIL — module niet gevonden.

- [ ] **Step 3: Schrijf de implementatie**

Create `src/lib/roi.js`:

```js
// ROI-berekening voor het gepersonaliseerde voorstel.
//
// Bewust een pure, deterministische functie: deze getallen staan straks als
// concrete belofte op een verkooppagina. Een taalmodel mag ze framen, nooit
// produceren. Ontbrekende input levert een eerlijk bereik of helemaal niets —
// nooit een verzonnen puntgetal.

/** Gemiddeld aantal weken per maand (365 / 7 / 12). */
export const WEKEN_PER_MAAND = 4.33;
/** Aandeel gemiste gesprekken dat bij directe opvolging klant zou worden. */
export const CONVERSIE_LAAG = 0.15;
export const CONVERSIE_PUNT = 0.30;
export const CONVERSIE_HOOG = 0.45;
/** Bovengrenzen tegen absurde of kwaadwillende invoer. */
const MAX_GESPREKKEN_WEEK = 200;
const MAX_KLANTWAARDE = 100000;
/** Gebruikt voor het bereik wanneer de klantwaarde niet is opgegeven. */
const KLANTWAARDE_LAAG = 150;
const KLANTWAARDE_HOOG = 750;

function positiefGetal(raw, max) {
  const n = Number(String(raw ?? '').replace(',', '.').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, max);
}

export function berekenRoi(answers) {
  const perWeek = positiefGetal(answers?.gemiste_gesprekken_week, MAX_GESPREKKEN_WEEK);
  const waarde = positiefGetal(answers?.gemiddelde_klantwaarde, MAX_KLANTWAARDE);

  const aannames = {
    wekenPerMaand: WEKEN_PER_MAAND,
    conversie: CONVERSIE_PUNT,
    conversieLaag: CONVERSIE_LAAG,
    conversieHoog: CONVERSIE_HOOG,
  };

  if (!perWeek) {
    return {
      modus: 'geen',
      gemistPerMaand: null,
      verliesPerMaandCent: null,
      verliesLaagCent: null,
      verliesHoogCent: null,
      aannames,
    };
  }

  const gemistPerMaand = Math.round(perWeek * WEKEN_PER_MAAND);

  if (waarde) {
    return {
      modus: 'punt',
      gemistPerMaand,
      verliesPerMaandCent: Math.round(perWeek * WEKEN_PER_MAAND * CONVERSIE_PUNT * waarde * 100),
      verliesLaagCent: Math.round(perWeek * WEKEN_PER_MAAND * CONVERSIE_LAAG * waarde * 100),
      verliesHoogCent: Math.round(perWeek * WEKEN_PER_MAAND * CONVERSIE_HOOG * waarde * 100),
      aannames: { ...aannames, klantwaarde: waarde },
    };
  }

  return {
    modus: 'bereik',
    gemistPerMaand,
    verliesPerMaandCent: null,
    verliesLaagCent: Math.round(perWeek * WEKEN_PER_MAAND * CONVERSIE_LAAG * KLANTWAARDE_LAAG * 100),
    verliesHoogCent: Math.round(perWeek * WEKEN_PER_MAAND * CONVERSIE_HOOG * KLANTWAARDE_HOOG * 100),
    aannames: { ...aannames, klantwaardeLaag: KLANTWAARDE_LAAG, klantwaardeHoog: KLANTWAARDE_HOOG },
  };
}
```

- [ ] **Step 4: Draai de test**

Run: `npm test -- roi`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/roi.js test/roi.test.js
git commit -m "feat: deterministische ROI-berekening voor het voorstel"
```

---

### Task 4: Voorstel-opbouw met LLM-framing en statische fallback

**Files:**
- Create: `src/lib/voorstel.js`
- Test: `test/voorstel.test.js`

**Interfaces:**
- Consumes: `berekenRoi` (Task 3), `getFunnelEntry` (Task 2), `getCatalogTier` uit `src/data/portal-catalog.ts`.
- Produces:
  - `buildVoorstelData(env, { serviceId, customer, answers }): Promise<{ productKey, tierNaam, prijsCent, setupCent, roi, copy: { kop, tekst, bronnen: 'llm'|'fallback' } }>`
  - `prijsVoorEntry(entry): { prijsCent, setupCent }`

`prijsCent` en `setupCent` zijn **exclusief** btw, net als de catalogus. De btw-omrekening gebeurt uitsluitend in `mollie.js`.

- [ ] **Step 1: Schrijf de falende test**

Create `test/voorstel.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { buildVoorstelData, prijsVoorEntry } from '../src/lib/voorstel.js';
import { getFunnelEntry } from '../src/data/funnel-map.ts';

const ANSWERS = { gemiste_gesprekken_week: '5', gemiddelde_klantwaarde: '400' };
const CUSTOMER = { name: 'Jan', company: 'Jansen Installatie', email: 'jan@example.nl' };

describe('buildVoorstelData', () => {
  it('haalt de prijs uit de catalogus, niet uit een model', () => {
    const p = prijsVoorEntry(getFunnelEntry('voice-agent'));
    expect(p.prijsCent).toBe(49700);
    expect(p.setupCent).toBe(49500);
  });

  it('valt terug op statische copy als er geen LLM-sleutel is', async () => {
    const data = await buildVoorstelData({}, { serviceId: 'voice-agent', customer: CUSTOMER, answers: ANSWERS });
    expect(data.copy.bronnen).toBe('fallback');
    expect(data.copy.kop).toBe(getFunnelEntry('voice-agent').fallbackKop);
    expect(data.prijsCent).toBe(49700);
    expect(data.roi.modus).toBe('punt');
  });

  it('valt terug op statische copy als de LLM faalt', async () => {
    const env = { GEMINI_API_KEY: 'x', __llm: async () => { throw new Error('boom'); } };
    const data = await buildVoorstelData(env, { serviceId: 'voice-agent', customer: CUSTOMER, answers: ANSWERS });
    expect(data.copy.bronnen).toBe('fallback');
  });

  it('gebruikt LLM-copy wanneer die er is, maar nooit voor de prijs', async () => {
    const env = {
      GEMINI_API_KEY: 'x',
      __llm: async () => JSON.stringify({ kop: 'Eigen kop', tekst: 'Eigen tekst van 30 tekens minimaal.' }),
    };
    const data = await buildVoorstelData(env, { serviceId: 'voice-agent', customer: CUSTOMER, answers: ANSWERS });
    expect(data.copy.bronnen).toBe('llm');
    expect(data.copy.kop).toBe('Eigen kop');
    expect(data.prijsCent).toBe(49700);
  });

  it('weigert een niet-verkoopbare dienst', async () => {
    await expect(
      buildVoorstelData({}, { serviceId: 'whatsapp-bot', customer: CUSTOMER, answers: {} }),
    ).rejects.toThrow(/niet verkoopbaar/i);
  });
});
```

- [ ] **Step 2: Draai de test en verifieer dat hij faalt**

Run: `npm test -- voorstel`
Expected: FAIL — module niet gevonden.

- [ ] **Step 3: Schrijf de implementatie**

Create `src/lib/voorstel.js`:

```js
// Bouwt de inhoud van een gepersonaliseerd voorstel.
//
// Harde scheiding: alle getallen (prijs, setup, ROI) komen uit de catalogus en
// uit roi.js. Het taalmodel krijgt die getallen als input en levert uitsluitend
// een kop en een lopende tekst. Faalt of ontbreekt het model, dan gebruiken we
// de statische copy uit funnel-map.ts — de funnel mag nooit omvallen omdat een
// externe API traag is.
import { berekenRoi } from './roi.js';
import { getFunnelEntry } from '../data/funnel-map.ts';
import { getCatalogTier } from '../data/portal-catalog.ts';
import { EMMA, GROEI } from '../data/pricing.ts';

const LLM_TIMEOUT_MS = 8000;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/** Setup-fee per tiernaam. De portal-catalogus voert deze fee (nog) niet, de prijsbron wel. */
const SETUP_CENT_PER_TIER = {
  Starter: EMMA.setup * 100,
  Groei: GROEI.setup * 100,
};

export function prijsVoorEntry(entry) {
  const tier = getCatalogTier(entry.productKey, entry.tierNaam);
  if (!tier || !tier.prijsCent) throw new Error(`Geen betaalbare tier voor ${entry.productKey}/${entry.tierNaam}`);
  return { prijsCent: tier.prijsCent, setupCent: SETUP_CENT_PER_TIER[entry.tierNaam] || 0 };
}

function euro(cent) {
  return `€${(cent / 100).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function bouwPrompt({ entry, customer, roi, prijsCent, setupCent }) {
  const verlies = roi.modus === 'punt'
    ? `ongeveer ${euro(roi.verliesPerMaandCent)} per maand`
    : roi.modus === 'bereik'
      ? `tussen ${euro(roi.verliesLaagCent)} en ${euro(roi.verliesHoogCent)} per maand`
      : 'onbekend';
  return [
    'Je schrijft Nederlandse verkoopcopy voor Aanloop AI (AI-receptioniste Emma) voor het MKB.',
    'Regels: geen aantallen klanten claimen, geen garanties verzinnen, geen prijzen noemen die hier niet staan,',
    'geen uitroeptekens, zakelijk en concreet, maximaal 90 woorden in "tekst".',
    `Bedrijf: ${customer.company || 'onbekend'}. Contactpersoon: ${customer.name || 'onbekend'}.`,
    `Gemiste gesprekken per maand: ${roi.gemistPerMaand ?? 'onbekend'}. Geschat gemist omzetpotentieel: ${verlies}.`,
    `Aanbod: ${entry.productKey} (${entry.tierNaam}), ${euro(prijsCent)} per maand excl. btw, eenmalige inrichting ${euro(setupCent)} excl. btw.`,
    'Antwoord uitsluitend met JSON: {"kop": "...", "tekst": "..."}',
  ].join('\n');
}

// env.__llm is een testhaak: in productie is die niet gezet en gaat de call naar Gemini.
async function roepLlmAan(env, prompt) {
  if (typeof env.__llm === 'function') return env.__llm(prompt);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LLM_TIMEOUT_MS);
  try {
    const res = await fetch(`${GEMINI_URL}?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const json = await res.json();
    return json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } finally {
    clearTimeout(timer);
  }
}

function parseCopy(raw) {
  if (!raw) return null;
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) return null;
  let parsed;
  try { parsed = JSON.parse(match[0]); } catch { return null; }
  const kop = String(parsed?.kop || '').trim().slice(0, 120);
  const tekst = String(parsed?.tekst || '').trim().slice(0, 900);
  if (kop.length < 8 || tekst.length < 30) return null;
  return { kop, tekst };
}

export async function buildVoorstelData(env, { serviceId, customer, answers }) {
  const entry = getFunnelEntry(serviceId);
  if (!entry) throw new Error(`Onbekende dienst: ${serviceId}`);
  if (!entry.sellable) throw new Error(`Dienst ${serviceId} is niet verkoopbaar`);

  const { prijsCent, setupCent } = prijsVoorEntry(entry);
  const roi = berekenRoi(answers || {});

  let copy = { kop: entry.fallbackKop, tekst: entry.fallbackTekst, bronnen: 'fallback' };
  if (env?.GEMINI_API_KEY || typeof env?.__llm === 'function') {
    try {
      const raw = await roepLlmAan(env, bouwPrompt({ entry, customer: customer || {}, roi, prijsCent, setupCent }));
      const parsed = parseCopy(raw);
      if (parsed) copy = { ...parsed, bronnen: 'llm' };
    } catch (err) {
      console.error('[voorstel] LLM-framing mislukt, statische copy gebruikt:', err?.message || err);
    }
  }

  return { productKey: entry.productKey, tierNaam: entry.tierNaam, prijsCent, setupCent, roi, copy };
}
```

- [ ] **Step 4: Draai de test**

Run: `npm test -- voorstel`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/voorstel.js test/voorstel.test.js
git commit -m "feat: voorstel-opbouw met LLM-framing en statische fallback"
```

---

### Task 5: Migratie 0015 — voorstellen, claims en de order-koppeling

Er bestaan al **twee** bestanden met prefix `0014` (`0014_inbound_leads.sql`, `0014_intake_requests.sql`). Nieuwe nummers beginnen daarom bij 0015 en er komt precies één migratiebestand per plak.

De claims krijgen een eigen tabel: `magic_links.user_id` is verplicht en verwijst naar `users`, maar bij een claim bestaat de gebruiker per definitie nog niet (spec §7 C1 — niets aanmaken vóór verificatie).

**Files:**
- Create: `migrations/0015_voorstellen.sql`

**Interfaces:**
- Produces: tabellen `voorstellen`, `voorstel_claims`; kolom `service_orders.voorstel_id` met unieke index.

- [ ] **Step 1: Schrijf de migratie**

Create `migrations/0015_voorstellen.sql`:

```sql
-- Plak A: self-serve koopweg. Zie docs/superpowers/specs/2026-07-22-selfserve-funnel-design.md
-- Apply: npx wrangler d1 execute aanloop-portal --remote --file=migrations/0015_voorstellen.sql
--
-- LET OP: dit bestand bevat een ALTER TABLE en is daarmee NIET herhaalbaar.
-- Draai het exact één keer (zelfde regel als migrations/0013_f3.sql).

-- Een gegenereerd voorstel. token = publieke capability (256 bit, randomToken()).
CREATE TABLE IF NOT EXISTS voorstellen (
  id            TEXT PRIMARY KEY,          -- vst_xxxxxxxx
  token         TEXT NOT NULL UNIQUE,      -- 64 hex chars, staat in de publieke URL
  intake_id     TEXT NOT NULL,             -- intake_requests.id
  service_id    TEXT NOT NULL,             -- wizard-dienst (voice-agent, ...)
  product_key   TEXT NOT NULL,             -- catalogus product_key
  tier_naam     TEXT NOT NULL,             -- exacte catalogus-tiernaam ('Starter')
  prijs_cent    INTEGER NOT NULL,          -- maandbedrag EXCL btw
  setup_cent    INTEGER NOT NULL DEFAULT 0,-- eenmalige inrichting EXCL btw
  roi_json      TEXT NOT NULL,             -- output van berekenRoi()
  copy_json     TEXT NOT NULL,             -- {kop, tekst, bronnen}
  status        TEXT NOT NULL DEFAULT 'open', -- open | geclaimd | omgezet
  expires_at    INTEGER NOT NULL,          -- epoch ms
  created_at    INTEGER NOT NULL           -- epoch ms
);
CREATE INDEX IF NOT EXISTS idx_voorstellen_intake ON voorstellen(intake_id);

-- Verificatietoken voor "Ja, ik start". Bestaat los van magic_links omdat er op
-- dit moment nog geen users-rij is om naar te verwijzen.
CREATE TABLE IF NOT EXISTS voorstel_claims (
  token_hash  TEXT PRIMARY KEY,            -- sha256Hex(raw token)
  voorstel_id TEXT NOT NULL REFERENCES voorstellen(id),
  email       TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,            -- epoch ms
  used        INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_voorstel_claims_voorstel ON voorstel_claims(voorstel_id);

-- Eén voorstel kan hooguit één order worden. Dit is de dubbele-order-guard:
-- de bestaande guard in mollie.js:132 werkt per order, niet per klant+product.
ALTER TABLE service_orders ADD COLUMN voorstel_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_orders_voorstel
  ON service_orders(voorstel_id) WHERE voorstel_id IS NOT NULL;
```

- [ ] **Step 2: Controleer of de kolom al bestaat (read-only, veilig)**

```bash
npx wrangler d1 execute aanloop-portal --remote --json --command "SELECT name FROM pragma_table_info('service_orders')"
```
Expected: lijst **zonder** `voorstel_id`. Staat hij er wel, dan is de migratie al gedraaid — sla stap 3 over.

- [ ] **Step 3: Vraag de eigenaar om toestemming en pas toe**

De migratie wordt pas toegepast na expliciete goedkeuring in exact deze vorm: "migrations/0015_voorstellen.sql toepassen op aanloop-portal remote D1". Daarna:

```bash
npx wrangler d1 execute aanloop-portal --remote --file=migrations/0015_voorstellen.sql
```

- [ ] **Step 4: Verifieer**

```bash
npx wrangler d1 execute aanloop-portal --remote --json --command "SELECT name FROM pragma_table_info('voorstellen')"
```
Expected: 13 kolommen, inclusief `token` en `setup_cent`.

- [ ] **Step 5: Commit**

```bash
git add migrations/0015_voorstellen.sql
git commit -m "feat: migratie 0015 voorstellen + claims + order-koppeling"
```

---

### Task 6: Setup-fee in de eerste betaling

`handleCheckoutStart` rekent vandaag uitsluitend `tier.prijsCent * 1.21` (`src/lib/mollie.js:158-164`). De fee bestaat wel in `pricing.ts` maar nergens in de checkout. De landmijn: zet het totaal in `subscriptions.bedrag_cent` en `billMonthlySubscriptions` (`mollie.js:434,452`) factureert de fee **elke maand opnieuw**.

Afwijking van spec §6: de factuur blijft één regel. `invoices` kent geen regelkolommen en `createInvoice` (`mollie.js:341`) leidt bedragen af uit het Mollie-betaalbedrag. De btw-uitsplitsing blijft daardoor correct (beide componenten 21%). Regelkalen op facturen zijn buiten scope van plak A.

**Files:**
- Modify: `src/data/portal-catalog.ts` (interface + emma-telefoon-tiers)
- Modify: `src/lib/mollie.js:155-210`
- Test: `test/checkout-bedrag.test.js`

**Interfaces:**
- Consumes: `getCatalogTier`.
- Produces: `CatalogTier.setupCent: number`; exporteerbare helper `berekenEersteBetaling(tier): { maandInclCent, setupInclCent, totaalInclCent }` uit `src/lib/mollie.js`.

- [ ] **Step 1: Schrijf de falende test**

Create `test/checkout-bedrag.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { berekenEersteBetaling } from '../src/lib/mollie.js';
import { getCatalogTier } from '../src/data/portal-catalog.ts';

describe('berekenEersteBetaling', () => {
  it('telt setup-fee eenmalig bij de eerste betaling op', () => {
    const tier = getCatalogTier('emma-telefoon', 'Starter');
    const b = berekenEersteBetaling(tier);
    expect(b.maandInclCent).toBe(Math.round(49700 * 1.21));
    expect(b.setupInclCent).toBe(Math.round(49500 * 1.21));
    expect(b.totaalInclCent).toBe(b.maandInclCent + b.setupInclCent);
  });

  it('laat het maandbedrag ongemoeid wanneer er geen setup-fee is', () => {
    const b = berekenEersteBetaling({ prijsCent: 19700, setupCent: 0, betaling: 'maandelijks' });
    expect(b.setupInclCent).toBe(0);
    expect(b.totaalInclCent).toBe(b.maandInclCent);
  });
});
```

- [ ] **Step 2: Draai de test en verifieer dat hij faalt**

Run: `npm test -- checkout-bedrag`
Expected: FAIL — `berekenEersteBetaling is not a function`.

- [ ] **Step 3: Voeg setupCent toe aan de catalogus**

In `src/data/portal-catalog.ts`, in `interface CatalogTier`, na `prijsCent`:

```ts
  /** Eenmalige inrichtingskosten in centen, EXCL btw. 0 = geen setup-fee. */
  setupCent: number;
```

Importeer de fee uit de prijsbron — bovenaan het bestand, bij de bestaande import uit `./pricing`:

```ts
import { EMMA, GROEI } from './pricing';
```

Zet daarna in het `emma-telefoon`-product `setupCent` op elke tier (`portal-catalog.ts:43-45`):

```ts
      { naam: 'Starter', prijs: CORE_MND, prijsCent: CORE.monthlyCent, setupCent: EMMA.setup * 100, betaling: 'maandelijks', kenmerken: [...] },
      { naam: 'Groei', prijs: GROEI_MND, prijsCent: GROEI.monthlyCent, setupCent: GROEI.setup * 100, betaling: 'maandelijks', kenmerken: [...] },
      { naam: 'Partner', prijs: 'Op aanvraag', prijsCent: null, setupCent: 0, betaling: 'aanvraag', kenmerken: [...] },
```

Elke overige tier in het bestand krijgt `setupCent: 0`. Laat `kenmerken` ongewijzigd — hierboven afgekort met `[...]`, in het bestand blijft de bestaande inhoud staan.

- [ ] **Step 4: Schrijf de helper en gebruik hem in de checkout**

In `src/lib/mollie.js`, direct boven `handleCheckoutStart`:

```js
// Eerste betaling = maand + eenmalige setup, beide incl. btw.
// De setup-fee mag NOOIT in subscriptions.bedrag_cent belanden: dat veld drijft
// billMonthlySubscriptions en zou de fee elke maand opnieuw incasseren.
export function berekenEersteBetaling(tier) {
  const maandInclCent = Math.round((tier.prijsCent || 0) * (1 + BTW_RATE));
  const setupInclCent = Math.round((tier.setupCent || 0) * (1 + BTW_RATE));
  return { maandInclCent, setupInclCent, totaalInclCent: maandInclCent + setupInclCent };
}
```

Vervang in `handleCheckoutStart` de regel `const inclCent = Math.round(tier.prijsCent * (1 + BTW_RATE));` (`mollie.js:158`) door:

```js
  const { maandInclCent, totaalInclCent } = berekenEersteBetaling(tier);
```

Pas daarna in dezelfde functie aan:
- de `INSERT INTO subscriptions ... bedrag_cent` bindt **`maandInclCent`** (was `inclCent`);
- `paymentBody.amount.value` gebruikt **`euros(totaalInclCent)`**;
- de `INSERT INTO payments ... bedrag_cent` bindt **`totaalInclCent`**;
- de betaalomschrijving vermeldt de fee wanneer die er is:

```js
      description: `Aanloop AI — ${order.product_key} ${order.tier} (${order.id})`
        + (totaalInclCent > maandInclCent ? ' incl. eenmalige inrichting' : ''),
```

- [ ] **Step 5: Draai de tests**

Run: `npm test`
Expected: PASS, alle tests inclusief de twee nieuwe.

- [ ] **Step 6: Verifieer dat de build niet breekt op het gewijzigde type**

Run: `npm run build`
Expected: build slaagt. Faalt hij op een ontbrekende `setupCent`, dan mist er nog een tier in `portal-catalog.ts` — vul die aan met `setupCent: 0`.

- [ ] **Step 7: Commit**

```bash
git add src/data/portal-catalog.ts src/lib/mollie.js test/checkout-bedrag.test.js
git commit -m "feat: setup-fee in de eerste betaling, maandbedrag blijft maand-only"
```

---

### Task 7: /api/intake produceert een voorstel

**Files:**
- Modify: `src/worker.js:381-383` (lengtevalidatie) en `src/worker.js:430-437` (respons)
- Create: `src/lib/voorstel-store.js`
- Test: `test/voorstel-store.test.js`

**Interfaces:**
- Consumes: `buildVoorstelData` (Task 4), `randomToken`, `randomId` uit `src/lib/auth.js`.
- Produces:
  - `maakVoorstel(env, { intakeId, serviceId, customer, answers }): Promise<{ id, token } | null>` — `null` wanneer de dienst niet verkoopbaar is.
  - `leesVoorstelViaToken(env, token): Promise<object | null>` — bevat **geen** PII.
  - constante `VOORSTEL_TTL_MS` (14 dagen).

- [ ] **Step 1: Schrijf de falende test**

Create `test/voorstel-store.test.js`:

```js
import { describe, it, expect, beforeEach } from 'vitest';
import { maakVoorstel, leesVoorstelViaToken, VOORSTEL_TTL_MS } from '../src/lib/voorstel-store.js';

// Minimale D1-dubbel: onthoudt één tabel als array en herkent de twee queries
// die deze module gebruikt.
function fakeDb() {
  const rows = [];
  return {
    rows,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (sql.startsWith('INSERT INTO voorstellen')) {
                const [id, token, intake_id, service_id, product_key, tier_naam,
                  prijs_cent, setup_cent, roi_json, copy_json, expires_at, created_at] = args;
                rows.push({ id, token, intake_id, service_id, product_key, tier_naam,
                  prijs_cent, setup_cent, roi_json, copy_json, status: 'open', expires_at, created_at });
              }
              return { meta: { changes: 1 } };
            },
            async first() {
              return rows.find((r) => r.token === args[0]) || null;
            },
          };
        },
      };
    },
  };
}

describe('voorstel-store', () => {
  let env;
  beforeEach(() => { env = { PORTAL_DB: fakeDb() }; });

  it('slaat een verkoopbaar voorstel op met een 64-hex token', async () => {
    const res = await maakVoorstel(env, {
      intakeId: 'intake-1', serviceId: 'voice-agent',
      customer: { name: 'Jan', company: 'Jansen' },
      answers: { gemiste_gesprekken_week: '5', gemiddelde_klantwaarde: '400' },
    });
    expect(res.token).toMatch(/^[0-9a-f]{64}$/);
    expect(env.PORTAL_DB.rows[0].prijs_cent).toBe(49700);
    expect(env.PORTAL_DB.rows[0].setup_cent).toBe(49500);
    expect(env.PORTAL_DB.rows[0].expires_at - env.PORTAL_DB.rows[0].created_at).toBe(VOORSTEL_TTL_MS);
  });

  it('maakt geen voorstel voor een niet-verkoopbare dienst', async () => {
    const res = await maakVoorstel(env, {
      intakeId: 'intake-2', serviceId: 'whatsapp-bot', customer: {}, answers: {},
    });
    expect(res).toBe(null);
    expect(env.PORTAL_DB.rows).toHaveLength(0);
  });

  it('leest een voorstel terug zonder PII', async () => {
    const { token } = await maakVoorstel(env, {
      intakeId: 'intake-3', serviceId: 'voice-agent',
      customer: { name: 'Jan', company: 'Jansen', email: 'jan@example.nl', phone: '0612345678' },
      answers: { gemiste_gesprekken_week: '5' },
    });
    const publiek = await leesVoorstelViaToken(env, token);
    expect(publiek.prijsCent).toBe(49700);
    expect(JSON.stringify(publiek)).not.toContain('jan@example.nl');
    expect(JSON.stringify(publiek)).not.toContain('0612345678');
  });

  it('geeft null bij een onbekend of verlopen token', async () => {
    expect(await leesVoorstelViaToken(env, 'a'.repeat(64))).toBe(null);
    const { token } = await maakVoorstel(env, {
      intakeId: 'intake-4', serviceId: 'voice-agent', customer: {}, answers: {},
    });
    env.PORTAL_DB.rows[0].expires_at = Date.now() - 1000;
    expect(await leesVoorstelViaToken(env, token)).toBe(null);
  });
});
```

- [ ] **Step 2: Draai de test en verifieer dat hij faalt**

Run: `npm test -- voorstel-store`
Expected: FAIL — module niet gevonden.

- [ ] **Step 3: Schrijf de store**

Create `src/lib/voorstel-store.js`:

```js
// Opslag en publieke uitlezing van voorstellen.
//
// Het token staat in een publieke URL en is dus een capability: 256 bit
// (randomToken), server-side vervaldatum, en de publieke leesfunctie geeft
// nooit PII terug. Een onbekend en een verlopen token leveren hetzelfde
// resultaat — de pagina mag niet verklappen of een token ooit bestond.
import { randomToken, randomId } from './auth.js';
import { buildVoorstelData } from './voorstel.js';
import { isSellable } from '../data/funnel-map.ts';

export const VOORSTEL_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export async function maakVoorstel(env, { intakeId, serviceId, customer, answers }) {
  if (!isSellable(serviceId)) return null;

  const data = await buildVoorstelData(env, { serviceId, customer, answers });
  const id = randomId('vst');
  const token = randomToken();
  const now = Date.now();

  await env.PORTAL_DB.prepare(
    'INSERT INTO voorstellen (id, token, intake_id, service_id, product_key, tier_naam, prijs_cent, setup_cent, roi_json, copy_json, status, expires_at, created_at) '
    + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)",
  ).bind(id, token, intakeId, serviceId, data.productKey, data.tierNaam,
    data.prijsCent, data.setupCent, JSON.stringify(data.roi), JSON.stringify(data.copy),
    now + VOORSTEL_TTL_MS, now).run();

  return { id, token };
}

function parse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}

/** Publieke projectie — bevat bewust geen e-mail, telefoon of intake_id. */
export async function leesVoorstelViaToken(env, token) {
  if (typeof token !== 'string' || !/^[0-9a-f]{64}$/.test(token)) return null;
  const row = await env.PORTAL_DB
    .prepare('SELECT id, token, service_id, product_key, tier_naam, prijs_cent, setup_cent, roi_json, copy_json, status, expires_at FROM voorstellen WHERE token = ?')
    .bind(token).first();
  if (!row) return null;
  if (Date.now() > row.expires_at) return null;
  return {
    serviceId: row.service_id,
    productKey: row.product_key,
    tierNaam: row.tier_naam,
    prijsCent: row.prijs_cent,
    setupCent: row.setup_cent,
    roi: parse(row.roi_json, {}),
    copy: parse(row.copy_json, {}),
    status: row.status,
  };
}
```

- [ ] **Step 4: Draai de test**

Run: `npm test -- voorstel-store`
Expected: PASS, 4 tests.

- [ ] **Step 5: Repareer de truncatie in handleIntake**

`src/worker.js:382` kapt af **ná** `JSON.stringify`, wat midden in een string kan snijden en onparseerbare JSON oplevert — precies wanneer de nieuwe ROI-vragen de payload groter maken. Vervang:

```js
  const answersJson = JSON.stringify(answersIn).slice(0, INTAKE_MAX_ANSWERS_JSON_LENGTH);
```

door:

```js
  const answersJson = JSON.stringify(answersIn);
  if (answersJson.length > INTAKE_MAX_ANSWERS_JSON_LENGTH) {
    return jsonResponse({ success: false, message: 'Uw antwoorden zijn te lang. Kort ze in en probeer het opnieuw.' }, 413);
  }
```

- [ ] **Step 6: Laat handleIntake een voorstel produceren**

Voeg bovenaan `src/worker.js`, bij de bestaande imports, toe:

```js
import { maakVoorstel } from './lib/voorstel-store.js';
```

Vervang in `handleIntake` de slotregel `return jsonResponse({ success: true, message: 'Aanvraag ontvangen' });` (`src/worker.js:436`) door:

```js
  // Verkoopbare dienst → direct een voorstel genereren en de bezoeker
  // doorsturen. Mislukt dat, dan valt de flow terug op het oude bedankscherm:
  // de intake is al durable opgeslagen, dus er gaat nooit een lead verloren.
  let voorstelToken = null;
  try {
    const voorstel = await maakVoorstel(env, { intakeId: id, serviceId, customer, answers: answersIn });
    voorstelToken = voorstel?.token || null;
  } catch (err) {
    console.error('[/api/intake] voorstel genereren mislukt (intake blijft bewaard):', err?.message || err);
  }

  return jsonResponse({ success: true, message: 'Aanvraag ontvangen', voorstel_token: voorstelToken });
```

- [ ] **Step 7: Draai alle tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/voorstel-store.js test/voorstel-store.test.js src/worker.js
git commit -m "feat: intake genereert een voorstel-token; truncatiebug in answers_json gefixt"
```

---

### Task 8: Publieke leesroute GET /api/voorstel

**Files:**
- Modify: `src/worker.js` (routetabel, naast `/api/intake` op `src/worker.js:1118`)

**Interfaces:**
- Consumes: `leesVoorstelViaToken` (Task 7).
- Produces: `GET /api/voorstel?t=<64 hex>` → `200 {ok:true, voorstel:{...}}` of `404 {ok:false}`.

- [ ] **Step 1: Breid de import uit**

In `src/worker.js`, de import uit Task 7:

```js
import { maakVoorstel, leesVoorstelViaToken } from './lib/voorstel-store.js';
```

- [ ] **Step 2: Voeg de route toe**

Direct ná het blok `if (url.pathname === '/api/intake') { ... }` (`src/worker.js:1118-1120`):

```js
    // Publieke leesroute voor de voorstelpagina. Het token is de enige
    // autorisatie; onbekend en verlopen geven exact hetzelfde antwoord, zodat
    // niet te achterhalen is of een token ooit heeft bestaan.
    if (url.pathname === '/api/voorstel') {
      if (request.method !== 'GET') return jsonResponse({ ok: false }, 405);
      const voorstel = env.PORTAL_DB
        ? await leesVoorstelViaToken(env, url.searchParams.get('t') || '')
        : null;
      if (!voorstel) return jsonResponse({ ok: false, message: 'Dit voorstel is niet (meer) beschikbaar.' }, 404);
      return jsonResponse({ ok: true, voorstel });
    }
```

- [ ] **Step 3: Draai de lokale dev-server en test handmatig**

```bash
npm run dev
```
Open in een tweede terminal:
```bash
curl.exe -s "http://localhost:4321/api/voorstel?t=aaaa"
```
Expected: HTTP 404 met `{"ok":false,...}`. Een geldig token levert `{"ok":true,...}` zonder e-mailadres in de body.

- [ ] **Step 4: Commit**

```bash
git add src/worker.js
git commit -m "feat: publieke GET /api/voorstel"
```

---

### Task 9: De voorstelpagina

De site bouwt statisch (`astro.config.mjs:10`). Een dynamische `[id]`-route zonder `getStaticPaths` breekt de build; daarom een statische pagina die het token uit de querystring leest, precies zoals `/portal/verify?token=` dat doet.

**Files:**
- Create: `src/pages/start/voorstel/index.astro`

**Interfaces:**
- Consumes: `GET /api/voorstel?t=` (Task 8).
- Produces: `POST /api/voorstel/claim` wordt vanaf deze pagina aangeroepen (Task 10).

- [ ] **Step 1: Schrijf de pagina**

Create `src/pages/start/voorstel/index.astro`:

```astro
---
// Gepersonaliseerd voorstel. Alle inhoud komt client-side uit /api/voorstel;
// de pagina zelf is statisch en bevat geen klantgegevens. noindex: dit is een
// capability-URL, geen vindbare pagina.
import Layout from '../../../layouts/Layout.astro';
---

<Layout
  title="Uw voorstel — Aanloop AI"
  description="Uw persoonlijke voorstel van Aanloop AI."
  noindex={true}
>
  <main class="mx-auto max-w-2xl px-4 py-16">
    <div id="vs-laden" class="text-slate-500">Uw voorstel wordt geladen…</div>

    <div id="vs-fout" class="hidden rounded-xl border border-slate-200 bg-slate-50 p-6">
      <h1 class="text-xl font-semibold text-slate-900">Dit voorstel is niet meer beschikbaar</h1>
      <p class="mt-2 text-slate-600">
        Voorstellen zijn 14 dagen geldig. Maak een nieuw voorstel — dat duurt een minuut.
      </p>
      <a href="/start/" class="mt-5 inline-block rounded-lg bg-indigo-600 px-5 py-3 font-semibold text-white">
        Nieuw voorstel maken
      </a>
    </div>

    <article id="vs-inhoud" class="hidden">
      <h1 id="vs-kop" class="text-3xl font-bold text-slate-900"></h1>
      <p id="vs-tekst" class="mt-4 text-lg leading-relaxed text-slate-700"></p>

      <section id="vs-roi" class="mt-8 hidden rounded-xl border border-slate-200 p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-500">Wat u nu misloopt</h2>
        <p id="vs-roi-tekst" class="mt-2 text-2xl font-bold text-slate-900"></p>
        <p id="vs-roi-aanname" class="mt-2 text-sm text-slate-500"></p>
      </section>

      <section class="mt-8 rounded-xl border border-indigo-200 bg-indigo-50 p-6">
        <h2 class="text-sm font-semibold uppercase tracking-wide text-indigo-700">Uw pakket</h2>
        <p id="vs-pakket" class="mt-2 text-xl font-semibold text-slate-900"></p>
        <p id="vs-prijs" class="mt-1 text-3xl font-bold text-slate-900"></p>
        <p id="vs-setup" class="mt-1 text-slate-600"></p>
        <p class="mt-1 text-sm text-slate-500">Alle bedragen zijn exclusief btw. Maandelijks opzegbaar.</p>

        <button
          id="vs-start"
          type="button"
          class="mt-6 w-full rounded-lg bg-indigo-600 px-6 py-4 text-lg font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          Ja, ik start
        </button>
        <p id="vs-melding" class="mt-3 hidden text-sm"></p>
      </section>

      <p class="mt-8 text-xs leading-relaxed text-slate-500">
        Emma is een AI-assistent. Uw gesprekspartner is geen mens — dat wordt bij elk gesprek gemeld
        (EU AI Act, art. 50). Aanloop AI · KvK 88606902.
      </p>
    </article>
  </main>
</Layout>

<script>
  const params = new URLSearchParams(location.search);
  const token = params.get('t') || '';
  const $ = (id: string) => document.getElementById(id)!;

  function euro(cent: number) {
    return '€' + Math.round(cent / 100).toLocaleString('nl-NL');
  }

  function toonFout() {
    $('vs-laden').classList.add('hidden');
    $('vs-fout').classList.remove('hidden');
  }

  async function laad() {
    if (!/^[0-9a-f]{64}$/.test(token)) return toonFout();
    let data: any;
    try {
      const res = await fetch(`/api/voorstel?t=${encodeURIComponent(token)}`);
      data = await res.json();
      if (!res.ok || !data.ok) return toonFout();
    } catch {
      return toonFout();
    }

    const v = data.voorstel;
    $('vs-kop').textContent = v.copy?.kop || 'Uw voorstel';
    $('vs-tekst').textContent = v.copy?.tekst || '';
    $('vs-pakket').textContent = `${v.productKey} — ${v.tierNaam}`;
    $('vs-prijs').textContent = `${euro(v.prijsCent)} per maand`;
    $('vs-setup').textContent = v.setupCent > 0
      ? `Eenmalige inrichting ${euro(v.setupCent)} — bij de eerste betaling`
      : 'Geen eenmalige inrichtingskosten';

    const roi = v.roi || {};
    if (roi.modus === 'punt') {
      $('vs-roi').classList.remove('hidden');
      $('vs-roi-tekst').textContent = `${euro(roi.verliesPerMaandCent)} per maand`;
      $('vs-roi-aanname').textContent =
        `Op basis van ${roi.gemistPerMaand} gemiste gesprekken per maand en ${Math.round(roi.aannames.conversie * 100)}% die klant zou worden.`;
    } else if (roi.modus === 'bereik') {
      $('vs-roi').classList.remove('hidden');
      $('vs-roi-tekst').textContent = `${euro(roi.verliesLaagCent)} – ${euro(roi.verliesHoogCent)} per maand`;
      $('vs-roi-aanname').textContent =
        `Op basis van ${roi.gemistPerMaand} gemiste gesprekken per maand. Vul uw gemiddelde klantwaarde in voor een preciezere schatting.`;
    }

    $('vs-laden').classList.add('hidden');
    $('vs-inhoud').classList.remove('hidden');
  }

  $('vs-start').addEventListener('click', async () => {
    const btn = $('vs-start') as HTMLButtonElement;
    const melding = $('vs-melding');
    btn.disabled = true;
    melding.classList.add('hidden');
    try {
      const res = await fetch('/api/voorstel/claim', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ t: token }),
      });
      const data = await res.json();
      melding.textContent = data.message || 'Controleer uw e-mail.';
      melding.className = res.ok && data.ok ? 'mt-3 text-sm text-green-700' : 'mt-3 text-sm text-red-700';
      melding.classList.remove('hidden');
      if (res.ok && data.ok) btn.textContent = 'Controleer uw e-mail';
      else btn.disabled = false;
    } catch {
      melding.textContent = 'Netwerkfout — probeer het opnieuw.';
      melding.className = 'mt-3 text-sm text-red-700';
      melding.classList.remove('hidden');
      btn.disabled = false;
    }
  });

  laad();
</script>
```

- [ ] **Step 2: Controleer of Layout de prop `noindex` kent**

```bash
grep -n "noindex" src/layouts/Layout.astro
```
Expected: de prop bestaat. Zo niet, voeg hem toe conform het bestaande props-patroon in dat bestand en zet bij `noindex` een `<meta name="robots" content="noindex,nofollow">` in de `<head>`.

- [ ] **Step 3: Bouw**

Run: `npm run build`
Expected: build slaagt, `/start/voorstel/index.html` verschijnt in `dist/`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/start/voorstel/index.astro
git commit -m "feat: publieke voorstelpagina"
```

---

### Task 10: POST /api/voorstel/claim — alleen een verificatiemail

Deze route maakt bewust **niets** aan. Zou hij dat wel doen, dan kan een anonieme bezoeker met andermans e-mailadres een account en order laten ontstaan, een order injecteren in de tenant van een bestaande klant, en de mail als phishing-primitief gebruiken (spec §7 C1).

**Files:**
- Create: `src/lib/voorstel-claim.js`
- Modify: `src/worker.js` (route)
- Test: `test/voorstel-claim.test.js`

**Interfaces:**
- Consumes: `sha256Hex`, `randomToken` uit `src/lib/auth.js`; `sendVoorstelMail` (hieronder).
- Produces: `handleVoorstelClaim(request, env): Promise<Response>`; constante `CLAIM_TTL_MS` (30 minuten).

- [ ] **Step 1: Schrijf de falende test**

Create `test/voorstel-claim.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { bouwClaimMail, CLAIM_TTL_MS } from '../src/lib/voorstel-claim.js';

describe('claim-mail', () => {
  it('bevat de verificatielink en geen wachtwoord-taal', () => {
    const html = bouwClaimMail('https://aanloopai.nl/api/voorstel/verify?t=abc', 'Jan');
    expect(html).toContain('https://aanloopai.nl/api/voorstel/verify?t=abc');
    expect(html).toContain('Jan');
    expect(html.toLowerCase()).not.toContain('wachtwoord');
  });

  it('houdt de claim kort geldig', () => {
    expect(CLAIM_TTL_MS).toBe(30 * 60 * 1000);
  });
});
```

- [ ] **Step 2: Draai de test en verifieer dat hij faalt**

Run: `npm test -- voorstel-claim`
Expected: FAIL — module niet gevonden.

- [ ] **Step 3: Schrijf de module**

Create `src/lib/voorstel-claim.js`:

```js
// "Ja, ik start" — stap 1 van 2.
//
// Deze route maakt met opzet NIETS aan: geen customer, geen user, geen order.
// Ze verstuurt uitsluitend een verificatielink naar het adres dat bij de intake
// is opgegeven. Pas na het klikken van die link (voorstel-verify.js) ontstaan er
// rijen, binnen een geverifieerde sessie. Zonder deze volgorde is het endpoint
// een account-injectie- en phishingprimitief.
import { sha256Hex, randomToken } from './auth.js';
import { jsonResponse } from './google-auth.js';
import { escapeHtml } from './escape.js';
import { rateLimit } from './rate-limit.js';

export const CLAIM_TTL_MS = 30 * 60 * 1000;
const SITE = 'https://aanloopai.nl';
const BREVO_API = 'https://api.brevo.com/v3/smtp/email';

export function bouwClaimMail(verifyUrl, naam) {
  const voornaam = escapeHtml((naam || '').split(' ')[0] || 'daar');
  return `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
    <p>Hallo ${voornaam},</p>
    <p>U wilt starten met Aanloop AI. Klik op de knop hieronder om uw e-mailadres te bevestigen; daarna komt u direct op de betaalpagina.</p>
    <p style="margin:28px 0"><a href="${escapeHtml(verifyUrl)}" style="display:inline-block;background:#4f46e5;color:#fff;padding:13px 22px;border-radius:10px;text-decoration:none;font-weight:600">Bevestigen en afronden</a></p>
    <p style="font-size:13px;color:#64748b">Deze link is 30 minuten geldig en kan één keer gebruikt worden. Niet aangevraagd? Negeer deze mail — er is niets aangemaakt.</p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
    <p style="font-size:12px;color:#64748b">Aanloop AI — aanloopai.nl — KvK 88606902</p>
  </body></html>`;
}

async function verstuurMail(env, to, naam, html) {
  if (!env.BREVO_API_KEY) throw new Error('BREVO_API_KEY niet geconfigureerd');
  const res = await fetch(BREVO_API, {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'Aanloop AI', email: 'hello@aanloopai.nl' },
      to: [{ email: to, name: naam || to }],
      subject: 'Bevestig uw e-mailadres en rond af',
      htmlContent: html,
    }),
  });
  if (!res.ok) throw new Error(`Brevo HTTP ${res.status}`);
}

export async function handleVoorstelClaim(request, env) {
  if (request.method !== 'POST') return jsonResponse({ ok: false }, 405);
  if (!env.PORTAL_DB) return jsonResponse({ ok: false, message: 'Niet beschikbaar' }, 503);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rl = await rateLimit(env.GOOGLE_TOKENS, `rl:claim:${ip}`, 5, 600);
  if (!rl.allowed) {
    return jsonResponse({ ok: false, message: 'Te veel verzoeken. Probeer het over enkele minuten opnieuw.' }, 429);
  }

  const body = await request.json().catch(() => null);
  const t = String(body?.t || '');
  if (!/^[0-9a-f]{64}$/.test(t)) return jsonResponse({ ok: false, message: 'Ongeldig voorstel.' }, 400);

  const voorstel = await env.PORTAL_DB
    .prepare('SELECT id, intake_id, expires_at FROM voorstellen WHERE token = ?')
    .bind(t).first();
  if (!voorstel || Date.now() > voorstel.expires_at) {
    return jsonResponse({ ok: false, message: 'Dit voorstel is niet (meer) beschikbaar.' }, 404);
  }

  const intake = await env.PORTAL_DB
    .prepare('SELECT customer_json FROM intake_requests WHERE id = ?')
    .bind(voorstel.intake_id).first();
  let klant = {};
  try { klant = JSON.parse(intake?.customer_json || '{}'); } catch { klant = {}; }
  if (!klant.email) return jsonResponse({ ok: false, message: 'Er ontbreken gegevens. Maak een nieuw voorstel.' }, 409);

  const raw = randomToken();
  const now = Date.now();
  await env.PORTAL_DB.prepare(
    'INSERT INTO voorstel_claims (token_hash, voorstel_id, email, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)',
  ).bind(await sha256Hex(raw), voorstel.id, String(klant.email).toLowerCase(), now + CLAIM_TTL_MS, now).run();

  try {
    await verstuurMail(env, klant.email, klant.name, bouwClaimMail(`${SITE}/api/voorstel/verify?t=${raw}`, klant.name));
  } catch (err) {
    console.error('[voorstel-claim] mail mislukt:', err?.message || err);
    return jsonResponse({ ok: false, message: 'We konden de bevestigingsmail niet versturen. Probeer het over enkele minuten opnieuw.' }, 502);
  }

  await env.PORTAL_DB.prepare("UPDATE voorstellen SET status = 'geclaimd' WHERE id = ? AND status = 'open'")
    .bind(voorstel.id).run();

  return jsonResponse({ ok: true, message: 'Controleer uw e-mail — we hebben u een bevestigingslink gestuurd.' });
}
```

- [ ] **Step 4: Controleer de signatuur van rateLimit**

```bash
grep -n "export async function rateLimit" -A6 src/lib/rate-limit.js
```
Expected: `rateLimit(kv, key, limit, windowSec)` met een `{ allowed }`-resultaat, zoals gebruikt op `src/worker.js:340`. Wijkt de signatuur af, pas dan de aanroep hierboven aan — niet de bestaande helper.

- [ ] **Step 5: Wire de route**

In `src/worker.js`, bij de imports:

```js
import { handleVoorstelClaim } from './lib/voorstel-claim.js';
```

En direct ná de `/api/voorstel`-route uit Task 8:

```js
    if (url.pathname === '/api/voorstel/claim') {
      return handleVoorstelClaim(request, env);
    }
```

- [ ] **Step 6: Draai de tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/voorstel-claim.js test/voorstel-claim.test.js src/worker.js
git commit -m "feat: voorstel-claim verstuurt alleen een verificatiemail"
```

---

### Task 11: /api/voorstel/verify — account, order en sessie

Stap 2 van 2. Pas hier ontstaan rijen. De GET is een navigatie vanuit een mailclient; die converteren we naar een same-origin POST via een zelf-verzendend formulier — exact het patroon van `handleInviteAccept` (`src/lib/portal-routes.js:320-339`).

**Files:**
- Create: `src/lib/voorstel-verify.js`
- Modify: `src/worker.js` (route)
- Test: `test/voorstel-verify.test.js`

**Interfaces:**
- Consumes: `sha256Hex`, `randomId`, `createSession`, `sessionCookie` uit `src/lib/auth.js`; tabel `voorstel_claims` (Task 5).
- Produces: `handleVoorstelVerify(request, env): Promise<Response>`; helper `mintKlantEnOrder(env, { voorstel, email, klant }): Promise<{ userId, orderId, bestondAl }>`.

- [ ] **Step 1: Schrijf de falende test**

Create `test/voorstel-verify.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { mintKlantEnOrder } from '../src/lib/voorstel-verify.js';

// D1-dubbel met de tabellen die deze functie raakt.
function fakeDb() {
  const db = { customers: [], users: [], orders: [], subscriptions: [] };
  const first = (sql, args) => {
    if (sql.includes('FROM users WHERE email')) return db.users.find((u) => u.email === args[0]) || null;
    if (sql.includes('FROM service_orders WHERE voorstel_id')) return db.orders.find((o) => o.voorstel_id === args[0]) || null;
    if (sql.includes('FROM subscriptions')) {
      return db.subscriptions.find((s) => s.customer_id === args[0] && s.product_key === args[1]) || null;
    }
    return null;
  };
  return {
    data: db,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() { return first(sql, args); },
            async run() {
              if (sql.startsWith('INSERT INTO customers')) db.customers.push({ id: args[0], bedrijf: args[1] });
              if (sql.startsWith('INSERT INTO users')) db.users.push({ id: args[0], customer_id: args[1], email: args[2], naam: args[3], role: args[4] });
              if (sql.startsWith('INSERT OR IGNORE INTO service_orders')) {
                if (!db.orders.some((o) => o.voorstel_id === args[6])) {
                  db.orders.push({ id: args[0], customer_id: args[1], user_id: args[2], product_key: args[3], tier: args[4], voorstel_id: args[6], status: 'concept' });
                }
              }
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
}

const VOORSTEL = { id: 'vst_1', product_key: 'emma-telefoon', tier_naam: 'Starter' };

describe('mintKlantEnOrder', () => {
  it('maakt customer, user en order voor een nieuwe klant', async () => {
    const env = { PORTAL_DB: fakeDb() };
    const res = await mintKlantEnOrder(env, { voorstel: VOORSTEL, email: 'jan@example.nl', klant: { name: 'Jan', company: 'Jansen' } });
    expect(env.PORTAL_DB.data.customers).toHaveLength(1);
    expect(env.PORTAL_DB.data.users[0].role).toBe('eigenaar');
    expect(res.orderId).toBeTruthy();
    expect(res.bestondAl).toBe(false);
  });

  it('hergebruikt een bestaande klant in plaats van een tweede aan te maken', async () => {
    const env = { PORTAL_DB: fakeDb() };
    env.PORTAL_DB.data.customers.push({ id: 'cust_1', bedrijf: 'Jansen' });
    env.PORTAL_DB.data.users.push({ id: 'usr_1', customer_id: 'cust_1', email: 'jan@example.nl', naam: 'Jan', role: 'eigenaar' });
    const res = await mintKlantEnOrder(env, { voorstel: VOORSTEL, email: 'jan@example.nl', klant: { name: 'Jan' } });
    expect(env.PORTAL_DB.data.customers).toHaveLength(1);
    expect(res.userId).toBe('usr_1');
    expect(res.bestondAl).toBe(true);
  });

  it('is idempotent: hetzelfde voorstel levert nooit twee orders', async () => {
    const env = { PORTAL_DB: fakeDb() };
    const a = await mintKlantEnOrder(env, { voorstel: VOORSTEL, email: 'jan@example.nl', klant: {} });
    const b = await mintKlantEnOrder(env, { voorstel: VOORSTEL, email: 'jan@example.nl', klant: {} });
    expect(env.PORTAL_DB.data.orders).toHaveLength(1);
    expect(a.orderId).toBe(b.orderId);
  });

  it('weigert wanneer er al een actief abonnement voor hetzelfde product is', async () => {
    const env = { PORTAL_DB: fakeDb() };
    env.PORTAL_DB.data.customers.push({ id: 'cust_1', bedrijf: 'Jansen' });
    env.PORTAL_DB.data.users.push({ id: 'usr_1', customer_id: 'cust_1', email: 'jan@example.nl', naam: 'Jan', role: 'eigenaar' });
    env.PORTAL_DB.data.subscriptions.push({ customer_id: 'cust_1', product_key: 'emma-telefoon', status: 'active' });
    await expect(
      mintKlantEnOrder(env, { voorstel: VOORSTEL, email: 'jan@example.nl', klant: {} }),
    ).rejects.toThrow(/al een actief abonnement/i);
  });
});
```

- [ ] **Step 2: Draai de test en verifieer dat hij faalt**

Run: `npm test -- voorstel-verify`
Expected: FAIL — module niet gevonden.

- [ ] **Step 3: Schrijf de module**

Create `src/lib/voorstel-verify.js`:

```js
// "Ja, ik start" — stap 2 van 2: het geverifieerde deel.
//
// Alles wat een rij aanmaakt gebeurt hier, na het klikken van de mailtoken.
// De unieke index op service_orders.voorstel_id (migratie 0015) maakt de
// order-creatie idempotent: een dubbelgeklikte mail levert één order.
import { sha256Hex, randomId, createSession, sessionCookie } from './auth.js';
import { escapeHtml } from './escape.js';

const SITE = 'https://aanloopai.nl';

function vandaag() {
  return new Date().toISOString().slice(0, 10);
}

export async function mintKlantEnOrder(env, { voorstel, email, klant }) {
  const db = env.PORTAL_DB;
  const mail = String(email).toLowerCase();

  let user = await db.prepare('SELECT id, customer_id, naam FROM users WHERE email = ?').bind(mail).first();
  let bestondAl = Boolean(user);

  if (!user) {
    const customerId = randomId('cust');
    await db.prepare('INSERT INTO customers (id, bedrijf, telefoon, factuur_email, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(customerId, klant?.company || klant?.name || mail, klant?.phone || null, mail, vandaag()).run();
    const userId = randomId('usr');
    await db.prepare('INSERT INTO users (id, customer_id, email, naam, role, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(userId, customerId, mail, klant?.name || mail, 'eigenaar', vandaag()).run();
    user = { id: userId, customer_id: customerId, naam: klant?.name || mail };
  }

  // Dubbel-abonnement-guard: de bestaande controle in mollie.js werkt per order,
  // niet per klant+product. Zonder deze check kan dezelfde klant via twee
  // intakes twee lopende abonnementen voor hetzelfde product krijgen.
  const actief = await db.prepare(
    "SELECT id FROM subscriptions WHERE customer_id = ? AND product_key = ? AND status IN ('pending_payment','active') LIMIT 1",
  ).bind(user.customer_id, voorstel.product_key).first();
  if (actief) throw new Error('Er is al een actief abonnement voor dit product');

  const nieuweOrderId = randomId('ord');
  await db.prepare(
    'INSERT OR IGNORE INTO service_orders (id, customer_id, user_id, product_key, tier, intake_json, voorstel_id, status, created_at) '
    + "VALUES (?, ?, ?, ?, ?, ?, ?, 'concept', ?)",
  ).bind(nieuweOrderId, user.customer_id, user.id, voorstel.product_key, voorstel.tier_naam,
    JSON.stringify(klant?.answers || {}), voorstel.id, Date.now()).run();

  const order = await db.prepare('SELECT id FROM service_orders WHERE voorstel_id = ?').bind(voorstel.id).first();

  return { userId: user.id, orderId: order?.id || nieuweOrderId, bestondAl };
}

function foutPagina(bericht) {
  return new Response(
    `<!DOCTYPE html><html lang="nl"><meta charset="utf-8"><meta name="robots" content="noindex">
     <body style="font-family:system-ui,sans-serif;max-width:520px;margin:80px auto;padding:0 24px;color:#0f172a">
     <h1 style="font-size:20px">Deze link werkt niet meer</h1>
     <p style="color:#475569">${escapeHtml(bericht)}</p>
     <p><a href="${SITE}/start/" style="color:#4f46e5">Nieuw voorstel maken</a></p>
     </body></html>`,
    { status: 400, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

// GET vanuit de mailclient → same-origin POST (CSRF-veilig, zelfde patroon als
// handleInviteAccept in portal-routes.js).
function postFormulier(token) {
  return new Response(
    `<!DOCTYPE html><html lang="nl"><meta charset="utf-8"><meta name="robots" content="noindex">
     <body style="font-family:system-ui,sans-serif;text-align:center;margin-top:80px;color:#0f172a">
     <p>Even geduld — we ronden uw aanvraag af…</p>
     <form id="f" method="POST" action="/api/voorstel/verify">
       <input type="hidden" name="t" value="${escapeHtml(token)}">
       <noscript><button type="submit">Doorgaan</button></noscript>
     </form>
     <script>document.getElementById('f').submit();</script>
     </body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

export async function handleVoorstelVerify(request, env) {
  const url = new URL(request.url);
  if (!env.PORTAL_DB || !env.PORTAL_SESSION_SECRET) return foutPagina('Het portaal is tijdelijk niet beschikbaar.');

  if (request.method === 'GET') {
    const t = url.searchParams.get('t') || '';
    if (!/^[0-9a-f]{64}$/.test(t)) return foutPagina('Deze bevestigingslink is ongeldig.');
    return postFormulier(t);
  }
  if (request.method !== 'POST') return foutPagina('Ongeldige aanvraag.');

  // Origin-guard: dezelfde posture als checkOrigin in portal-routes.js.
  if (request.headers.get('Origin') !== SITE) return foutPagina('Ongeldige herkomst.');

  let t = '';
  try {
    const form = await request.formData();
    t = String(form.get('t') || '');
  } catch { return foutPagina('Ongeldige aanvraag.'); }
  if (!/^[0-9a-f]{64}$/.test(t)) return foutPagina('Deze bevestigingslink is ongeldig.');

  const hash = await sha256Hex(t);
  const claim = await env.PORTAL_DB
    .prepare('SELECT voorstel_id, email, expires_at, used FROM voorstel_claims WHERE token_hash = ?')
    .bind(hash).first();
  if (!claim || claim.used || Date.now() > claim.expires_at) {
    return foutPagina('Deze bevestigingslink is verlopen of al gebruikt.');
  }

  // Atomische eenmalige claim — een dubbele POST mag geen tweede sessie minten.
  const geclaimd = await env.PORTAL_DB
    .prepare('UPDATE voorstel_claims SET used = 1 WHERE token_hash = ? AND used = 0')
    .bind(hash).run();
  if (geclaimd.meta?.changes !== 1) return foutPagina('Deze bevestigingslink is al gebruikt.');

  const voorstel = await env.PORTAL_DB
    .prepare('SELECT id, intake_id, product_key, tier_naam FROM voorstellen WHERE id = ?')
    .bind(claim.voorstel_id).first();
  if (!voorstel) return foutPagina('Dit voorstel bestaat niet meer.');

  const intake = await env.PORTAL_DB
    .prepare('SELECT customer_json, answers_json FROM intake_requests WHERE id = ?')
    .bind(voorstel.intake_id).first();
  let klant = {};
  try { klant = JSON.parse(intake?.customer_json || '{}'); } catch { klant = {}; }
  try { klant.answers = JSON.parse(intake?.answers_json || '{}'); } catch { klant.answers = {}; }

  let mint;
  try {
    mint = await mintKlantEnOrder(env, { voorstel, email: claim.email, klant });
  } catch (err) {
    console.error('[voorstel-verify] minten mislukt:', err?.message || err);
    return foutPagina('U heeft dit product al lopen. Log in op het portaal om uw abonnement te bekijken.');
  }

  await env.PORTAL_DB.prepare("UPDATE voorstellen SET status = 'omgezet' WHERE id = ?").bind(voorstel.id).run();
  await env.PORTAL_DB.prepare('UPDATE users SET last_login = ? WHERE id = ?').bind(Date.now(), mint.userId).run();

  const session = await createSession(mint.userId, env.PORTAL_SESSION_SECRET);
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${SITE}/portal/checkout?order=${encodeURIComponent(mint.orderId)}&autostart=1`,
      'Set-Cookie': sessionCookie(session),
    },
  });
}
```

- [ ] **Step 4: Wire de route**

In `src/worker.js`, bij de imports:

```js
import { handleVoorstelVerify } from './lib/voorstel-verify.js';
```

En ná de claim-route uit Task 10:

```js
    if (url.pathname === '/api/voorstel/verify') {
      return handleVoorstelVerify(request, env);
    }
```

- [ ] **Step 5: Draai de tests**

Run: `npm test`
Expected: PASS, inclusief de vier nieuwe.

- [ ] **Step 6: Commit**

```bash
git add src/lib/voorstel-verify.js test/voorstel-verify.test.js src/worker.js
git commit -m "feat: geverifieerde claim mint klant, order en sessie"
```

---

### Task 12: Checkout automatisch starten na verificatie

De klant landt op `/portal/checkout?order=...&autostart=1`. Zonder autostart moet hij daar nóg een knop zoeken; dat is precies de wrijving die deze funnel wegneemt.

**Files:**
- Modify: `src/pages/portal/checkout.astro`

**Interfaces:**
- Consumes: `POST /api/portal/checkout/start` (bestaand, `src/lib/portal-routes.js:438`).

- [ ] **Step 1: Bekijk de bestaande client-side flow**

```bash
grep -n "checkout/start\|order=\|addEventListener" src/pages/portal/checkout.astro
```
Noteer de naam van de bestaande startfunctie en de id van de betaalknop.

- [ ] **Step 2: Voeg autostart toe**

Onderaan het bestaande `<script>`-blok in `src/pages/portal/checkout.astro`, ná de definitie van de bestaande startfunctie (gebruik de naam uit stap 1; hieronder `startCheckout`):

```js
  // Kom je hier via de bevestigingsmail van een voorstel, dan is de keuze al
  // gemaakt — direct doorsturen naar Mollie in plaats van opnieuw laten klikken.
  if (new URLSearchParams(location.search).get('autostart') === '1') {
    startCheckout();
  }
```

- [ ] **Step 3: Bouw**

Run: `npm run build`
Expected: build slaagt.

- [ ] **Step 4: Commit**

```bash
git add src/pages/portal/checkout.astro
git commit -m "feat: checkout start automatisch na voorstel-verificatie"
```

---

### Task 13: /start — ROI-vragen, doorstroom en consenttekst

**Files:**
- Modify: `src/pages/start.astro` (SERVICE_QUESTIONS ~`:290`, consenttekst `:173`, submit-afhandeling `:571-580`)

**Interfaces:**
- Consumes: `voorstel_token` uit de `/api/intake`-respons (Task 7).

- [ ] **Step 1: Voeg de ROI-vragen toe aan voice-agent**

In `src/pages/start.astro`, in `SERVICE_QUESTIONS['voice-agent']`, voeg twee velden toe. De `name`-waarden moeten exact overeenkomen met `roiInputs` in `src/data/funnel-map.ts`:

```ts
    {
      name: 'gemiste_gesprekken_week',
      label: 'Hoeveel telefoontjes mist u ongeveer per week?',
      type: 'select',
      required: true,
      options: ['1', '3', '5', '10', '20'],
      hint: 'Een ruwe schatting is genoeg — hiermee rekenen we uw gemiste omzet uit.',
    },
    {
      name: 'gemiddelde_klantwaarde',
      label: 'Wat levert een nieuwe klant u gemiddeld op (in euro)?',
      type: 'select',
      required: false,
      options: ['150', '400', '750', '1500', '5000'],
      hint: 'Laat leeg als u het niet weet; we tonen dan een bandbreedte.',
    },
```

Gebruik het veldformaat zoals de andere entries in dit bestand het gebruiken — controleer met `grep -n "type: 'select'" -A4 src/pages/start.astro` en volg exact die vorm.

- [ ] **Step 2: Werk de consenttekst bij**

`src/pages/start.astro:173` dekt vandaag alleen "aanvraag verwerken en contact opnemen". De antwoorden gaan nu ook door een taalmodel en kunnen tot een account leiden. Vervang de bestaande consentzin door:

```
Ik ga akkoord met het verwerken van mijn gegevens om mijn aanvraag te behandelen,
een voorstel op te stellen (waarbij mijn antwoorden door een AI-model worden verwerkt)
en op mijn verzoek een account aan te maken. Zie het privacybeleid.
```

- [ ] **Step 3: Stuur door naar het voorstel**

Vervang in `submitIntake` het succesblok (`src/pages/start.astro:571-577`) door:

```ts
        if (res.ok && data.success) {
          trackEvent('intake_submitted', { service_id: selectedService });
          trackEvent('generate_lead', { form_name: 'start_intake', currency: 'EUR', value: 150 });
          if (data.voorstel_token) {
            window.location.href = `/start/voorstel/?t=${encodeURIComponent(data.voorstel_token)}`;
            return;
          }
          wizard?.classList.add('hidden');
          success?.classList.remove('hidden');
          success?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
```

Diensten zonder voorstel (alles behalve `voice-agent` in deze plak) houden zo exact het huidige bedankscherm.

- [ ] **Step 4: Werk het privacybeleid bij**

Voeg in `src/pages/privacy.astro` aan de verwerkingsdoelen toe: het opstellen van een geautomatiseerd voorstel (verwerking van intake-antwoorden door een AI-model van Google Gemini) en het aanmaken van een klantaccount op verzoek van de bezoeker. Volg de bestaande opsommingsvorm van dat bestand.

- [ ] **Step 5: Bouw en controleer merkregels**

```bash
npm run build
grep -ric "marco" dist/start/ | grep -v ":0"
```
Expected: geen output (afgezien van een eventueel bestaand `data-ab="marco-hero-copy"`-attribuut elders).

- [ ] **Step 6: Commit**

```bash
git add src/pages/start.astro src/pages/privacy.astro
git commit -m "feat: ROI-vragen, consenttekst en doorstroom naar het voorstel"
```

---

### Task 14: End-to-end test

**Files:**
- Create: `test/e2e/koopweg.spec.js`
- Modify: `package.json` (script `e2e`)

**Interfaces:**
- Consumes: de volledige keten uit Tasks 7-13, draaiend op de lokale dev-server.

- [ ] **Step 1: Voeg het script toe**

In `package.json`, binnen `"scripts"`:

```json
    "e2e": "playwright test test/e2e"
```

- [ ] **Step 2: Schrijf de test**

Create `test/e2e/koopweg.spec.js`:

```js
const { test, expect } = require('@playwright/test');

const BASE = process.env.E2E_BASE || 'http://localhost:4321';

test('wizard leidt naar een voorstel met prijs en setup-fee', async ({ page }) => {
  await page.goto(`${BASE}/start/`);

  await page.getByRole('button', { name: /telefoon|voice/i }).first().click();

  await page.selectOption('[name="gemiste_gesprekken_week"]', '5');
  await page.selectOption('[name="gemiddelde_klantwaarde"]', '400');
  await page.getByRole('button', { name: /volgende|verder/i }).first().click();

  await page.fill('#start-bedrijfsnaam', 'E2E Testbedrijf');
  await page.fill('#start-naam', 'Test Persoon');
  await page.fill('#start-email', `e2e+${Date.now()}@example.nl`);
  await page.getByRole('button', { name: /versturen/i }).click();

  await page.waitForURL(/\/start\/voorstel\/\?t=[0-9a-f]{64}/, { timeout: 20000 });
  await expect(page.locator('#vs-prijs')).toContainText('497');
  await expect(page.locator('#vs-setup')).toContainText('495');
  await expect(page.locator('#vs-roi-tekst')).toBeVisible();
});

test('een onbekend token onthult niets', async ({ page }) => {
  await page.goto(`${BASE}/start/voorstel/?t=${'a'.repeat(64)}`);
  await expect(page.locator('#vs-fout')).toBeVisible();
  await expect(page.locator('#vs-inhoud')).toBeHidden();
});
```

Pas de selectors in stap 2 aan op wat `/start` werkelijk rendert — controleer met `grep -n "id=\"start-" src/pages/start.astro` en met de stapknoppen in datzelfde bestand. Een selector die niet matcht is een testbug, geen productiebug.

- [ ] **Step 3: Draai de test**

```bash
npm run dev
```
In een tweede terminal:
```bash
npm run e2e
```
Expected: 2 tests PASS. Faalt de eerste op een lege voorstelpagina, controleer of de lokale worker `PORTAL_DB` heeft — zonder D1 kan `/api/intake` geen voorstel opslaan.

- [ ] **Step 4: Commit**

```bash
git add package.json test/e2e/koopweg.spec.js
git commit -m "test: e2e koopweg van wizard tot voorstel"
```

---

### Task 15: Deploy en verificatie

**Files:** geen wijzigingen — dit is de uitrol.

- [ ] **Step 1: Volledige testronde**

```bash
npm test && npm run build
```
Expected: alle tests PASS, build slaagt.

- [ ] **Step 2: Controleer dat migratie 0015 is toegepast**

```bash
npx wrangler d1 execute aanloop-portal --remote --json --command "SELECT name FROM pragma_table_info('service_orders')"
```
Expected: `voorstel_id` staat in de lijst. Zo niet: eerst Task 5 stap 3 afronden.

- [ ] **Step 3: Deploy**

```bash
npm run build && npx wrangler deploy
```
De melding `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` is een onschuldige Windows-bug in wrangler, geen deployfout.

- [ ] **Step 4: Rookproef op productie**

```bash
curl.exe -s -o NUL -w "%{http_code}\n" "https://aanloopai.nl/api/voorstel?t=aaaa"
curl.exe -s -o NUL -w "%{http_code}\n" "https://aanloopai.nl/start/voorstel/"
```
Expected: `404` voor de eerste (ongeldig token), `200` voor de tweede.

- [ ] **Step 5: Draai deploy-verify**

Gebruik de `deploy-verify` skill. Zonder PASS is deze plak niet klaar — ook niet "bijna".

- [ ] **Step 6: Push**

```bash
TOKEN=$(gh auth token -u aanloopai) && git push "https://aanloopai:${TOKEN}@github.com/aanloopai/website.git" master 2>&1 | sed "s/${TOKEN}/***/g"
```

---

## Zelfcontrole tegen de spec

| Spec-eis (plak A) | Taak |
|---|---|
| `funnel-map.ts` met sellable-vlag, tiernaam `'Starter'` | 2 |
| ROI als pure functie, bereik bij ontbrekende input | 3 |
| LLM levert alleen framing, statische fallback | 4 |
| Migratie 0015: `voorstellen`, `voorstel_id` + unieke index | 5 |
| Setup-fee in de eerste betaling, `bedrag_cent` maand-only | 6 |
| `answers_json`-truncatie vervangen door validatie | 7 |
| `/api/intake` levert een voorstel-token | 7 |
| Publieke leesroute zonder PII, gelijk antwoord bij onbekend/verlopen | 7, 8 |
| Voorstelpagina statisch met `?t=`, noindex, AI-disclosure | 9 |
| Claim maakt niets aan vóór verificatie, rate-limited | 10 |
| Minten pas na verificatie; dubbel-abonnement-guard; idempotent | 11 |
| Deep-link naar checkout | 11, 12 |
| ROI-vragen en consenttekst op `/start` | 13 |
| E2E van wizard tot voorstel | 14 |
| `deploy-verify` PASS | 15 |

**Bewuste afwijking van spec §6:** de factuur blijft één regel. `invoices` kent geen regelkolommen en `createInvoice` leidt bedragen af uit het Mollie-bedrag (`mollie.js:341`); de btw-uitsplitsing blijft daardoor correct omdat beide componenten 21% dragen. Facturen met regelkalen zijn een aparte wijziging, buiten plak A.
