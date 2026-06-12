# Google Ads — Faz 1 Search Campaign (AanloopAI)

> Doel: directe top-of-page zichtbaarheid op commerciële zoektermen waar aanloopai.nl organisch buiten top-10 staat. Conversie = leadformulier (`generate_lead`, vuurt al via `contact.astro:276`). Datum opgesteld: 2026-06-12.

## Account / setup
- **Campagnetype:** Search (alleen zoeknetwerk; Display/Search Partners UIT bij start).
- **Locatie:** Nederland. **Taal:** Nederlands.
- **Bod-strategie:** Start *Maximaliseer klikken* met max. CPC-limiet €2,50 → na 15-20 conversies overschakelen naar *Maximaliseer conversies* / tCPA.
- **Budget:** €15–25/dag start (1 campagne, 4 advertentiegroepen). Schaal op winnende ad groups.
- **Conversie:** Importeer GA4-conversie `generate_lead` (waarde EUR: contact 50 / demo 200 / offerte 300 — al ingesteld in `contact.astro:275`). Markeer als primaire conversie. Zonder dit stuurt Google blind.

## Advertentiegroepen + keywords (start met *phrase* en *exact*, geen broad)

### AG1 — AI bureau / agency (high intent, generiek)
`"ai bureau mkb"` · `"ai bureau nederland"` · `[ai agency nederland]` · `"ai automatisering mkb"` · `"ai bureau rotterdam"` · `"ai oplossingen bedrijf"`
→ Landing: `/diensten/`

### AG2 — AI-receptionist / telefoon (sterkste concrete offer)
`"ai receptionist"` · `"ai telefoniste"` · `"telefoon laten aannemen"` · `"virtuele receptioniste"` · `"ai voice agent nederlands"` · `"telefonische bereikbaarheid uitbesteden"`
→ Landing: `/demo-aanvragen/` (of dedicated AI-receptionist dienstpagina indien aanwezig)

### AG3 — WhatsApp / chatbot klantenservice
`"ai chatbot nederlands"` · `"whatsapp chatbot bedrijf"` · `"ai klantenservice automatiseren"` · `"chatbot voor mkb"` · `"klantvragen automatiseren"`
→ Landing: `/demo-aanvragen/`

### AG4 — Workflow / procesautomatisering
`"bedrijfsprocessen automatiseren"` · `"workflow automatisering mkb"` · `"administratie automatiseren ai"` · `"offertes automatiseren"`
→ Landing: `/gratis-ai-scan/` (scan past bij oriënterende intent)

## Responsive Search Ad — koppen (≤30 tekens elk, lever 12-15 aan)
1. AI Bureau voor het MKB
2. AI dat Écht Werkt
3. Vanaf €597 per Maand
4. AI-Receptionist 24/7
5. Nooit Meer Gemiste Calls
6. WhatsApp-Assistent met AI
7. Gratis AI-Scan in 3 Min
8. AVG-Compliant · EU-Data
9. AI Agency Nederland
10. Automatiseer uw MKB
11. Kant-en-klare AI Agents
12. Boek een Gratis Demo
13. Bespaar 15+ Uur per Week
14. AI voor het Nederlandse MKB
15. Rotterdam · Heel Nederland

> Pin "AI Bureau voor het MKB" / "AI-Receptionist 24/7" op positie 1 per ad group voor relevantie; laat de rest roteren.

## RSA — beschrijvingen (≤90 tekens elk, lever 4 aan)
1. AI-receptionist, WhatsApp-bot & automatisering voor het MKB. Vanaf €597/mnd.
2. Nooit meer gemiste oproepen. Uw telefoon 24/7 aangenomen door slimme AI. Plan een demo.
3. Doe de gratis AI-scan: ontdek in 3 minuten waar AI u tijd en omzet oplevert.
4. AVG-compliant, EU-data, KvK-geregistreerd. Kant-en-klaar of custom. Heel Nederland.

## Advertentie-assets
- **Sitelinks:** Gratis AI-Scan (`/gratis-ai-scan/`) · Tarieven vanaf €597 (`/tarieven/`) · AI-Receptionist (`/diensten/`) · Plan Strategiegesprek (`/demo-inplannen/`)
- **Callouts:** AVG-compliant · EU-data · KvK 56312075 · 24/7 bereikbaar · Kant-en-klaar · Custom mogelijk
- **Structured snippet** (Diensten): AI-receptionist, WhatsApp-assistent, Workflow-automatisering, Custom AI agents
- **Call asset:** +31 6 24741597 (alleen kantooruren plannen)

## Negative keywords (campagne-niveau, voorkomt verspilling)
`gratis cursus` · `opleiding` · `cursus` · `training` · `vacature` · `baan` · `stage` · `betekenis` · `wat is ai` · `voorbeelden` · `zelf maken` · `chatgpt gratis` · `gratis chatbot` · `tutorial` · `uitleg` · `student` · `scriptie`

## Tracking-checklist (vóór launch)
- [ ] GA4 `generate_lead` als Google Ads-conversie geïmporteerd + primair.
- [ ] Google Ads ↔ GA4 gekoppeld (Admin → Productlinks).
- [ ] Bedankt-pagina `/bedankt/` laadt na submit (`contact.astro:285`) — extra conversiebevestiging.
- [ ] Consent Mode v2 actief (site draait al consent-mode; check dat ads_data_redaction correct staat).
- [ ] UTM op finale URL's: `?utm_source=google&utm_medium=cpc&utm_campaign=faz1&utm_content={adgroup}`.

## Verwachting / KPI
- Eerste echte form-submissions binnen **dagen** (niet maanden) — dit is de snelste hefboom tegen "nul inbound".
- Mik op CPA < €40 voor scan-leads, < €120 voor demo-leads bij start; optimaliseer ad groups op CPA na ~20 conversies.
- Week 1: pauzeer keywords met >€15 spend en 0 conversies. Verhoog budget op AG met laagste CPA.
