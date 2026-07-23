# Plak B + C — Provisioner-registry, self-service onboarding, agenda-koppeling & nudges

**Datum:** 2026-07-23
**Status:** goedgekeurd (owner), klaar voor implementatieplan
**Voortbouwend op:** `docs/superpowers/specs/2026-07-22-selfserve-funnel-design.md` (§4, §5, §9)
**Doel:** de laatste zero-touch-lacune dichten. Ná betaling richt de agent zichzelf in en zet
de klant zijn eigen diepe intake + koppelingen; geen mens meer nodig om een order `actief` te
krijgen. Wie de onboarding laat liggen, krijgt automatische herinneringen.

## 1. Probleem (bewezen in de live e2e van 2026-07-23)

`activation.js` provisioned de ElevenLabs-agent automatisch, maar een funnel-order
(`voorstel_id` gezet) blijft daarna op `wacht_op_klant` staan en `alertStaff()` pingt een mens
die de diepe intake (openingstijden, doorschakelnummers, FAQ) handmatig afrondt en de order in
`/admin/aanvragen` op `actief` zet. Dat is de bewuste interim-toestand tot deze plak: de diepe
intake bestaat als schema (`src/data/intake-schemas.ts`) en renderer (`src/pages/portal/intake.astro`),
maar niets leidt de betalende klant erheen en niets triggert een her-provisioning wanneer hij
klaar is.

## 2. Scope (owner-besluit)

- **Volledige Plak B+C registry-refactor** — niet de minimale variant.
- **Nudge-systeem** met eigen tabel + cron.
- **Producten:** `emma-telefoon` én `emma`.
- **Agenda-koppeling inbegrepen** — de klant koppelt zijn **eigen** Google-agenda (per-tenant OAuth).
- Buiten scope: `agenda-assistant`/`ai-scan-consult` als sellable (blijft zoals vandaag);
  Outlook-agenda (alleen Google in deze plak); WhatsApp-provisioner (§8, voorwaardelijk — apart).

## 3. Architectuur — units en grenzen

### 3.1 Provisioner-registry (Plak B)

| Bestand | Verantwoordelijkheid |
|---|---|
| `src/lib/provisioners/index.js` | `resolve(productKey) → provisioner\|null`; `canProvision(productKey) → bool`. Enige plek die product_key op een provisioner mapt. |
| `src/lib/provisioners/voice.js` | Huidige `elevenlabs.js`-logica achter de interface. Dekt `emma-telefoon` **en** `emma`. |

**Interface (elke provisioner exporteert):**

```js
export const productKeys = ['emma-telefoon', 'emma'];
export function canProvision(productKey) {}         // productKeys.includes(productKey)
export function missingForLive(intake) {}           // string[]; [] = niets meer nodig
export async function provision(env, { service, order, intake, customerId })
  // → { status: 'klaar' | 'wacht_op_klant' | 'fout', wachtOp?: string[], error?: string }
```

`missingForLive(intake)` is de bron van waarheid voor "is deze dienst live-klaar":
- Verplichte intake-velden uit het schema die leeg zijn (`openingstijden`, `buiten_tijden`,
  `taken`, `toon` voor emma-telefoon; `faq`, `talen`, `handover` voor emma).
- **Agenda-conditie:** als `intake.agenda === 'Google Agenda'` én er is geen gekoppelde
  agenda-token voor deze klant, dan zit `'agenda_koppeling'` in de lijst. Kiest de klant
  "Geen / weet ik nog niet", dan telt agenda niet mee.

`provision()` roept `missingForLive()` eerst aan: is die niet leeg → `{status:'wacht_op_klant',
wachtOp:[...]}` zonder een externe call. Pas als niets ontbreekt bouwt het de ElevenLabs-agent
(bestaande `buildConfig`/`createAgent`) en, indien nodig, verifieert het de agenda-koppeling.

