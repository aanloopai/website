# Self-serve funnel — ontwerp (2026-07-22, rev. 2)

Doel: een bezoeker van aanloopai.nl wordt een betalende, **live** klant zonder dat de
eigenaar ooit belt, mailt of klikt. Menselijke tussenkomst bestaat alleen nog als
storings-escalatie, niet als processtap.

Rev. 2 verwerkt een adversariële review tegen de werkelijke code (2026-07-22). Elke
correctie staat met bestand:regel-bewijs in §11.

---

## 1. Wat er al staat (niet opnieuw bouwen)

| Onderdeel | Bestand | Wat het doet |
|---|---|---|
| Pre-sale wizard | `src/pages/start.astro` | dienstkeuze + dienst-specifieke vragen → `POST /api/intake` |
| Intake-opslag | `migrations/0014_intake_requests.sql`, `handleIntake` (`src/worker.js:335`) | durable record van anonieme intake |
| Portal | `src/pages/portal/*` | login/verify (magic link), diensten, checkout, facturatie, support |
| Diepe intake per product | `src/data/intake-schemas.ts` + `src/pages/portal/intake.astro` | generieke renderer van productvragenlijsten |
| Betaling | `src/lib/mollie.js` | Mollie checkout (`handleCheckoutStart:122`), webhook `onPaid:280`, maandcron `billMonthlySubscriptions:407` |
| Activatie | `src/lib/activation.js` | order → service, idempotent, ElevenLabs-provisioning |
| Catalogus + prijzen | `src/data/portal-catalog.ts`, `src/data/pricing.ts` | single source voor prijs en Mollie-centen |
| CRM | `src/lib/crm.js`, `/admin/*` | deals, pipeline, activiteiten |

Belangrijke nuances die het ontwerp raken:

- `canProvision` dekt **twee** product-keys: `'emma-telefoon'` én `'emma'` (`src/lib/elevenlabs.js:148`).
- `services.status` wordt bij activatie op `'onboarding'` gezet en daarna **nooit automatisch**
  gepromoveerd (`activation.js:66`); alleen `service_orders.status` gaat naar `'actief'`.
  Vandaag zet uitsluitend een admin-klik de service zelf op actief (`admin-routes.js:274`).
- Er is **geen** automatische retry na mislukte provisioning. `reconcilePayments` slaat een
  reeds-betaalde payment over (`mollie.js:487`), dus `activateOrder` draait niet opnieuw.
  De enige retry is een mens in `/admin/aanvragen`.
- `park()` alarmeert bij de **eerste** fout (`activation.js:145`); er is geen pogingteller.
- De site bouwt statisch (`astro.config.mjs:10`). Dynamische `[id]`-routes zonder
  `getStaticPaths` breken de build. Bestaand patroon: query-param + client-fetch.
- Maandbetaling is géén automatische incasso maar een **betaallink per e-mail**
  (`mollie.js:407-473`); dunning eindigt in een mail naar `hello@` (`mollie.js:368`).
  Zie §10 — dit is de enige menselijke rest die dit ontwerp niet opheft.

## 2. De drie knippen

1. **Na de wizard stopt de verkoop.** `/start` eindigt op "we nemen contact op"
   (`start.astro:216`). Geen prijs, geen overtuiging, geen account, geen checkout.
2. **Na betaling stopt de levering.** Alleen ElevenLabs richt zichzelf in; elk ander product
   valt in `park()` → `alertStaff()` → een mens.
3. **De diepe intake hangt los.** `portal/intake.astro` bestaat, maar niets leidt de klant er
   na betaling naartoe en niets vertaalt de antwoorden naar een live systeem.

## 3. Doelstroom

```
/start  ① dienstkeuze → ② dienst-specifieke vragen (bestaand, uitgebreid met ROI-inputs)
   │  POST /api/intake   → response bevat nu een voorstel-token (contract WIJZIGT, zie §11-A4)
   ▼
③ VOORSTEL — /start/voorstel/?t=<token>   (statische pagina + client-fetch)
      gepersonaliseerd: ROI, pakketadvies, maandprijs én setup-fee, garanties,
      bezwaar-FAQ, AI Act-disclosure
   │  "Ja, ik start"  → POST /api/voorstel/claim  → alleen een magic link per e-mail
   ▼                    (er wordt NOG NIETS aangemaakt — zie §7 C1)
④ VERIFICATIE — klant klikt de link → sessie ontstaat → pas dán customer + user + order
      → redirect direct naar de checkout van die order
   ▼
⑤ CHECKOUT — bestaande Mollie-flow; eerste betaling = maand + setup (§6)
   │  betaald → webhook → activateOrder()
   ▼
⑥ ONBOARDING — /portal/onboarding: diepe intake (bestaande schema's) + de klant koppelt
      zélf zijn accounts (Google OAuth). Elke voltooide stap triggert provision() opnieuw.
   ▼
⑦ LIVE — provisioner meldt klaar → service_orders én services gaan naar 'actief'
```

