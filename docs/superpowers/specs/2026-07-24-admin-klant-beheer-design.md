# Admin — klant/dienst pauzeren & verwijderen (met ElevenLabs-teardown)

**Datum:** 2026-07-24
**Status:** goedgekeurd (owner), klaar voor implementatieplan
**Doel:** de eigenaar geeft in het admin-panel de controle om klanten en diensten te **pauzeren** (echt stoppen) of te **verwijderen** (met opruiming van de ElevenLabs-agent + kennisbank en alle D1-data). Zelf uitvoerbaar in `/admin`.

## 1. Context (bestaand)

- Admin-API `/api/admin/*` (`src/lib/admin-routes.js`), staff-only (sessie-gate + rolcheck in `handleAdminApi`). `ADMIN_MUTATING` bevat al `DELETE`.
- `updateService` (PATCH) kent al de status `'gepauzeerd'` — maar zet alleen de D1-vlag; de ElevenLabs-agent blijft bestaan.
- `provisioning_json` op een service = `{status:'agent_aangemaakt', agent_id, kb_id, provisioned_at}`.
- ElevenLabs: `elevenlabs.js` heeft `elFetch` (base `https://api.elevenlabs.io/v1`, auth-header `xi-api-key`) en `deleteKbDoc(apiKey, kbDocId)` (DELETE knowledge-base). Er is nog GEEN `deleteAgent`.
- `activateOrder(env, order)` provisioned idempotent (uniek index services.order_id). `cancelSubscription(env, {subscriptionId, customerId})` bestaat in `mollie.js`.
- Telefoon-routing zit NIET in deze codebase — de agent zelf neemt geen calls tot een nummer extern is gekoppeld. "Pauzeren/stoppen" op systeemniveau = statusvlag + agent opruimen.

## 2. Scope (owner-besluit)

- **Pauzeren** = statusvlag `'gepauzeerd'` **én** de ElevenLabs-agent+KB verwijderen (`provisioning_json` leeggemaakt). **Hervatten** (`'actief'`) = re-provisionen via `activateOrder`.
- **Verwijderen** op TWEE niveaus: één **dienst**, of een hele **klant** (cascade).
- **Bevestiging** bij verwijderen: de admin typt de exacte `bedrijfsnaam` (GitHub-stijl) — mismatch → geweigerd.
- ElevenLabs-teardown is **best-effort**: faalt een agent-delete, dan gaat de D1-opruiming tóch door en wordt staff gelogd/gealerteerd (nooit een halve verwijdering blokkeren op een externe API).

## 3. Componenten

| Bestand | Verantwoordelijkheid |
|---|---|
| `src/lib/elevenlabs.js` | `deleteAgent(apiKey, agentId)` (DELETE `/convai/agents/{id}`); `teardownProvisioning(env, provisioningJson)` — delete agent + KB uit een provisioning-object, best-effort, gooit nooit |
| `src/lib/admin-routes.js` | `updateService` uitgebreid (pauze→teardown+leeg, hervat→re-provision); nieuw `deleteService` (`DELETE /api/admin/service`); nieuw `deleteCustomer` (`DELETE /api/admin/customer`) |
| `src/pages/admin/klant.astro` | per dienst Pauzeren/Hervatten + Verwijderen; klant-breed "Klant verwijderen" met bedrijfsnaam-bevestiging |

### 3.1 `deleteAgent` / `teardownProvisioning`

```js
export async function deleteAgent(apiKey, agentId) {}   // DELETE /convai/agents/{agentId}; gooit op non-2xx (behalve 404 = al weg)
export async function teardownProvisioning(env, provisioning) {
  // provisioning = {agent_id, kb_id, ...}. Verwijder agent én KB (deleteKbDoc),
  // elk in eigen try/catch → nooit gooien; log fouten. Geen key → no-op.
}
```

### 3.2 Pauzeren / hervatten (`updateService`)

- `status → 'gepauzeerd'`: `teardownProvisioning(env, safeParseJson(current.provisioning_json))` → `UPDATE services SET status='gepauzeerd', provisioning_json=NULL WHERE id=?`.
- `status → 'actief'` terwijl `provisioning_json` leeg/`fout` is en het een provisionbaar product is: haal de bijbehorende order op en roep `activateOrder(env, order)` aan (re-provision). Anders gewoon de statusvlag zetten (bestaand gedrag voor niet-provisionbare diensten).
- Overige velden (naam/tier/config) ongewijzigd t.o.v. bestaand gedrag.

### 3.3 `deleteService` (`DELETE /api/admin/service?id=<serviceId>`)