`activation.js` verandert: `canProvision(order.product_key)` en de provisioning-call gaan via
`resolve()` i.p.v. de directe `elevenlabs.js`-import. **Bestaande garanties blijven:** precies
één service per order (unieke index 0008), een geslaagde provisioning wordt nooit herhaald
(`needsProvisioning()`), een geannuleerde order provisioned nooit.

### 3.2 Provisioning-state machine (§5 van het basisspec, nu geïmplementeerd)

| Uitkomst | `services.status` | `service_orders.status` | Alert |
|---|---|---|---|
| `klaar` | `actief` | `actief` | nee |
| `wacht_op_klant` | `onboarding` | `in_uitvoering` | nee — klant ziet de openstaande stap in het portaal |
| `fout` | ongewijzigd | `in_uitvoering` | **alleen bij de 3e poging** (`provisioning_json.attempts >= 3`) |

- `provisioning_json` krijgt een veld `attempts` (int, opgehoogd per `fout`-run).
- `needsProvisioning()` beschouwt `wacht_op_klant` **niet** als geslaagd → die order belandt
  nooit op `actief` zonder complete intake.
- De interim `alertStaff()` in `wachtOpKlant()` (activation.js, "TIJDELIJK"-blok) **vervalt** —
  vervangen door de klant-facing onboarding + nudge-cron. De fires-once-guard-UPDATE blijft
  (state-overgang naar `in_uitvoering`), alleen de alert eronder gaat weg.

### 3.3 Onboarding (Plak C)

| Bestand | Verantwoordelijkheid |
|---|---|
| `src/lib/onboarding.js` | `onboardingState(env, order) → { productKey, missing: string[], progressPct, stappen }`. Leunt op `provisioner.missingForLive()` + het intake-schema. Pure/afgeleide logica, geen writes. |
| `src/pages/portal/onboarding.astro` | Post-pay wizard. Hergebruikt de veld-renderer van `intake.astro` + het bestaande `EMMA_TELEFOON`/`EMMA`-schema. Toont voortgang %, openstaande stappen, en de agenda-koppelknop. |
| API `GET /api/portal/onboarding?order=<id>` | Geeft `onboardingState` terug, PII-veilig, gescoped op sessie-`customer_id`. |
| API `POST /api/portal/onboarding` | Body: `{ order_id, answers }`. Valideert + merge't answers in `service_orders.intake_json`, roept dan `activateOrder()` opnieuw aan (de her-provision-trigger). Antwoord: nieuwe `onboardingState` (of `{ actief:true }`). |

**Her-provision-trigger:** elke geslaagde `POST /api/portal/onboarding` eindigt met een
`activateOrder(env, order)`-aanroep. Zodra `missingForLive()` leeg is bouwt de provisioner de
agent en gaat de order naar `actief` — precies de trigger die vandaag ontbreekt. Idempotent: een
al-actieve service wordt nooit opnieuw gebouwd (bestaande `needsProvisioning`-guard).

**Confirmation-mail (`mollie.js`, `sendOrderConfirmationMail`):** de zin "u hoeft zelf niets te
doen" is alleen waar zolang een mens de order afrondt. Die wordt: *"Rond de laatste stap af in
uw klantportaal — vul de gegevens in waarmee Emma uw telefoon aanneemt."* met een link naar
`/portal/onboarding?order=<id>`. (Het basisspec §5 eist dat deze twee wijzigingen in dezelfde
change zitten.)

### 3.4 Agenda-koppeling — per-tenant Google OAuth (nieuw)

**Kernprobleem:** de huidige Google-OAuth (`src/lib/google-auth.js`) is **single-tenant** —
admin-tokens onder KV-key `oauth:google:admin`. Een klant die zijn eigen agenda koppelt heeft
eigen tokens nodig. Uitbreiding:

- **Opslag:** `GOOGLE_TOKENS` KV, key `oauth:google:cust:<customer_id>` (`{access, refresh,
  expiry}`). De bestaande `google-auth.js` refresh-helper wordt geparametriseerd op KV-key
  i.p.v. de hardcoded `oauth:google:admin`; het admin-pad geeft die key expliciet mee, zodat
  bestaand gedrag niet verandert.
- **Flow:** `GET /api/portal/onboarding/agenda/initiate?order=<id>` → sessie-gescoped, bouwt de
  Google-consent-URL met een **state-parameter = HMAC(customer_id + order_id)** (CSRF + binding).
  Callback `GET /api/portal/onboarding/agenda/callback` verifieert de state-HMAC, wisselt de code
  in, slaat tokens op onder de klant-key, redirect terug naar `/portal/onboarding`.
- **Scope:** alleen `https://www.googleapis.com/auth/calendar.events` (minimale agenda-scope).
- **Live-conditie:** `missingForLive` ziet `agenda_koppeling` als vervuld zodra er een geldige
  token onder de klant-key staat. De voice-provisioner zet die agenda-context in de agent-config
  (afspraken inplannen) — implementatiedetail van `voice.js`, buiten de OAuth-plumbing.
- **Veiligheid:** state-HMAC met `PORTAL_SESSION_SECRET`; callback controleert dat de ingelogde
  sessie-`customer_id` overeenkomt met de state; tokens nooit naar de client; refresh server-side.

### 3.5 Nudge-systeem

- **Migratie `0017_onboarding.sql`:** tabel `onboarding_nudges`
  `(order_id TEXT PRIMARY KEY REFERENCES service_orders(id), customer_id TEXT NOT NULL,
    aantal INTEGER NOT NULL DEFAULT 0, laatst_genudged INTEGER, created_at INTEGER NOT NULL)`.
  Eén rij per onboarding-order; `aantal` telt verstuurde herinneringen.