### Hard principe: prijs en cijfers komen nooit uit het taalmodel

- **Prijs** uit `pricing.ts` / `portal-catalog.ts`. **ROI** uit een pure functie in `voorstel.js`.
- De LLM levert alleen framing rond die vaste getallen en krijgt ze als input mee.
  Faalt of timeout de LLM → statische fallback-copy; de funnel valt nooit om.
- Merkregels blijven: Emma als persona, verplichte AI-disclosure (EU AI Act art. 50),
  KvK 88606902, oprichter Mustafa, geen klantaantallen claimen.

### service_id ↔ product_key mapping

`/start` kent `agenda-assistant | voice-agent | whatsapp-bot | ai-scan-consult`; de catalogus
kent `emma-telefoon` e.a. Er is vandaag geen koppeling. Eén expliciete tabel in
`src/data/funnel-map.ts`:

```ts
{ serviceId, productKey, tierNaam, sellable, roiInputs, fallbackCopy }
```

`tierNaam` moet exact de catalogusnaam zijn — de €497-tier heet `'Starter'`, niet `'Emma'`
(`portal-catalog.ts:43`); die string zit in D1 (`service_orders.tier`) en mag niet afwijken.

### Wat is in plak A verkoopbaar

`sellable: true` geldt **alleen** voor wat vandaag aantoonbaar zichzelf inricht:
`emma-telefoon` en `emma`. `agenda-assistant` wordt in plak B verkoopbaar, samen met zijn
inrichting. Nooit verkopen wat handmatig geleverd moet worden — dat is precies de val die
dit project opheft.

**`ai-scan-consult` blijft niet-sellable** en gedraagt zich als vandaag (lead + intake).
De wizard verkoopt daar een persoonlijk adviesgesprek inclusief voorkeursdatum
(`start.astro:308`); dat automatisch leveren betekent er een AI-rapportproduct van maken —
een product- en prijsbeslissing van de eigenaar, geen implementatiedetail. Zolang die
beslissing niet is genomen, blijft dit product buiten de funnel.

**`whatsapp-bot`**: zie §8.

## 4. Componenten

| Bestand | Verantwoordelijkheid | Plak |
|---|---|---|
| `src/data/funnel-map.ts` | wizard-dienst → product_key + tiernaam + sellable + ROI-inputs + fallback-copy | A |
| `src/pages/start.astro` (wijziging) | ROI-vragen toevoegen; slotscherm "we nemen contact op" vervangen door doorstroom naar voorstel; consent-tekst uitbreiden (§7 C4) | A |
| `src/lib/voorstel.js` | ROI (pure functie) + pakketkeuze + LLM-framing + statische fallback; schrijft `voorstellen` | A |
| `src/pages/start/voorstel/index.astro` | statische pagina, leest `?t=` en fetcht `/api/voorstel/get` | A |
| `src/lib/signup.js` | claim → magic link; ná verify: customer + user + order minten, idempotent op voorstel-token | A |
| `src/lib/provisioners/index.js` | registry `resolve(order, intake)` → provisioner of `null` | B |
| `src/lib/provisioners/voice.js` | huidige ElevenLabs-logica achter de interface; dekt `emma-telefoon` **en** `emma` | B |
| `src/lib/provisioners/agenda.js` | Google OAuth-koppeling + agenda/slot-regels (als onderdeel van emma-telefoon, geen losse key — zie §5) | B |
| `src/lib/onboarding.js` | per product: welke velden/koppelingen ontbreken → voortgang in % | C |
| `src/pages/portal/onboarding.astro` | post-pay wizard; hergebruikt de renderer van `intake.astro` | C |
| `src/lib/provisioners/whatsapp.js` | Meta Embedded Signup afronden | C, voorwaardelijk (§8) |

Provisioner-interface:

```js
export const productKeys = ['emma-telefoon', 'emma'];
export function canProvision(productKey) {}
export async function provision(env, { service, order, intake })
  // → { status: 'klaar' | 'wacht_op_klant' | 'fout', wachtOp?: string[], error?: string }
export function missingForLive(intake) {}   // [] = niets meer nodig
```

`activation.js` verandert van "if ElevenLabs" naar een registry-lookup. De bestaande
garanties blijven ongewijzigd: precies één service per order (unieke index uit 0008),
een geslaagde provisioning wordt nooit herhaald, een geannuleerde order provisioned nooit.

## 5. Provisioning-state machine (uitgebreid)

Het huidige model kent maar twee uitkomsten — geslaagd, of fout → `park()` → alert. Dat werkt
niet voor diensten waarbij de klant ná betaling nog iets moet koppelen: elke zulke order zou
een mens pingen. Daarom een derde uitkomst:

| Uitkomst | `services.status` | `service_orders.status` | Alert |
|---|---|---|---|
| `klaar` | `actief` | `actief` | nee |
| `wacht_op_klant` | `onboarding` | `in_uitvoering` | **nee** — klant ziet de openstaande stap in het portaal |
| `fout` | ongewijzigd | `in_uitvoering` | pas bij de 3e poging (teller in `provisioning_json.attempts`) |

Aanvullende regels:

- `needsProvisioning()` beschouwt `wacht_op_klant` **niet** als geslaagd; die order mag nooit
  op 'actief' belanden.
- Elke voltooide onboarding-stap roept `provision()` opnieuw aan. Dat is de trigger die
  vandaag volledig ontbreekt.
- Een retry-cron (bestaande 15-minuten-cron) pakt rijen met `status='fout'` en
  `attempts < 3` op. Vandaag bestaat die retry niet — "bestaande retry" was een onjuiste
  aanname in rev. 1.
- Promotie van `services.status` naar `'actief'` gebeurt uitsluitend hier, niet meer
  alleen via de admin-klik. De admin-klik blijft als override bestaan.
- Registry-resolutie gaat op **(product_key + wizard-dienst uit `intake_json`)**, niet op
  product_key alleen: agenda-assistant mapt naar dezelfde `emma-telefoon`-key en zou anders
  botsen met de voice-provisioner. Agenda-inrichting is een stap ín de emma-provisioner,
  geen concurrerende registry-entry.

## 6. Setup-fee in de checkout

`pricing.ts` (eigenaar bevestigd 2026-07-14) kent €495 setup bij Emma en €795 bij Groei, maar
de checkout rekent vandaag uitsluitend `tier.prijsCent * 1.21` (`mollie.js:158`) en
`CatalogTier` heeft niet eens een setup-veld. Zonder werk hier belooft de funnel iets dat de
code niet doet. In plak A:

- `CatalogTier` krijgt `setupCent: number` (0 waar geen fee geldt).
- **Eerste** betaling = (maandbedrag + setup) incl. btw.
- `subscriptions.bedrag_cent` blijft **maand-only**. Dit is de landmijn: zet je het totaal in
  dat veld, dan factureert `billMonthlySubscriptions` (`mollie.js:434,452`) de setup-fee
  iedere maand opnieuw.
- De factuur krijgt twee regels (setup / maand), zodat de btw-uitsplitsing in `createInvoice`
  (`mollie.js:341`) blijft kloppen.
- Het voorstel toont maandbedrag én setup expliciet naast elkaar. Een fee die pas op de
  betaalpagina opduikt, breekt het vertrouwen op het duurste moment.

## 7. Beveiliging

**C1 — volgorde van aanmaken (hoog).** Er wordt **niets** aan een account gekoppeld vóór
e-mailverificatie. "Ja, ik start" stuurt uitsluitend een magic link met een voorstel-referentie.
Customer, user en order worden pas gemint in de post-verify-stap, binnen de geverifieerde
sessie. Zonder deze volgorde kan een anonieme bezoeker met andermans adres een account en
order aanmaken, een order in de tenant van een bestaande klant injecteren, en de flow als
magic-link-phishing gebruiken.

**C2 — voorstel-token.** Publieke capability-URL, dus `randomToken()` (256 bit, `auth.js:24`),
niet `randomId()` (48 bit, `auth.js:29`). Server-side `expires_at` (14 dagen), `noindex`, geen
PII op de pagina (bedrijfsnaam en ROI mogen; e-mail en telefoon nooit). Een ongeldig of
verlopen token levert één generiek scherm — het onthult niet of het token ooit bestond. Bij
verlopen: "opnieuw berekenen", zodat een oude link nooit een verouderd tarief afdwingt.