1. Service laden (`id, customer_id, order_id, provisioning_json`); 404 als niet gevonden.
2. `teardownProvisioning(env, provisioning_json)` (agent+KB weg).
3. Gekoppelde subscription annuleren (billing stopt): `cancelSubscription(env, {subscriptionId, customerId})` of `UPDATE subscriptions SET status='canceled' WHERE order_id=?`.
4. `UPDATE service_orders SET status='geannuleerd' WHERE id=?` (order uit de actieve telling).
5. `DELETE FROM services WHERE id=?`.
6. `{ok:true, message:'Dienst verwijderd'}`.

### 3.4 `deleteCustomer` (`DELETE /api/admin/customer?id=<customerId>`, body `{confirm}`)

1. Klant laden; 404 als niet gevonden. `confirm !== customer.bedrijf` → 400 "Bevestiging komt niet overeen".
2. Alle services van de klant laden → per service `teardownProvisioning` (alle agents+KB's weg).
3. Cascade DELETE (kind → ouder, FK-veilig), alles gescoped op de klant:
   `invoices` (via de payments van de klant) → `payments` → `voorstel_claims` (via de voorstellen van de klant) → `subscriptions` → `services` → `service_orders` → `voorstellen` → `intake_requests` (die aan die voorstellen hangen) → `magic_links` (via de users van de klant) → `users` → `customers`.
   Elke stap gescoped op `customer_id` of via een sub-select op de klant. Alleen zijn eigen rijen — nooit breder.
4. `{ok:true, message:'Klant verwijderd'}`.

### 3.5 UI (`klant.astro`)

- Per dienst (in de dienstenlijst): knop **Pauzeren** (of **Hervatten** als al gepauzeerd) → `PATCH /api/admin/service {id, status}`; knop **Verwijderen** → bevestig ("Weet u het zeker?") → `DELETE /api/admin/service?id=`.
- Klant-breed onderaan: knop **Klant verwijderen** → opent een klein invulveld "Typ de bedrijfsnaam ter bevestiging" + Verwijder-knop (disabled tot de tekst exact matcht) → `DELETE /api/admin/customer?id=` met `{confirm}`. Na succes → redirect naar `/admin/klanten`.
- Volg de bestaande knop/CSS-stijl in `klant.astro` (`pbtn`, `pbtn--primary`, `pselect`, `pbadge--*`).

## 4. Foutafhandeling / veiligheid

- Alle drie de nieuwe/gewijzigde endpoints draaien achter de bestaande staff-gate van `handleAdminApi` — geen extra auth nodig, maar verifieer dat ze binnen die gate gedispatcht worden.
- ElevenLabs-teardown gooit nooit door naar de D1-opruiming; een mislukte agent-delete → `console.error` + `alertStaff` ("agent handmatig verwijderen: <id>") maar de rest gaat door.
- Verwijderen is onomkeerbaar → de bedrijfsnaam-bevestiging (klant) en een "weet u het zeker" (dienst) zijn de guardrails.
- `DELETE`-scoping strikt op de klant/dienst; nooit een query zonder `WHERE`-scope.
- FK: D1 dwingt FK's niet standaard af, maar we verwijderen kind-vóór-ouder zodat er geen dangling refs ontstaan ook als enforcement later aan gaat.

## 5. Testen (TDD, vitest, D1-stubstijl als `test/admin-*.test.js`/`test/activation-*.test.js`)

- `deleteAgent`: DELETE-call naar het juiste pad; 404 wordt geslikt (al weg); non-2xx-≠404 gooit.
- `teardownProvisioning`: roept agent- én KB-delete aan; een gooiende agent-delete stopt de KB-delete niet en gooit zelf niet.
- `updateService` pauze: teardown aangeroepen + `provisioning_json` → NULL + status gepauzeerd. Hervat: `activateOrder` aangeroepen bij leeg provisioning + provisionbaar product.
- `deleteService`: teardown + subscription canceled + order geannuleerd + service-rij weg; onbekende id → 404.
- `deleteCustomer`: `confirm`-mismatch → 400 (niets verwijderd); match → alle agents ge-teardownd + alle klant-rijen weg (bewijs via de D1-stub welke DELETEs met welke scope draaien); vreemde/onbekende klant → 404.
- Regressie: bestaande `updateService`/admin-tests groen; niet-bypass/echte flow onaangeroerd.

## 6. Deploy

- Geen migratie nodig (alleen code + UI). Deploy volgt de vaste flow (build → wrangler deploy → deploy-verify → push). Werkt op de feature-branch `feat/selfserve-plak-a` (waar ook de test-modus staat); NIET los naar master tot de owner de bundel wil mergen.
