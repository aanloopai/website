# Plak B + C — Onboarding-automatisering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ná betaling richt de dienst zichzelf volledig in — de klant vult zijn eigen diepe intake + koppelt zijn Google-agenda in het portaal, elke stap her-provisioned de agent, en wie het laat liggen krijgt automatische herinneringen. Geen mens meer nodig om een order `actief` te krijgen.

**Architecture:** Een provisioner-registry (`src/lib/provisioners/`) abstraheert productspecifieke inrichting achter één interface; `activation.js` wordt registry-gestuurd met een 3-uitkomsten-state-machine (`klaar`/`wacht_op_klant`/`fout`). Een portaal-onboardingwizard (`/portal/onboarding`) verzamelt de diepe intake en triggert her-provisioning; per-tenant Google-OAuth koppelt de klantagenda; een nudge-cron herinnert inactieve klanten.

**Tech Stack:** Cloudflare Workers (JS, geen TS in `.js`), Astro (statische portaalpagina's), D1 (SQLite), KV (`GOOGLE_TOKENS`), vitest, Mollie + Brevo + ElevenLabs + Google Calendar API.

## Global Constraints

- Prijs/cijfers **nooit** uit een LLM — uit `pricing.ts`/`portal-catalog.ts` + pure functies. LLM levert alleen framing. (spec §9 hard principe)
- Merkregels: persona **Emma**, verplichte AI-disclosure (EU AI Act art. 50), KvK **88606902**, oprichter **Mustafa**, geen klantaantallen claimen, "marco" verboden in zichtbare tekst.
- Bestaande provisioning-garanties blijven: precies één service per order (unieke index migratie 0008), een geslaagde provisioning wordt **nooit** herhaald, een geannuleerde order provisioned **nooit**.
- `git add -A` verboden (OneDrive-tree permanent vies) — stage alleen expliciete paden. Hooks nooit bypassen. Destructieve ops nooit zonder eigenaar-goedkeuring.
- Migraties met ALTER/CREATE draaien **éénmalig** op remote D1, pas ná M-goedkeuring in het formaat "migrations/00xx…sql op aanloop-portal remote D1 uitvoeren".
- Sellable in deze plak: `emma-telefoon` én `emma`. Tiernaam-string exact `'Starter'`/`'Groei'` (staat in D1).
- Tests: vitest, zelfde stubstijl als bestaande `test/checkout-*.test.js` (D1-stub met `prepare().bind().first()/run()`, `globalThis.fetch`-mock, `afterEach` herstelt fetch).
- **Canonieke intake_json-structuur (GENEST, bindend voor alle taken):** `intake[step.key][field.name]`, exact zoals `src/pages/portal/intake.astro` het opslaat (`answers[step.key]=vals`) en `src/lib/elevenlabs.js#buildConfig` het leest (`i.bedrijf.bedrijfsnaam`, `i.bereikbaarheid.openingstijden`, `i.bereikbaarheid.buiten_tijden`, `i.afhandeling.taken`, `i.kennis.toon`, `i.kennis.faq`). De veldarray heet `step.fields` (NIET `velden`). Step-keys voor emma-telefoon: `bedrijf`, `bereikbaarheid`, `afhandeling`, `kennis`, `integraties`. Signatuur: **`missingForLive(intake, productKey)`** — het schema wordt expliciet op `productKey` gekozen (nooit op een impliciete `intake._productKey`), zodat `emma` en `emma-telefoon` het juiste veldenset pakken. `missingForLive` checkt **alle** `required:true`-velden genest, **zonder** step-/veld-uitzonderingen: velden die de funnel al vooraf invult (`bedrijf.bedrijfsnaam`, `kennis.toon` via `funnel-intake.js#mapVoiceAgent`) zijn dan gewoon aanwezig en tellen niet als missing; de rest (`bedrijf.branche`, `bereikbaarheid.huidig_nummer`, `bereikbaarheid.openingstijden`, `bereikbaarheid.buiten_tijden`, `afhandeling.taken`) vult de klant in de onboarding. Agenda-conditie: `intake.integraties.agenda === 'Google Agenda' && !agendaGekoppeld` → `'agenda_koppeling'`.
- **Enige live-gate voor auto-provisionbare producten (KERN van Plak C):** de `provision()`-uitkomst is de ENIGE poort. `activateOrder` mag de oude interim-kortsluiting `if (isFunnelOrder(order) && !manual) return wachtOpKlant(...)` NIET meer hebben — die hield vroeger élke funnel-order tegen tot een mens 'm handmatig afrondde, en zou nu een klant die de onboarding volledig invult voor eeuwig op `wacht_op_klant` laten staan. In de Plak C-wereld doet `missingForLive` dat werk: onvolledige intake → `provision()` geeft `wacht_op_klant` (order wacht op de onboarding), volledige intake → `klaar` → `actief` — ongeacht `voorstel_id` of `manual`. De `manual`-escape-hatch blijft alleen voor NIET-auto-provisionbare (mens-geleverde) producten. Tasks 2/3 behielden de oude kortsluiting bewust; die wordt in het onboarding-werk verwijderd en de bijbehorende activation-tests worden bijgewerkt.

---

## Bestandsstructuur

**Nieuw:**
- `src/lib/provisioners/index.js` — registry: `resolve()`, `canProvision()`
- `src/lib/provisioners/voice.js` — emma-telefoon/emma provisioner (verplaatste elevenlabs-logica achter de interface)
- `src/lib/onboarding.js` — afgeleide onboarding-state (missing velden, voortgang%)
- `src/lib/agenda-oauth.js` — per-tenant Google-OAuth (initiate/callback, state-HMAC)
- `src/pages/portal/onboarding.astro` — post-pay wizard
- `migrations/0017_onboarding.sql` — `onboarding_nudges`
- Testbestanden per taak onder `test/`

**Gewijzigd:**
- `src/lib/activation.js` — registry-lookup i.p.v. directe elevenlabs-import; state-machine met `attempts`; `wachtOpKlant` zonder interim-alert
- `src/lib/google-auth.js` — `getAccessToken(env, kvKey)` geparametriseerd (admin-pad ongewijzigd)
- `src/lib/mollie.js` — `sendOrderConfirmationMail`-tekst + onboarding-link; nudge-cron-hook
- `src/worker.js` — routes voor onboarding-API + agenda-OAuth; nudge-cron in `scheduled()`

---

### Task 1: Provisioner-registry + voice-provisioner

**Files:**
- Create: `src/lib/provisioners/voice.js`
- Create: `src/lib/provisioners/index.js`
- Test: `test/provisioners.test.js`
- Reference (niet wijzigen): `src/lib/elevenlabs.js` (`provisionAgent`, `buildConfig`, `canProvision`)

**Interfaces:**
- Produces:
  - `voice.js`: `export const productKeys = ['emma-telefoon','emma']`; `export function canProvision(productKey): boolean`; `export function missingForLive(intake): string[]`; `export async function provision(env, { service, order, intake, customerId }): Promise<{status:'klaar'|'wacht_op_klant'|'fout', wachtOp?:string[], error?:string, provisioning?:object}>`
  - `index.js`: `export function resolve(productKey): provisionerModule|null`; `export function canProvision(productKey): boolean`

- [ ] **Step 1: Write failing test** — `test/provisioners.test.js`

```js
import { describe, it, expect, afterEach } from 'vitest';
import * as registry from '../src/lib/provisioners/index.js';
import * as voice from '../src/lib/provisioners/voice.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

describe('provisioner-registry', () => {
  it('resolve mapt emma-telefoon en emma naar de voice-provisioner', () => {
    expect(registry.resolve('emma-telefoon')).toBe(voice);
    expect(registry.resolve('emma')).toBe(voice);
  });
  it('resolve geeft null voor een onbekend/handmatig product', () => {
    expect(registry.resolve('agenda-assistant')).toBe(null);
    expect(registry.canProvision('agenda-assistant')).toBe(false);
    expect(registry.canProvision('emma-telefoon')).toBe(true);
  });
});

describe('voice.missingForLive', () => {
  const compleet = { openingstijden: 'Ma-Vr 9-17', buiten_tijden: 'Voicemail buiten openingstijden', taken: ['Afspraken inplannen'], toon: 'Zakelijk en warm', agenda: 'Geen / weet ik nog niet' };
  it('geeft [] wanneer alle verplichte velden ingevuld zijn en geen agenda gekozen', () => {
    expect(voice.missingForLive(compleet)).toEqual([]);
  });
  it('noemt ontbrekende verplichte velden', () => {
    expect(voice.missingForLive({ ...compleet, openingstijden: '' })).toContain('openingstijden');
  });
  it('eist agenda_koppeling alleen als Google Agenda is gekozen én geen token', () => {
    expect(voice.missingForLive({ ...compleet, agenda: 'Google Agenda', agendaGekoppeld: false })).toContain('agenda_koppeling');
    expect(voice.missingForLive({ ...compleet, agenda: 'Google Agenda', agendaGekoppeld: true })).not.toContain('agenda_koppeling');
    expect(voice.missingForLive({ ...compleet, agenda: 'Geen / weet ik nog niet' })).not.toContain('agenda_koppeling');
  });
});

describe('voice.provision', () => {
  it('geeft wacht_op_klant zonder externe call als er velden ontbreken', async () => {
    let called = false;
    globalThis.fetch = async () => { called = true; return { ok: true, status: 200, text: async () => '{}' }; };
    const r = await voice.provision({ ELEVENLABS_API_KEY: 'k' }, { service: { id: 's1' }, order: { product_key: 'emma-telefoon' }, intake: { openingstijden: '' }, customerId: 'c1' });
    expect(r.status).toBe('wacht_op_klant');
    expect(r.wachtOp).toContain('openingstijden');
    expect(called).toBe(false);
  });
  it('bouwt de agent en geeft klaar als niets ontbreekt', async () => {
    globalThis.fetch = async (url) => {
      const u = String(url);
      if (u.includes('/convai/knowledge-base')) return { ok: true, status: 200, text: async () => JSON.stringify({ id: 'kb_1' }) };
      if (u.includes('/convai/agents/create')) return { ok: true, status: 200, text: async () => JSON.stringify({ agent_id: 'ag_1' }) };
      throw new Error(`onverwacht: ${u}`);
    };
    const intake = { openingstijden: 'Ma-Vr 9-17', buiten_tijden: 'Voicemail buiten openingstijden', taken: ['Afspraken inplannen'], toon: 'Zakelijk en warm', agenda: 'Geen / weet ik nog niet' };
    const r = await voice.provision({ ELEVENLABS_API_KEY: 'k' }, { service: { id: 's1' }, order: { product_key: 'emma-telefoon' }, intake, customerId: 'c1' });
    expect(r.status).toBe('klaar');
    expect(r.provisioning?.agent_id).toBe('ag_1');
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run test/provisioners.test.js` → FAIL (modules bestaan niet). Bevestig eerst tegen `src/lib/elevenlabs.js` de exacte ElevenLabs-endpointpaden (`grep -n "convai\|knowledge-base\|agents/create" src/lib/elevenlabs.js`) en pas de mock-URL's in de test daarop aan vóór stap 3.

- [ ] **Step 3: Implement `voice.js`** — verplaats de call-logica uit `elevenlabs.js` achter de interface. `missingForLive` leest de verplichte velden van `EMMA_TELEFOON`/`EMMA` uit `src/data/intake-schemas.ts` (velden met `required:true`) plus de agenda-conditie. `provision` roept `missingForLive` eerst; leeg → bestaande `provisionAgent`-flow (hergebruik `buildConfig`/`createAgent` uit elevenlabs.js via import, NIET dupliceren) → `{status:'klaar', provisioning:{agent_id,...}}`; een gegooide call → `{status:'fout', error}`.

```js
// src/lib/provisioners/voice.js
import { provisionAgent } from '../elevenlabs.js';
import { getIntakeSchema } from '../../data/intake-schemas.ts';

export const productKeys = ['emma-telefoon', 'emma'];
export function canProvision(productKey) { return productKeys.includes(productKey); }

export function missingForLive(intake) {
  const i = intake || {};
  const schema = getIntakeSchema(i._productKey || 'emma-telefoon');
  const required = schema.steps.flatMap((s) => s.velden.filter((v) => v.required).map((v) => v.name));
  const missing = required.filter((name) => {
    const val = i[name];
    return val == null || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0);
  });
  if (i.agenda === 'Google Agenda' && !i.agendaGekoppeld) missing.push('agenda_koppeling');
  return missing;
}

export async function provision(env, { order, intake }) {
  const missing = missingForLive(intake);
  if (missing.length) return { status: 'wacht_op_klant', wachtOp: missing };
  try {
    const provisioning = await provisionAgent(env.ELEVENLABS_API_KEY, order.product_key, order.product_key, intake);
    return { status: 'klaar', provisioning };
  } catch (err) {
    return { status: 'fout', error: String(err?.message || err).slice(0, 400) };
  }
}
```

> **Let op:** `getIntakeSchema(productKey)` en het veld `velden` moeten overeenkomen met de echte export/veldnaam in `src/data/intake-schemas.ts`. Controleer met `grep -n "export\|steps\|velden\|fields" src/data/intake-schemas.ts` en pas de accessor aan (mogelijk heet het `fields`). Voeg zo nodig een `export function getIntakeSchema(key)` toe aan intake-schemas.ts als die nog niet bestaat (kleine, geïsoleerde toevoeging).

```js
// src/lib/provisioners/index.js
import * as voice from './voice.js';
const PROVISIONERS = [voice];
export function resolve(productKey) {
  return PROVISIONERS.find((p) => p.canProvision(productKey)) || null;
}
export function canProvision(productKey) { return resolve(productKey) != null; }
```

- [ ] **Step 4: Run, verify pass** — `npx vitest run test/provisioners.test.js` → PASS.
- [ ] **Step 5: Commit** — `git add src/lib/provisioners/ test/provisioners.test.js src/data/intake-schemas.ts && git commit -m "feat: provisioner-registry + voice-provisioner achter interface"`

---

### Task 2: `activation.js` op de registry

**Files:**
- Modify: `src/lib/activation.js` (import + `activateOrder`)
- Test: `test/activation-registry.test.js`

**Interfaces:**
- Consumes: `provisioners/index.js` `resolve()`, `canProvision()`; `voice.provision()`.
- Produces: `activateOrder(env, order, {manual})` gedrag ongewijzigd aan de buitenkant behalve de nieuwe `wacht_op_klant`-uitkomst zonder alert (Task 3).

- [ ] **Step 1: Failing test** — bewijs dat een `emma-telefoon`-order via de registry provisioned en dat een niet-provisionabel product park't. Stub `provisioners/index.js` via `vi.mock` of injecteer een fake env. Gebruik de bestaande D1-stubstijl.

```js
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('../src/lib/provisioners/index.js', () => ({
  resolve: (pk) => (pk === 'emma-telefoon'
    ? { provision: async () => ({ status: 'klaar', provisioning: { agent_id: 'ag_1' } }) }
    : null),
  canProvision: (pk) => pk === 'emma-telefoon',
}));

const { activateOrder } = await import('../src/lib/activation.js');
afterEach(() => vi.restoreAllMocks());

function db(order) { /* D1-stub: services INSERT OR IGNORE, SELECT provisioning_json=null, UPDATE's → changes:1 */ }

it('provisioned een emma-telefoon order via de registry', async () => {
  // manual:true om de funnel-wachtstand over te slaan; verwacht status 'actief'
});
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run test/activation-registry.test.js` → FAIL.
- [ ] **Step 3: Implement** — vervang in `activation.js`:
  - `import { provisionAgent, canProvision } from './elevenlabs.js';` → `import { resolve, canProvision } from './provisioners/index.js';`
  - regel ~150 `const autoProduct = canProvision(order.product_key);` (blijft, nu uit registry).
  - regel ~181 `provisionAgent(...)` → `const provisioner = resolve(order.product_key); const result = await provisioner.provision(env, { service, order, intake: safeParseJson(order.intake_json), customerId: order.customer_id });`
  - `result.status` kent nu 3 waarden — behandel in Task 3. Voor deze taak: `klaar`→bestaand actief-pad; `fout`→bestaand park/fout-pad; `wacht_op_klant`→bestaand `wachtOpKlant`.
  - `env.ELEVENLABS_API_KEY`-guard (regel ~168) blijft: geen key → park met config-fout.
- [ ] **Step 4: Run** — `npx vitest run test/activation-registry.test.js` + `npm test` → PASS (geen regressie in bestaande activation-tests).
- [ ] **Step 5: Commit** — `git add src/lib/activation.js test/activation-registry.test.js && git commit -m "refactor: activation.js gebruikt provisioner-registry"`

---

### Task 3: State-machine — `attempts` + `wacht_op_klant` zonder interim-alert

**Files:**
- Modify: `src/lib/activation.js` (`wachtOpKlant`, fout-pad, `provisioning_json.attempts`)
- Test: `test/activation-statemachine.test.js`

**Interfaces:**
- Produces: `provisioning_json` bevat `attempts:number`; `fout` alert't pas bij `attempts>=3`; `wachtOpKlant` doet **geen** `alertStaff` meer.

- [ ] **Step 1: Failing test** — drie cases:

```js
it('wacht_op_klant zet order op in_uitvoering en alert NIET', async () => {/* spy op alertStaff → niet aangeroepen */});
it('fout hoogt attempts op en alert pas bij de 3e poging', async () => {/* prov=fout, prov_json.attempts 0→1 geen alert; bij binnenkomende attempts=2 → 3 → alert */});
it('geslaagde provisioning wordt nooit herhaald (replay)', async () => {/* prov_json.status=klaar → geen tweede provision-call */});
```

- [ ] **Step 2: Run, verify fail** → FAIL.
- [ ] **Step 3: Implement**:
  - In het `fout`-pad: lees `prov.attempts||0`, schrijf `{...result, attempts: attempts+1}` naar `provisioning_json`; roep `park()`/`alertStaff` **alleen** aan als `attempts+1 >= 3`, anders stille `in_uitvoering` (nieuwe helper `stilFout(db, order, svcId)` die de status zet zonder alert).
  - In `wachtOpKlant`: verwijder de `alertStaff(...)`-aanroep (het "TIJDELIJK"-blok, regels ~72-108) — behoud de fires-once state-UPDATE. Werk de bovenstaande comment bij naar "klant wordt via /portal/onboarding + nudge-cron genudged".
- [ ] **Step 4: Run** — `npx vitest run test/activation-statemachine.test.js` + `npm test` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: provisioning-state-machine attempts + stille wacht_op_klant"`

---

### Task 4: Retry-cron voor `fout`-orders

**Files:**
- Modify: `src/worker.js` (`scheduled()`), evt. nieuwe helper `src/lib/activation.js` `retryFailedProvisions(env)`
- Test: `test/provision-retry-cron.test.js`

**Interfaces:**
- Produces: `export async function retryFailedProvisions(env)` in `activation.js` — selecteert services `provisioning_json.status='fout'` via de bijbehorende order, `attempts<3`, roept `activateOrder` opnieuw aan; best-effort.

- [ ] **Step 1: Failing test** — een order met een `fout`-service en `attempts:1` wordt opnieuw geprovisioned; met `attempts:3` niet.
- [ ] **Step 2: Run, verify fail** → FAIL.
- [ ] **Step 3: Implement** `retryFailedProvisions` (D1-query op services met JSON-filter in JS, niet in SQL: haal kandidaten `service_orders.status='in_uitvoering'` op, parse provisioning_json, filter `status==='fout' && attempts<3`), roep `activateOrder(env, order)` aan. Hang 'm in `scheduled()` naast `reconcilePayments`, in dezelfde `try/catch` best-effort-stijl als `notifyOutreachFollowups` (worker.js ~1014).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: retry-cron voor mislukte provisioning (attempts<3)"`

---

### Task 5: `onboarding.js` — afgeleide onboarding-state

**Files:**
- Create: `src/lib/onboarding.js`
- Test: `test/onboarding-state.test.js`

**Interfaces:**
- Produces: `export function onboardingState(order, agendaGekoppeld): { productKey, missing:string[], progressPct:number, klaar:boolean }`. Pure functie (geen env/DB) — krijgt de order + een reeds-opgehaalde `agendaGekoppeld`-bool mee.

- [ ] **Step 1: Failing test**

```js
import { onboardingState } from '../src/lib/onboarding.js';
it('berekent voortgang uit ingevulde verplichte velden', () => {
  const order = { product_key: 'emma-telefoon', intake_json: JSON.stringify({ openingstijden: 'Ma-Vr', buiten_tijden: 'x', taken: ['a'], toon: '' }) };
  const st = onboardingState(order, false);
  expect(st.klaar).toBe(false);
  expect(st.missing).toContain('toon');
  expect(st.progressPct).toBeGreaterThan(0);
  expect(st.progressPct).toBeLessThan(100);
});
it('klaar=true en 100% wanneer niets ontbreekt', () => {
  const order = { product_key: 'emma-telefoon', intake_json: JSON.stringify({ openingstijden: 'x', buiten_tijden: 'x', taken: ['a'], toon: 'Informeel', agenda: 'Geen / weet ik nog niet' }) };
  expect(onboardingState(order, false)).toMatchObject({ klaar: true, progressPct: 100 });
});
```

- [ ] **Step 2: Run, verify fail** → FAIL.
- [ ] **Step 3: Implement** — parse `intake_json`, injecteer `agendaGekoppeld` + `_productKey`, roep `voice.missingForLive` (via `resolve(productKey).missingForLive`) aan; `progressPct = round(100*(totaalVerplicht - missing.length)/totaalVerplicht)`; `klaar = missing.length===0`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: onboarding-state (voortgang + ontbrekende velden)"`

---

### Task 6: `GET /api/portal/onboarding` — state ophalen (IDOR-veilig)

**Files:**
- Modify: `src/worker.js` (route + handler, of nieuwe `src/lib/onboarding-routes.js`)
- Test: `test/onboarding-get.test.js`

**Interfaces:**
- Consumes: sessie-`customer_id` (bestaande sessie-helper uit `auth.js`); `onboardingState`.
- Produces: `GET /api/portal/onboarding?order=<id>` → `200 {productKey, missing, progressPct, klaar, schema}` alleen als de order bij de sessie-klant hoort; anders `404` (hetzelfde scherm als onbekend).

- [ ] **Step 1: Failing test** — order van sessie-klant → 200 met state; order van een andere klant → 404; geen sessie → 401.
- [ ] **Step 2: Run, verify fail** → FAIL.
- [ ] **Step 3: Implement** — valideer sessie (bestaand patroon uit `portal-routes.js`), `SELECT ... FROM service_orders WHERE id=? AND customer_id=?`, geef `onboardingState(order, agendaGekoppeld)` + het intake-schema terug (voor de renderer). `agendaGekoppeld` = `GOOGLE_TOKENS.get('oauth:google:cust:'+customerId)` niet-null.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: GET /api/portal/onboarding (sessie-gescoped)"`

---

### Task 7: `POST /api/portal/onboarding` — antwoorden opslaan + her-provision

**Files:**
- Modify: `src/worker.js`/`onboarding-routes.js`
- Test: `test/onboarding-post.test.js`

**Interfaces:**
- Consumes: `activateOrder`; sessie-`customer_id`.
- Produces: `POST /api/portal/onboarding` body `{order_id, answers}` → merge't `answers` in `service_orders.intake_json`, roept `activateOrder(env, order)` aan, geeft nieuwe state of `{actief:true}`.

- [ ] **Step 1: Failing test** — een POST die de laatste ontbrekende velden invult → order gaat naar `actief` (activateOrder gemockt/gestubd op provision `klaar`); vreemde order_id → 404; answers worden ge-merged, niet vervangen (bestaande velden blijven).
- [ ] **Step 2: Run, verify fail** → FAIL.
- [ ] **Step 3: Implement** — valideer sessie + eigenaarschap; sanitize/merge answers (spread over bestaande `intake_json`), `UPDATE service_orders SET intake_json=?`; `activateOrder(env, {...order, intake_json: merged})`; map resultaat: `klaar`→`{actief:true}`, anders nieuwe `onboardingState`. Nooit answers vertrouwen voor prijs/tier (die staan al vast op de order).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: POST /api/portal/onboarding — merge intake + her-provision"`

---

### Task 8: `onboarding.astro` — post-pay wizard

**Files:**
- Create: `src/pages/portal/onboarding.astro`
- Reference: `src/pages/portal/intake.astro` (veld-renderer), `PortalLayout`
- Test: `test/onboarding-page.test.js` (statische assertions op de gerenderde HTML/inline-script, zelfde stijl als `test/base-layout-analytics.test.js`)

**Interfaces:**
- Consumes: `GET/POST /api/portal/onboarding`.

- [ ] **Step 1: Failing test** — de pagina bevat `noindex`, de voortgangsindicator, en fetcht `/api/portal/onboarding`; bevat de agenda-koppelknop die naar `/api/portal/onboarding/agenda/initiate` wijst; AI-disclosure aanwezig.
- [ ] **Step 2: Run, verify fail** → FAIL.
- [ ] **Step 3: Implement** — hergebruik de veld-renderer van `intake.astro` (extraheer die zo nodig naar een gedeeld Astro-component `src/components/IntakeFields.astro` als `intake.astro` het inline heeft — kleine, gerichte split). Client-script: laad state, render openstaande stappen, POST per stap, toon voortgang%, en een "Koppel Google Agenda"-knop wanneer `agenda==='Google Agenda' && !agendaGekoppeld`.
- [ ] **Step 4: Run** — `npx vitest run test/onboarding-page.test.js` + `npm run build` (statische build mag niet breken) → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: /portal/onboarding wizard"`

---

### Task 9: Confirmation-mail-tekst + onboarding-link

**Files:**
- Modify: `src/lib/mollie.js` (`sendOrderConfirmationMail`, regel ~504-514)
- Test: `test/order-confirmation-mail.test.js`

- [ ] **Step 1: Failing test** — voor een funnel-order (niet direct live) bevat de mail de tekst "Rond de laatste stap af in uw klantportaal" + een link naar `/portal/onboarding?order=<id>` en NIET meer "u hoeft zelf niets te doen".
- [ ] **Step 2: Run, verify fail** → FAIL.
- [ ] **Step 3: Implement** — vervang de `!isLive`/onboarding-tak-tekst (regel ~514) door de nieuwe copy + link. Merkregels: AI-disclosure/KvK ongewijzigd elders in de mail.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: bevestigingsmail verwijst klant naar onboarding-portaal"`

---

### Task 10: `google-auth.js` geparametriseerd op KV-key

**Files:**
- Modify: `src/lib/google-auth.js`
- Test: `test/google-auth-multitenant.test.js`

**Interfaces:**
- Produces: `getAccessToken(env, kvKey = 'oauth:google:admin')` — default = huidig admin-gedrag (regressie), expliciete key voor klant-tokens.

- [ ] **Step 1: Failing test** — `getAccessToken(env, 'oauth:google:cust:c1')` leest/refresh't onder die key; zonder key-arg leest het `oauth:google:admin` (regressie: admin-pad ongewijzigd). Mock `GOOGLE_TOKENS` KV + token-refresh `fetch`.
- [ ] **Step 2: Run, verify fail** → FAIL.
- [ ] **Step 3: Implement** — vervang de hardcoded `KV_KEY`-referenties in `getAccessToken` (en de put bij refresh) door de parameter, default `'oauth:google:admin'`.
- [ ] **Step 4: Run** — `npx vitest run test/google-auth-multitenant.test.js` + `npm test` (bestaande Google-agenda-tests groen) → PASS.
- [ ] **Step 5: Commit** — `git commit -m "refactor: google-auth token-key parametriseerbaar (multi-tenant)"`

---

### Task 11: Agenda-OAuth — per-tenant initiate/callback

**Files:**
- Create: `src/lib/agenda-oauth.js`
- Modify: `src/worker.js` (2 routes)
- Test: `test/agenda-oauth.test.js`

**Interfaces:**
- Consumes: `google-auth.js` (token-opslag onder klant-key), `PORTAL_SESSION_SECRET` (state-HMAC), sessie-`customer_id`.
- Produces:
  - `GET /api/portal/onboarding/agenda/initiate?order=<id>` → 302 naar Google-consent met `state = base64url(customerId.orderId.HMAC)`, scope `calendar.events`.
  - `GET /api/portal/onboarding/agenda/callback?code=&state=` → verifieert **uitsluitend de state-HMAC** (GEEN sessie-match), wisselt code, slaat tokens onder `oauth:google:cust:<customerId>` (uit de state), redirect `/portal/onboarding?order=<id>`.
  - **CORRECTIE (na security-review, HIGH): de callback draait buiten de Strict-sessie-gate, maar `state`-HMAC alléén is NIET genoeg** (geen TTL/single-use/browser-binding → calendar-binding-hijack via gelekte state). Vereist ontwerp:
    1. **State-TTL:** de getekende payload bevat een timestamp + context-prefix: `agenda-state:v1|${customerId}.${orderId}.${Date.now()}`; `verifyAgendaState` verwerpt payloads ouder dan **15 min** (en toekomst-skew >60s) én zonder de exacte prefix (domain-separation t.o.v. sessie-/consent-tokens die hetzelfde `PORTAL_SESSION_SECRET` tekenen).
    2. **Browser-binding via een aparte `SameSite=Lax` cookie:** `initiate` zet naast de 302 een korte cookie `agenda_oauth_bind=<nonce>` (`Path=/api/portal/onboarding/agenda/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=900`), waarbij de nonce aan de `state` is gecommit (nonce mee-signen). Lax-cookies wórden meegestuurd op Google's top-level cross-site GET-302 (in tegenstelling tot Strict). De callback (krijgt nu `request`) eist dat de cookie aanwezig is en matcht met de nonce uit de state; anders 400. Een aanvaller kan die cookie niet in het slachtoffer-browser zetten, dus een gelekte `state` alleen is onbruikbaar.
    3. Overige hardening in dezelfde change: geen reflectie van de `?error=`-param, geen Google-responsebody in geworpen refresh-fouten, `Number.isFinite(expires_in)`-guard, expliciete `parts.length`-guard. `initiate` blijft sessie-gescoped + order-eigenaarschapscheck.
  - `export async function buildAgendaState(secret, customerId, orderId)` / `verifyAgendaState(secret, state)` (pure, testbaar).

- [ ] **Step 1: Failing test** — `buildAgendaState`/`verifyAgendaState` rond-trip; gemanipuleerde state → verworpen; callback met een sessie-`customer_id` die niet matcht met de state → 403; geldige callback slaat tokens op onder de klant-key (mock KV + Google token-exchange fetch).
- [ ] **Step 2: Run, verify fail** → FAIL.
- [ ] **Step 3: Implement** — state = `constant-time` HMAC-SHA256 (hergebruik `sha256Hex`/`constantTimeEqual`-patroon uit `mollie.js`/`auth.js`). `initiate` bouwt de Google-consent-URL (`client_id`, `redirect_uri`, `scope`, `access_type=offline`, `prompt=consent`, `state`). `callback` verifieert, POST't naar `https://oauth2.googleapis.com/token`, schrijft `{access,refresh,expiry}` via KV onder klant-key. Nooit tokens naar de client.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: per-tenant Google-agenda OAuth (initiate/callback, state-HMAC)"`

---

### Task 12: Migratie `0017_onboarding.sql`

**Files:**
- Create: `migrations/0017_onboarding.sql`
- Test: `test/migration-0017.test.js` (statische assertie: bevat CREATE TABLE IF NOT EXISTS onboarding_nudges met de kolommen)

- [ ] **Step 1: Failing test** — lees het bestand, assert de tabelnaam + kolommen (`order_id` PK, `customer_id`, `aantal`, `laatst_genudged`, `created_at`).
- [ ] **Step 2: Run, verify fail** → FAIL.
- [ ] **Step 3: Implement**

```sql
-- Plak C: onboarding-nudges. Apply: npx wrangler d1 execute aanloop-portal --remote --file=migrations/0017_onboarding.sql
-- LET OP: draai exact één keer (M-goedkeuring vereist).
CREATE TABLE IF NOT EXISTS onboarding_nudges (
  order_id        TEXT PRIMARY KEY REFERENCES service_orders(id),
  customer_id     TEXT NOT NULL,
  aantal          INTEGER NOT NULL DEFAULT 0,
  laatst_genudged INTEGER,
  created_at      INTEGER NOT NULL
);
```

- [ ] **Step 4: Run** → PASS. **NIET** remote uitvoeren (wacht op M-goedkeuring in Task 14).
- [ ] **Step 5: Commit** — `git commit -m "feat: migratie 0017 onboarding_nudges"`

---

### Task 13: Nudge-cron

**Files:**
- Create: `src/lib/onboarding-nudge.js` (`nudgeOnboarding(env)`)
- Modify: `src/worker.js` (`scheduled()`)
- Test: `test/onboarding-nudge.test.js`

**Interfaces:**
- Consumes: `sendMail` (uit `portal-routes.js`, al geëxporteerd), `alertStaff`, D1.
- Produces: `export async function nudgeOnboarding(env)` — selecteert onboarding-orders >24u sinds vorige nudge, `aantal<3`; mailt de klant + hoogt op; 3e nudge → één `alertStaff` + stop.

- [ ] **Step 1: Failing test**

```js
it('nudget een onboarding-order ouder dan 24u en hoogt aantal op', async () => {/* order in_uitvoering + service onboarding, nudge-rij aantal=0, laatst>24u → sendMail aangeroepen, aantal→1 */});
it('nudget NIET binnen 24u na de vorige nudge', async () => {/* laatst_genudged=now → geen mail */});
it('na de 3e nudge: staff-alert en geen klant-mail meer', async () => {/* aantal=3 → alertStaff, geen sendMail */});
```

- [ ] **Step 2: Run, verify fail** → FAIL.
- [ ] **Step 3: Implement** — selecteer kandidaten (join service_orders `in_uitvoering` + services `onboarding`), left-join `onboarding_nudges`; per kandidaat: `now - (laatst_genudged||created_at) > 24u` && `aantal<3` → `sendMail(klant, onboarding-link)` + upsert `aantal+1`, `laatst_genudged=now`; `aantal===3` (net bereikt) → één `alertStaff`. Best-effort in `scheduled()`, zelfde tick-stijl als Task 4. Insert de nudge-rij bij eerste onboarding-transitie (of lazily in de cron met `INSERT OR IGNORE`).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: nudge-cron voor onvoltooide onboarding (max 3, dan staff-alert)"`

---

### Task 14: Integratie — suite groen, build, deploy, migratie, live e2e

**Files:** — (geen nieuwe; controller-taak)

- [ ] **Step 1** — `npm test` volledig groen (alle nieuwe + bestaande, geen regressie).
- [ ] **Step 2** — `npm run build` slaagt (252+ pagina's, statisch).
- [ ] **Step 3** — Whole-branch review (opus/sonnet code-reviewer) op de betaal-/provisioning-/OAuth-paden; blokkerende bevindingen fixen.
- [ ] **Step 4 (M-actie)** — Google Cloud console: redirect-URI `https://aanloopai.nl/api/portal/onboarding/agenda/callback` toevoegen aan de OAuth-client.
- [ ] **Step 5 (M-actie)** — migratie 0017 op remote D1 (na expliciete goedkeuring), formaat: "migrations/0017_onboarding.sql op aanloop-portal remote D1 uitvoeren"; verifieer tabel bestaat.
- [ ] **Step 6 (M-actie)** — `npm run build && npx wrangler deploy`.
- [ ] **Step 7** — `deploy-verify` skill PASS + push branch.
- [ ] **Step 8** — Live e2e (Claude-in-Chrome): betaalde order → /portal/onboarding → intake invullen → (agenda koppelen) → order wordt `actief`; controleer D1 (services='actief', order='actief') en dat geen staff-alert vuurde.

---

## Self-Review (uitgevoerd)

- **Spec-dekking:** §3.1 registry → T1/T2; §3.2 state-machine → T3/T4; §3.3 onboarding → T5-T9; §3.4 agenda-OAuth → T10/T11; §3.5 nudges → T12/T13; §6 testen → per taak; §7 deploy → T14. Alle spec-secties gedekt.
- **Placeholders:** de accessor-namen in `intake-schemas.ts` (`getIntakeSchema`/`velden` vs `fields`) zijn expliciet gemarkeerd als "verifiëren met grep vóór implementatie" — geen blinde aanname. Overige stappen bevatten concrete code/queries.
- **Type-consistentie:** `provision()` retourneert overal `{status,'klaar'|'wacht_op_klant'|'fout', wachtOp?,error?,provisioning?}`; `missingForLive` overal `string[]`; `onboardingState(order, agendaGekoppeld)` consistent tussen T5/T6/T7.
- **Volgorde:** registry (T1) vóór activation (T2/T3) vóór onboarding-API (T5-T7) vóór pagina (T8); OAuth (T10/T11) vóór de agenda-conditie live gaat; migratie (T12) vóór nudge-cron (T13).