**C3 — IDOR.** Elke nieuwe portal-/onboarding-query volgt het bestaande patroon
`WHERE id = ? AND customer_id = ?` (zoals `mollie.js:122`). Expliciete eis, geen aanname.

**C4 — AVG.** De huidige consent-tekst (`start.astro:173`) dekt "aanvraag verwerken en contact
opnemen". LLM-verwerking van de antwoorden en automatische accountcreatie vallen daar niet
vanzelf onder: consent-tekst én privacybeleid worden in plak A aangepast. Onboarding-nudges
aan een betalende klant vallen onder de overeenkomst — geen dubbele opt-in nodig.

**C5 — misbruik/kosten.** `/api/voorstel/claim` en "opnieuw berekenen" krijgen hetzelfde
`rateLimit`-patroon als `/api/intake` (`worker.js:340`), plus een dagcap op LLM-calls met de
statische fallback als overloop. Het claim-endpoint verstuurt e-mail en is daarmee ook een
spamvector.

**Opslaggrens.** `handleIntake` kapt `answers_json` af op 8000 tekens ná `JSON.stringify`
(`worker.js:382`), wat midden in een string kan snijden en onparseerbare JSON oplevert —
precies wanneer ROI-vragen de payload groter maken. Plak A vervangt dit door valideren en
weigeren vóór opslag.

## 8. Externe afhankelijkheid — WhatsApp

Volledig zelfbediende WhatsApp vereist Meta Embedded Signup, en dat vereist Tech Provider /
BSP-status bij Meta. Die status is niet te automatiseren en ligt buiten deze codebase.

- Mét status: `whatsapp.js` maakt de flow af, klant koppelt zelf, nul contact.
- Zonder status: `whatsapp-bot` staat op `sellable: false` en toont "binnenkort".

Dit is een vlag in `funnel-map.ts`, geen codewijziging.

## 9. Levering in drie plakken

Eén spec, drie deploys. Alles tegelijk live zetten raakt auth, betaling én provisioning
in één rollback-oppervlak.

**Plak A — koopweg.** `funnel-map.ts`, `voorstel.js`, voorstelpagina, `signup.js`,
setup-fee in checkout, `/api/intake`-responscontract, start.astro-slotscherm, consent-tekst,
intake-lengtevalidatie. Migratie `0015_voorstellen.sql`: tabel `voorstellen` +
`ALTER TABLE service_orders ADD COLUMN voorstel_id TEXT` + unieke index op `voorstel_id`
(dat laatste is de dubbele-order-guard: één voorstel kan hooguit één order worden — de
bestaande guard is per order, niet per klant+product, `mollie.js:132`). Vóór checkout
controleert `signup.js` bovendien op een bestaand actief abonnement voor dezelfde
product_key en toont dan een "u heeft dit al"-scherm.
Sellable: alleen `emma-telefoon` / `emma`.
Resultaat: een bezoeker kan zelfstandig kopen; levering blijft tijdelijk zoals vandaag.

**Plak B — provisioner-registry.** `activation.js` omgebouwd, `voice.js` verplaatst (inclusief
key `'emma'`), `agenda.js` als stap binnen de emma-provisioner, uitkomst `wacht_op_klant`,
attempt-teller, retry-cron. Migratie `0016_provisioning_state.sql` (alleen ALTERs — apart
gehouden omdat `ALTER TABLE ADD COLUMN` niet herdraaibaar is, zie `migrations/0013_f3.sql:5`).
Sellable: `agenda-assistant` erbij.
Resultaat: betaalde orders richten zichzelf in.

**Plak C — onboarding.** `onboarding.js`, `/portal/onboarding`, `onboarding_nudges` +
nudge-cron (migratie `0017_onboarding.sql`), `whatsapp.js` indien §8 het toelaat.
Nudges gaan via de bestaande `sendMail`-helper, **niet** via `outreach.js` — dat is
cold-prospect-machinerie die aan `prospect_id` hangt, niet aan klanten.
Resultaat: de diepe intake voedt de live dienst.

Migratienummering: er bestaan al twee bestanden met prefix `0014`
(`0014_inbound_leads.sql`, `0014_intake_requests.sql`). Nieuwe nummers beginnen daarom bij
0015 en elke plak krijgt exact één migratiebestand.

