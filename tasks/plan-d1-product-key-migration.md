# Plan — D1 product_key migratie: `marco` → `emma-telefoon`

> Status: VOORSTEL (nog niet uitgevoerd). Checkout-kritisch. Datum: 2026-06-23.
> Eisenhower: **Q2** (belangrijk, niet urgent — cosmetische schuld, geen storing).

## Doel
De laatste `marco`-residue zit in de D1-product_key-keten (catalog-key + bestaande rijen).
Hernoem product_key `marco` (= Emma AI-telefoonassistent / voice) naar **`emma-telefoon`**.
NB: plain `emma` is al in gebruik (Emma AI-chatassistent) — daarom `emma-telefoon`.

## Waarom riskvol
`product_key` staat als DATA in 4 D1-tabellen en stuurt live checkout + provisioning:
- `service_orders.product_key`, `services.product_key`, `subscriptions.product_key`, `service_requests.product_key`
- (legacy v1) `customers.plan` = `marco-lite` (seed 0002 — checken of nog live gebruikt)

Lezers/afhankelijkheden:
- `portal-catalog.ts` → `getCatalogProduct(key)` / `getCatalogTier(key, tier)` (Mollie-prijs)
- `mollie.js` → `getCatalogTier(order.product_key)` bij checkout + kopieert key naar `subscriptions`
- `elevenlabs.js` → `buildConfig(productKey)` (else-tak = voice) + `canProvision('marco'||'emma')`
- `intake-schemas.ts` → `getIntakeSchema(productKey)` (`marco: EMMA_TELEFOON`, fallback GENERIC)
- `aanvragen.astro` → default `?product || 'marco'`
- `admin-routes.js` → toont/insert product_key (services, orders)

Als alleen de catalog-key hernoemd wordt zonder de rijen te migreren →
`getCatalogTier('marco')` = undefined op bestaande orders/subs → checkout/weergave breekt.

## Aanpak: gefaseerd, backward-compatible, reversibel

### Fase 0 — Audit live data (READ-ONLY, eerst)
```
wrangler d1 execute PORTAL_DB --remote --command \
 "SELECT 'service_orders' t, COUNT(*) n FROM service_orders WHERE product_key='marco'
  UNION ALL SELECT 'services', COUNT(*) FROM services WHERE product_key='marco'
  UNION ALL SELECT 'subscriptions', COUNT(*) FROM subscriptions WHERE product_key='marco'
  UNION ALL SELECT 'service_requests', COUNT(*) FROM service_requests WHERE product_key='marco'
  UNION ALL SELECT 'customers.plan', COUNT(*) FROM customers WHERE plan LIKE 'marco%';"
```
→ Weten hoeveel rijen geraakt worden. Als 0 actieve rijen: migratie is triviaal (alleen code).

### Fase 1 — Code: dual-key (accepteer OUD + NIEUW). Deploy. GEEN datawijziging.
Maakt elke lezer tolerant vóór er data verandert (zero-downtime):
- `portal-catalog.ts`: voeg `emma-telefoon` toe als primaire key; behoud `marco` als **alias** in `getCatalogProduct`/`getCatalogTier` (normaliseer `marco`→`emma-telefoon` bij lookup).
- `elevenlabs.js`: `canProvision`: `['marco','emma-telefoon','emma'].includes(k)`; `buildConfig`: voice-tak ook voor `emma-telefoon`.
- `intake-schemas.ts`: voeg `'emma-telefoon': EMMA_TELEFOON` toe, behoud `marco`-mapping.
- Deploy + rooktest: bestaande order/sub met `marco` blijft werken.

### Fase 2 — D1 data-migratie (numbered migration `0009_rename_product_key.sql`)
```sql
UPDATE service_orders    SET product_key='emma-telefoon' WHERE product_key='marco';
UPDATE services          SET product_key='emma-telefoon' WHERE product_key='marco';
UPDATE subscriptions     SET product_key='emma-telefoon' WHERE product_key='marco';
UPDATE service_requests  SET product_key='emma-telefoon' WHERE product_key='marco';
-- optioneel legacy: UPDATE customers SET plan='emma-telefoon-lite' WHERE plan='marco-lite';
```
- Eerst op **lokale/preview D1** (`--local` of preview-db), checkout + provisioning testen.
- Dan `--remote` met backup: `wrangler d1 export PORTAL_DB --remote --output backup-pre-0009.sql` VOORAF.
- Verifieer Fase-0-query nu 0 `marco`-rijen geeft.

### Fase 3 — Code: writers flippen naar nieuwe key
- `aanvragen.astro`: default `'marco'` → `'emma-telefoon'`.
- Catalog primaire key = `emma-telefoon` (alias `marco` blijft nog als vangnet).
- Deploy + rooktest nieuwe aanvraag → order → Mollie → provisioning end-to-end.

### Fase 4 — Cleanup (na vertrouwensvenster, bv. 2 weken)
- Verwijder `marco`-alias uit catalog/elevenlabs/intake.
- Verwijder backward-compat. Grep `marco` = leeg (op git-history na).

## Rollback
- Fase 1/3: revert deploy (git).
- Fase 2: restore `backup-pre-0009.sql`, of inverse UPDATE (`emma-telefoon`→`marco`) — veilig want alias nog actief.

## Test-checklist
- [ ] Bestaande sub: portal toont juiste prijs/tier (Mollie getCatalogTier)
- [ ] Nieuwe aanvraag end-to-end (order→intake→Mollie checkout→subscription)
- [ ] Provisioning (elevenlabs canProvision + buildConfig voice-tak)
- [ ] Admin-panel: orders/services tonen product_key correct
- [ ] `wrangler d1` Fase-0-query = 0 marco-rijen na Fase 2

## Schatting
- Fase 0: 10 min. Fase 1: ~1u (code + deploy + test). Fase 2: ~45 min (backup+migratie+verify).
  Fase 3: ~45 min. Fase 4: 20 min. Totaal ~3u verspreid, met vertrouwensvensters.

## Open vragen (M)
1. Key-naam `emma-telefoon` OK? (alt: `emma-voice`)
2. Is `customers.plan='marco-lite'` (v1) nog live, of dode legacy?
3. Migratie nu doen of parkeren tot na Emerce-prioriteiten? (Q2 — geen storing)