- **Nudge-cron:** meelift op de bestaande `*/15`-`scheduled()` in `src/worker.js` (zelfde tick
  als `reconcilePayments`/`billMonthlySubscriptions`, best-effort, mag die nooit meeslepen bij
  een fout). Selecteert orders met `service_orders.status='in_uitvoering'` + een service op
  `status='onboarding'` (dus `wacht_op_klant`, geen `fout`) die:
  - ouder zijn dan **24 u** sinds de vorige nudge (of sinds order-creatie voor de eerste), en
  - `aantal < 3` (max 3 herinneringen).
  Verstuurt een klant-mail (Brevo, `sendMail`) met de onboarding-link, hoogt `aantal` op, zet
  `laatst_genudged`. Na 3 nudges zonder afronding: **één** `alertStaff()` ("klant rondt onboarding
  niet af") en stop met nudgen — de enige resterende mens-in-de-loop, en pas ná 3 dagen stilte.
- **Idempotentie:** de selectie-query + de `laatst_genudged`-update zijn de guard; een
  cron-double-fire binnen hetzelfde 15-min-venster stuurt niet twee mails (24u-drempel).

## 4. Data-flow (na betaling)

```
betaald → webhook → activateOrder()
   → resolve(product_key) → voice.provision()
        missingForLive != []  → services.status='onboarding', order='in_uitvoering'  (wacht_op_klant)
   → confirmation-mail: "rond af in portaal" + link /portal/onboarding
   → klant opent /portal/onboarding → vult diepe intake, koppelt (optioneel) Google-agenda
        elke POST → merge intake → activateOrder() opnieuw
   → missingForLive == []  → voice.provision() bouwt agent → services='actief', order='actief'
   → (klant inactief) nudge-cron: max 3 herinneringsmails à 24u, daarna 1 staff-alert
```

## 5. Foutafhandeling

- **Provision `fout`:** `provisioning_json.attempts++`; order blijft `in_uitvoering`; retry-cron
  (`*/15`) pakt `fout` + `attempts<3` op; alert pas bij de 3e. (Bestaande `park()`-tekst voor
  echte storingen blijft voor niet-funnel-orders.)
- **Agenda-OAuth mislukt / geweigerd:** onboarding blijft openstaan met `agenda_koppeling` in
  `missing`; de klant kan het opnieuw proberen of "Geen agenda" kiezen (dan valt de conditie weg).
  Nooit de hele order blokkeren op een optionele koppeling.
- **LLM/agent-bouw faalt:** valt onder `fout` → retry-pad. De agent-config bevat nooit
  prijs/cijfers uit een LLM (bestaand hard principe).
- **IDOR (C3):** elke onboarding-/agenda-endpoint scopet op sessie-`customer_id`; onbekende of
  vreemde `order_id` geeft hetzelfde "niet beschikbaar"-scherm, nooit andermans data.

## 6. Testen (TDD, vitest — zelfde stubstijl als bestaande `test/`)

- `provisioners/index`: `resolve` mapt emma-telefoon/emma → voice; onbekend → null.
- `voice.missingForLive`: lege verplichte velden → in lijst; compleet → []; agenda-conditie
  (Google gekozen zonder token → `agenda_koppeling`; "Geen" → niet).
- `voice.provision`: missing != [] → `wacht_op_klant` zonder externe call; compleet → agent-bouw
  (gemockte ElevenLabs) → `klaar`.
- `activation` state machine: `klaar`→actief; `wacht_op_klant`→onboarding/in_uitvoering, **geen
  alert**; `fout`→attempts++, alert pas bij 3; geannuleerde order provisioned nooit; geslaagde
  provisioning wordt nooit herhaald.
- `onboarding.onboardingState`: progress% + missing correct afgeleid.
- `POST /api/portal/onboarding`: merge't answers, roept activateOrder aan, gaat naar actief zodra
  compleet; IDOR — vreemde order_id geweigerd.
- Agenda-OAuth: state-HMAC rond-trip; callback met verkeerde sessie geweigerd; token onder
  klant-key opgeslagen; `google-auth.js` refresh werkt met geparametriseerde key (admin-pad
  ongewijzigd — regressietest).
- Nudge-cron: selecteert alleen onboarding-orders >24u & aantal<3; hoogt aantal op; 3e nudge →
  staff-alert + stop; double-fire binnen venster stuurt niet twee mails.
- `sendOrderConfirmationMail`: bevat de nieuwe "rond af in portaal"-tekst + onboarding-link, niet
  meer "u hoeft zelf niets te doen".

## 7. Migraties & deploy

- `migrations/0017_onboarding.sql` — `onboarding_nudges` (+ evt. `provisioning_json.attempts` is
  JSON, geen migratie nodig). Eénmalig, idempotent (`CREATE TABLE IF NOT EXISTS`); volgt de
  0015-procedure (M-goedkeuring vóór `--remote` execute).
- Google-OAuth: bevestig dat de bestaande `GOOGLE_CLIENT_ID`/`SECRET` een redirect-URI voor
  `/api/portal/onboarding/agenda/callback` toestaan (Google Cloud console — M-actie) vóór live.
- Deploy volgt de vaste flow: `npm test` groen → `npm run build` → `wrangler deploy` →
  `deploy-verify` PASS. Elke stap door M (classifier blokkeert prod-writes in de agent-shell).

## 8. Volgorde van bouwen (samenvatting voor het plan)

1. Provisioner-registry + `voice.js` (verplaatst elevenlabs-logica) + `activation.js` op registry.
2. State machine: `attempts`, retry-cron-tak, `wachtOpKlant` zonder alert.
3. `onboarding.js` + API GET/POST + her-provision-trigger.
4. `onboarding.astro` (renderer-hergebruik) + confirmation-mail-tekst.
5. Per-tenant Google-OAuth (geparametriseerde `google-auth.js`, initiate/callback, agenda-conditie).
6. Migratie 0017 + nudge-cron.
7. Volledige testsuite groen, build, deploy, deploy-verify, live e2e.
