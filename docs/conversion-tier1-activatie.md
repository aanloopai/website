# Tier 1 — Conversie-infrastructuur: handmatige activatie

Code is live. Onderstaande stappen vereisen externe dashboards / ID's (kunnen niet via code).

## 1. Meta Pixel + LinkedIn Insight Tag
**Code:** `src/layouts/BaseLayout.astro` (consent-gated, lazy-loaded). Nu placeholder → skip.
- Meta Pixel ID: business.facebook.com → Events Manager → kopieer Pixel ID.
- LinkedIn Partner ID: linkedin.com/campaignmanager → Account Assets → Insight Tag → Partner ID.
- Vervang in BaseLayout.astro: `'META_PIXEL_ID'` en `'LI_PARTNER_ID'` door de echte ID's. Push.
- Conversies (`generate_lead`, `book_demo`, `purchase`) vuren automatisch via de `_track`-wrapper → Meta `Lead`/`Purchase` + LinkedIn `track`.

## 2. Brevo nurture-drip (3 mails na gratis AI-scan)
**Code:** `src/worker.js` zet bij elke lead `NURTURE`-attribuut + voegt toe aan `BREVO_NURTURE_LIST_ID` (bij marketing-consent).
- Maak in Brevo een lijst "Nurture — leads"; zet het lijst-ID als Worker-secret/var: `BREVO_NURTURE_LIST_ID`.
- Bouw een Brevo **Automation** (trigger: contact toegevoegd aan die lijst):
  - **Dag 0** — "Uw AI-scan score + 3 quick-wins" (verwijs naar resultaat + tarieven).
  - **Dag 3** — "Wat levert AI uw [sector] op?" (ROI-calculator + sector-case link).
  - **Dag 7** — "Klaar voor een gratis demo?" (demo-aanvragen CTA).
- Optioneel later: demo-reminder + no-show + abandoned-form (vereist vroege e-mail-capture).

## 3. GrowthBook A/B (7 experimenten al gecodeerd)
**Code:** `src/lib/ab-experiments.ts` + `src/lib/growthbook.ts` (self-hosted gb.aanloopai.nl).
- Dashboard → zet de 7 experimenten op **"running"**, definieer traffic-split (bv. 50/50 of 33/33/33).
- Controleer in GA4 dat `experiment_viewed` events binnenkomen.

## Verificatie
- GA4 DebugView: formulier → `generate_lead`, demo-boeking → `book_demo`, betaling → `purchase`, exit-modal → `exit_intent_shown`.
- Meta Events Manager / LinkedIn: PageView + Lead na consent (zodra ID's ingevuld).
- Exit-intent: muis naar boven uit viewport óf 30s → modal 1×; `localStorage.aanloop_exit_shown`.
