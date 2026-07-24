# Admin klant/dienst-beheer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** De eigenaar kan in `/admin` een dienst pauzeren (met ElevenLabs-agent-teardown) of een dienst/klant verwijderen (cascade + agent+KB-opruiming), met bedrijfsnaam-bevestiging bij klant-verwijdering.

**Architecture:** Een ElevenLabs teardown-helper + drie admin-API-mutaties (`updateService` uitbreiding, `deleteService`, `deleteCustomer`) achter de bestaande staff-gate, plus knoppen in `klant.astro`. Teardown is best-effort en blokkeert de D1-opruiming nooit.

**Tech Stack:** Cloudflare Workers (JS), Astro (admin-pagina's), D1 (SQLite), ElevenLabs ConvAI API, vitest.

## Global Constraints

- Staff-only: alle `/api/admin/*` draaien achter de sessie+rolcheck in `handleAdminApi` — nieuwe routes MOETEN binnen die gate gedispatcht worden.
- Verwijderen is onomkeerbaar → klant-verwijdering vereist `confirm === customer.bedrijf` (exacte match, anders 400); dienst-verwijdering vraagt een front-end "weet u het zeker".
- ElevenLabs-teardown is BEST-EFFORT: gooit nooit door; een mislukte delete → `console.error` + `alertStaff`, D1-opruiming gaat door.
- DELETE-queries ALTIJD gescoped op de klant/dienst (nooit een `WHERE`-loze delete). Cascade kind→ouder.
- `provisioning_json` = `{status, agent_id, kb_id, provisioned_at}`. ElevenLabs base `https://api.elevenlabs.io/v1`, auth-header `xi-api-key`, key `env.ELEVENLABS_API_KEY`.
- `git add` alleen expliciete paden (nooit `-A`; OneDrive-tree permanent vies). Geen hooks bypassen.
- Tests: vitest, D1-stubstijl als bestaande `test/admin-*.test.js`/`test/activation-*.test.js`; `globalThis.fetch`-mock voor ElevenLabs-calls; `afterEach` herstelt fetch.
- Werkt op branch `feat/selfserve-plak-a`. Geen migratie nodig.

---

## Bestandsstructuur

- `src/lib/elevenlabs.js` (wijzigen) — `deleteAgent`, `teardownProvisioning` toevoegen.
- `src/lib/admin-routes.js` (wijzigen) — `updateService` uitbreiden; `deleteService` + `deleteCustomer` + dispatch-regels.
- `src/pages/admin/klant.astro` (wijzigen) — pauze/hervat/verwijder-dienst + verwijder-klant-UI.
- Tests: `test/elevenlabs-teardown.test.js`, `test/admin-service-pause.test.js`, `test/admin-delete-service.test.js`, `test/admin-delete-customer.test.js`.

---

### Task 1: ElevenLabs `deleteAgent` + `teardownProvisioning`

**Files:**
- Modify: `src/lib/elevenlabs.js`
- Test: `test/elevenlabs-teardown.test.js`
- Reference: bestaande `deleteKbDoc` (DELETE-patroon) + `elFetch`.

**Interfaces:**
- Produces: `export async function deleteAgent(apiKey, agentId): Promise<void>` — DELETE `/convai/agents/{agentId}`; 404 → geslikt (al weg); andere non-2xx → gooit. `export async function teardownProvisioning(env, provisioning): Promise<void>` — verwijdert agent (`provisioning.agent_id`) én KB (`provisioning.kb_id` via bestaande `deleteKbDoc`); elk in eigen try/catch, gooit NOOIT; geen `ELEVENLABS_API_KEY` of leeg provisioning → no-op.

- [ ] **Step 1: Failing test** — `test/elevenlabs-teardown.test.js`

```js
import { describe, it, expect, afterEach, vi } from 'vitest';
import { deleteAgent, teardownProvisioning } from '../src/lib/elevenlabs.js';

const origFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = origFetch; });

describe('deleteAgent', () => {
  it('doet een DELETE naar /convai/agents/{id}', async () => {
    let called = null;
    globalThis.fetch = async (url, opts) => { called = { url: String(url), method: opts.method }; return { ok: true, status: 200, text: async () => '' }; };
    await deleteAgent('k', 'ag_1');
    expect(called.method).toBe('DELETE');
    expect(called.url).toContain('/convai/agents/ag_1');
  });
  it('slikt een 404 (agent al weg)', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 404, text: async () => 'not found' });
    await expect(deleteAgent('k', 'ag_1')).resolves.toBeUndefined();
  });
  it('gooit op een andere non-2xx', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 500, text: async () => 'boom' });
    await expect(deleteAgent('k', 'ag_1')).rejects.toThrow();
  });
});

describe('teardownProvisioning', () => {
  it('verwijdert agent én KB, gooit nooit ook al faalt de agent-delete', async () => {
    const calls = [];
    globalThis.fetch = async (url, opts) => {
      calls.push(`${opts.method} ${String(url)}`);
      if (String(url).includes('/convai/agents/')) return { ok: false, status: 500, text: async () => 'boom' };
      return { ok: true, status: 200, text: async () => '' };
    };
    await expect(teardownProvisioning({ ELEVENLABS_API_KEY: 'k' }, { agent_id: 'ag_1', kb_id: 'kb_1' })).resolves.toBeUndefined();
    expect(calls.some((c) => c.includes('/convai/agents/ag_1'))).toBe(true);
    expect(calls.some((c) => c.includes('/convai/knowledge-base/kb_1'))).toBe(true);
  });
  it('no-op zonder key of zonder ids', async () => {
    let called = false;
    globalThis.fetch = async () => { called = true; return { ok: true, status: 200, text: async () => '' }; };
    await teardownProvisioning({}, { agent_id: 'ag_1' });
    await teardownProvisioning({ ELEVENLABS_API_KEY: 'k' }, null);
    expect(called).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify fail** — `npx vitest run test/elevenlabs-teardown.test.js` → FAIL (functies bestaan niet). Bevestig eerst het exacte KB-delete-pad/methode via `grep -nE "convai/knowledge-base|method: 'DELETE'|deleteKbDoc" src/lib/elevenlabs.js` en stem de test-URL's daarop af.
- [ ] **Step 3: Implement** — `deleteAgent`: directe `fetch(`${API}/convai/agents/${agentId}`, {method:'DELETE', headers:{'xi-api-key':apiKey}})`; `res.status===404` → return; `!res.ok` → throw met status. `teardownProvisioning(env, provisioning)`: als `!env.ELEVENLABS_API_KEY || !provisioning` → return; `if (provisioning.agent_id) try { await deleteAgent(key, provisioning.agent_id) } catch(e){ console.error(...) }`; `if (provisioning.kb_id) try { await deleteKbDoc(key, provisioning.kb_id) } catch(e){ console.error(...) }`.
- [ ] **Step 4: Run, verify pass** — `npx vitest run test/elevenlabs-teardown.test.js` → PASS.
- [ ] **Step 5: Commit** — `git add src/lib/elevenlabs.js test/elevenlabs-teardown.test.js && git commit -m "feat: ElevenLabs deleteAgent + teardownProvisioning"`

---

### Task 2: `updateService` — pauze (teardown) & hervat (re-provision)

**Files:**
- Modify: `src/lib/admin-routes.js` (`updateService`, ~regel 265-277)
- Test: `test/admin-service-pause.test.js`

**Interfaces:**
- Consumes: `teardownProvisioning` (Task 1), `activateOrder` (`activation.js`), `safeParseJson` (bestaand in admin-routes.js).
- Produces: PATCH `/api/admin/service` gedrag: `status→'gepauzeerd'` ruimt de agent op + zet `provisioning_json=NULL`; `status→'actief'` op een leeg/`fout`-provisioning + provisionbaar product re-provisiont via `activateOrder`.

- [ ] **Step 1: Failing test** — `test/admin-service-pause.test.js` (D1-stub die de service-rij + order teruggeeft; mock `teardownProvisioning`/`activateOrder` via `vi.mock` van de modules, of injecteer):

```js
// Pauze: verwacht dat teardownProvisioning is aangeroepen met de agent, en de UPDATE zet provisioning_json op NULL + status 'gepauzeerd'.
// Hervat (van gepauzeerd, provisioning leeg, product emma-telefoon): verwacht activateOrder-aanroep.
// Statuswijziging naar dezelfde/niet-provisionbare waarde: geen teardown/geen activate, alleen de bestaande UPDATE.
```

- [ ] **Step 2: Run, verify fail** → FAIL.
- [ ] **Step 3: Implement** — in `updateService`: nadat `current` en `status` bepaald zijn:
  - `if (status === 'gepauzeerd' && current.status !== 'gepauzeerd') { await teardownProvisioning(env, safeParseJson(current.provisioning_json)); }` en in de UPDATE `provisioning_json = NULL` zetten (i.p.v. `config_json`-only) voor dit pad.
  - `if (status === 'actief' && needsProvisioningLeeg(current.provisioning_json) && canProvision(product))`: haal de order (`SELECT * FROM service_orders WHERE id = current.order_id`) en `await activateOrder(env, order)`; laat `activateOrder` de status/provisioning zetten. (Product-key komt van de service; `canProvision` uit `provisioners/index.js`.)
  - Anders: bestaand gedrag (alleen velden updaten). Zorg dat de bestaande naam/tier/config-update blijft werken.
  - Voeg de nodige imports toe (`teardownProvisioning`, `activateOrder`, `canProvision`).
- [ ] **Step 4: Run** — `npx vitest run test/admin-service-pause.test.js` + `npm test` → PASS (bestaande updateService-tests groen).
- [ ] **Step 5: Commit** — `git commit -m "feat: dienst pauzeren ruimt agent op, hervatten re-provisiont"`

---

### Task 3: `deleteService` (`DELETE /api/admin/service`)

**Files:**
- Modify: `src/lib/admin-routes.js` (nieuwe functie + dispatch)
- Test: `test/admin-delete-service.test.js`

**Interfaces:**
- Consumes: `teardownProvisioning`, `cancelSubscription` (`mollie.js`) of directe subscription-cancel.
- Produces: `DELETE /api/admin/service?id=<serviceId>` → agent+KB weg, subscription geannuleerd, order `geannuleerd`, service-rij weg; onbekend id → 404.

- [ ] **Step 1: Failing test** — `test/admin-delete-service.test.js`: een bestaande service met provisioning → 200; assert dat teardown draaide, `UPDATE subscriptions ... canceled`, `UPDATE service_orders ... geannuleerd`, `DELETE FROM services` (met de juiste id) draaiden; onbekend id → 404 (geen deletes).
- [ ] **Step 2: Run, verify fail** → FAIL.
- [ ] **Step 3: Implement** — `deleteService(request, env)`:
  1. `id` uit `url.searchParams` (of body); ontbreekt → 400.
  2. `SELECT id, customer_id, order_id, provisioning_json FROM services WHERE id = ?`; niet gevonden → 404.
  3. `await teardownProvisioning(env, safeParseJson(svc.provisioning_json))`.
  4. `UPDATE subscriptions SET status='canceled' WHERE order_id = ?` (bind svc.order_id) — of `cancelSubscription` als je de sub-id ophaalt.
  5. `UPDATE service_orders SET status='geannuleerd' WHERE id = ?` (bind svc.order_id).
  6. `DELETE FROM services WHERE id = ?`.
  7. `jsonResponse({ ok: true, message: 'Dienst verwijderd' })`.
  Dispatch: `if (path === '/api/admin/service' && method === 'DELETE') return await deleteService(request, env);` (naast de bestaande POST/PATCH-regels).
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: DELETE /api/admin/service — dienst + agent + subscription opruimen"`

---

### Task 4: `deleteCustomer` (`DELETE /api/admin/customer`)

**Files:**
- Modify: `src/lib/admin-routes.js` (nieuwe functie + dispatch)
- Test: `test/admin-delete-customer.test.js`

**Interfaces:**
- Consumes: `teardownProvisioning`.
- Produces: `DELETE /api/admin/customer?id=<customerId>` body `{confirm}` → `confirm !== customer.bedrijf` → 400; match → alle agents ge-teardownd + cascade delete van alle klant-rijen; onbekend id → 404.

- [ ] **Step 1: Failing test** — `test/admin-delete-customer.test.js`: mismatch `confirm` → 400 (geen delete); correcte `confirm` → teardown per service + de reeks DELETEs (assert de tabellen + scope via de D1-stub); onbekende klant → 404.
- [ ] **Step 2: Run, verify fail** → FAIL.
- [ ] **Step 3: Implement** — `deleteCustomer(request, env)`:
  1. `id` uit query; body `{confirm}`.
  2. `SELECT id, bedrijf FROM customers WHERE id = ?`; niet gevonden → 404.
  3. `if ((confirm||'').trim() !== customer.bedrijf) return errorResponse('Bevestiging komt niet overeen', 400)`.
  4. `const services = SELECT id, provisioning_json FROM services WHERE customer_id = ?`; `for (const s of services) await teardownProvisioning(env, safeParseJson(s.provisioning_json))`.
  5. Cascade DELETE (kind→ouder), elk gescoped:
     - `DELETE FROM invoices WHERE customer_id = ?`
     - `DELETE FROM payments WHERE customer_id = ?`
     - `DELETE FROM voorstel_claims WHERE voorstel_id IN (SELECT id FROM voorstellen WHERE intake_id IN (SELECT id FROM intake_requests WHERE customer_json LIKE ?))` — LET OP: voorstellen hebben geen directe customer_id; koppel via de order (`service_orders.voorstel_id`) i.p.v. via intake. Gebruik: verzamel eerst `voorstelIds = SELECT voorstel_id FROM service_orders WHERE customer_id = ? AND voorstel_id IS NOT NULL`, dan `DELETE FROM voorstel_claims WHERE voorstel_id IN (...)` en later `DELETE FROM voorstellen WHERE id IN (...)` + `DELETE FROM intake_requests WHERE id IN (SELECT intake_id FROM voorstellen WHERE id IN (...))`. (Verifieer de exacte kolomnamen tegen de DB vóór implementatie met een `pragma_table_info`-grep of `list_tables`.)
     - `DELETE FROM subscriptions WHERE customer_id = ?`
     - `DELETE FROM services WHERE customer_id = ?`
     - `DELETE FROM service_orders WHERE customer_id = ?`
     - `DELETE FROM magic_links WHERE user_id IN (SELECT id FROM users WHERE customer_id = ?)`
     - `DELETE FROM users WHERE customer_id = ?`
     - `DELETE FROM customers WHERE id = ?`
     Gebruik waar mogelijk `db.batch([...])` voor de reeks; anders sequentieel in de juiste volgorde.
  6. `jsonResponse({ ok: true, message: 'Klant verwijderd' })`.
  Dispatch: `if (path === '/api/admin/customer')` uitbreiden met `method === 'DELETE' → deleteCustomer`.
  > **Verifieer vóór implementatie** de exacte kolomnamen (`invoices.customer_id`, `payments.customer_id`, `voorstellen.intake_id`, `service_orders.voorstel_id`, `magic_links.user_id`) met een read-only D1-query of de bestaande cleanup-SQL-structuur — pas de queries aan op de echte kolommen. Sla geen tabel over die een FK naar de klant heeft.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: DELETE /api/admin/customer — cascade + agent-teardown + bedrijfsnaam-bevestiging"`

---

### Task 5: `klant.astro` UI

**Files:**
- Modify: `src/pages/admin/klant.astro`
- Test: `test/admin-klant-page.test.js` (statische assertions op de gerenderde HTML/inline-script)

**Interfaces:**
- Consumes: `PATCH/DELETE /api/admin/service`, `DELETE /api/admin/customer`.

- [ ] **Step 1: Failing test** — de pagina bevat: per dienst een Pauzeren/Hervatten-knop en een Verwijderen-knop die `DELETE /api/admin/service` aanroepen; een klant-verwijder-sectie met een bedrijfsnaam-invoer + een verwijderknop die pas `DELETE /api/admin/customer` aanroept als de tekst matcht.
- [ ] **Step 2: Run, verify fail** → FAIL.
- [ ] **Step 3: Implement** — in de dienstenlijst-render (bestaand inline-script rond de services-map): voeg per dienst toe: een knop `Pauzeren`/`Hervatten` (afhankelijk van `s.status`) → `fetch('/api/admin/service', {method:'PATCH', body: JSON.stringify({id:s.id, status: nieuwe})})`; een knop `Verwijderen` → `confirm('Dienst verwijderen? De AI-agent wordt gestopt.')` → `fetch('/api/admin/service?id='+s.id, {method:'DELETE'})` → herlaad. Onderaan de pagina een sectie "Klant verwijderen" met een `<input id="del-confirm">` + knop die vergelijkt met de geladen `bedrijf` en `fetch('/api/admin/customer?id='+cid, {method:'DELETE', body: JSON.stringify({confirm})})` → bij succes `location.href='/admin/klanten'`. Volg de bestaande `pbtn`/`pbtn--*`-CSS en de bestaande fetch/`credentials:'same-origin'`-stijl.
- [ ] **Step 4: Run** — `npx vitest run test/admin-klant-page.test.js` + `npm run build` (statische build mag niet breken) → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat: admin klant.astro — dienst pauzeren/verwijderen + klant verwijderen"`

---

### Task 6: Integratie — suite groen, build, deploy, verify

- [ ] **Step 1** — `npm test` volledig groen.
- [ ] **Step 2** — `npm run build` slaagt.
- [ ] **Step 3** — Whole-branch review (code-reviewer) op de destructieve paden (delete-scoping, teardown-best-effort, bevestiging).
- [ ] **Step 4 (M-actie of agent)** — `npm run build && npx wrangler deploy`.
- [ ] **Step 5** — `deploy-verify`-achtige smoke: `/admin` laadt; `DELETE /api/admin/customer` zonder sessie → 401/403.
- [ ] **Step 6** — push branch.

---

## Self-Review (uitgevoerd)

- **Spec-dekking:** §3.1 → T1; §3.2 → T2; §3.3 → T3; §3.4 → T4; §3.5 → T5; §5 testen → per taak; §6 deploy → T6. Alles gedekt.
- **Placeholders:** de cascade-kolomnamen (T4) zijn expliciet gemarkeerd als "verifiëren tegen de DB vóór implementatie" i.p.v. blind aangenomen — de rest bevat concrete queries/code.
- **Type-consistentie:** `teardownProvisioning(env, provisioning)` en `deleteAgent(apiKey, agentId)` consistent tussen T1/T2/T3/T4. Endpoints + methoden consistent met de dispatch-uitbreidingen.
- **Volgorde:** helper (T1) vóór de consumenten (T2/T3/T4) vóór de UI (T5) vóór integratie (T6).