Elke plak eindigt met een verplichte `deploy-verify`-run. Geen "klaar" zonder PASS.

## 10. Bekende beperking

Maandelijkse verlenging is geen automatische incasso maar een betaallink per e-mail; blijft
die onbetaald, dan eindigt de dunning in een mail naar `hello@` (`mollie.js:368`). Dat is een
menselijke processtap die dit ontwerp niet opheft. Echte SEPA-incasso of Mollie-abonnementen
is een apart traject.

## 11. Correcties t.o.v. rev. 1 (met bewijs)

| # | Rev. 1 beweerde | Werkelijkheid | Bestand:regel |
|---|---|---|---|
| A1 | "Mollie-checkout rekent de setup-fee" | checkout rekent alleen maandbedrag; `CatalogTier` heeft geen setup-veld; risico op maandelijkse herfacturatie | `mollie.js:158`, `portal-catalog.ts:17`, `mollie.js:434` |
| A2 | "bestaande park() + retry" | geen automatische retry; alert al bij eerste fout | `mollie.js:487`, `activation.js:120,145` |
| A3 | "service 'actief' alleen als hij draait — bestaande regel" | `services.status` wordt nooit automatisch gepromoveerd; guard staat op `service_orders` | `activation.js:66,143`, `admin-routes.js:274` |
| A4 | "`/api/intake` contract ongewijzigd" | respons bevat geen id, dus doorstroom naar het voorstel is onmogelijk zonder contractwijziging; `start.astro` ontbrak in de componentenlijst | `worker.js:436`, `start.astro:216` |
| A5 | `start/voorstel/[id].astro` | statische build; dynamische route zonder `getStaticPaths` breekt | `astro.config.mjs:10` |
| A6 | provisioner dekt `emma-telefoon` | dekt óók `'emma'`; weglaten = regressie op betaalde orders | `elevenlabs.js:148` |
| A7 | tier heet "Emma" | catalogusnaam is `'Starter'`, staat zo in D1 | `portal-catalog.ts:43` |
| A8 | 0015 bevat alles / "alleen voorstellen" | tegenstrijdig; `voorstel_id` ontbrak; ALTER is niet herdraaibaar; er zijn al twee 0014's | `migrations/0013_f3.sql:5` |
| B1 | provisioner-interface volstaat | agenda/whatsapp kunnen op webhook-moment niet slagen → derde uitkomst nodig | `activation.js:38,80` |
| B6 | — | dubbele orders per klant waren niet afgedekt | `mollie.js:132` |
| B7 | — | `answers_json` wordt ná stringify afgekapt → onparseerbare JSON | `worker.js:382` |
| B10 | nudges via `outreach.js` | outreach hangt aan `prospect_id`, niet aan klanten | `src/lib/outreach.js` |
| C1 | account bij "Ja, ik start" | account-injectie/phishing-risico; aanmaken pas na verificatie | — |
| C2 | voorstel-id | `randomId()` = 48 bit, te weinig voor publieke URL | `auth.js:24,29` |

## 12. Testen

- **Unit (vitest):** ROI-functie (grenswaarden, ontbrekende input → bereik i.p.v. puntgetal),
  pakketkeuze, `missingForLive()` per product, voorstel-fallback bij LLM-fout, prijs komt
  aantoonbaar uit `pricing.ts`, setup-fee zit in de eerste betaling en **niet** in
  `subscriptions.bedrag_cent`.
- **Idempotentie:** provisioner tweemaal aanroepen levert één service en één externe agent;
  één voorstel-token levert hooguit één order.
- **Beveiliging:** claim met andermans e-mail maakt niets aan vóór verificatie; verlopen en
  onbekend token geven hetzelfde scherm; onboarding-endpoints scopen op `customer_id`.
- **E2E (Playwright):** `/start` → voorstel → magic link → checkout (Mollie-test) →
  onboarding → service actief in portaal én CRM-pipeline.
- **Live:** `deploy-verify` per plak (prod-URL's, verboden termen, prijsconsistentie).

## 13. Buiten scope (YAGNI)

- Gratis proefperiode / trial.
- Live Emma-chat als verkoopkanaal; het voorstel is één gegenereerde pagina, geen gesprek.
- Nieuwe prijspunten of pakketten; de funnel verkoopt de bestaande ladder.
- SEPA-incasso / echte Mollie-abonnementen (§10).
- Herontwerp van CRM of admin-schermen.
- Meertalige funnel; Nederlands, gelijk aan de rest van de site.
