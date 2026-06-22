# Findability-assets — Wikidata + review-platforms

---

# 1. WIKIDATA (entity → Knowledge Graph + AI-grounding)

> ⚠️ Notability: Wikidata kan een item van een jong bedrijf verwijderen zonder externe bronnen. Doe dit **nadat** er pers/G2/Capterra-vermeldingen zijn (gebruik die als references). Maak het item op wikidata.org → "Create a new Item".

**Label (nl):** Aanloop AI
**Label (en):** Aanloop AI
**Description (nl):** Nederlands AI-bureau voor het MKB
**Description (en):** Dutch AI agency for small and medium-sized businesses
**Aliases:** Aanloop, Aanloop AI B.V.

**Statements (property → value):**
- `instance of (P31)` → enterprise (Q6881511)
- `country (P17)` → Netherlands (Q55)
- `headquarters location (P159)` → Rotterdam (Q34370)
- `inception (P571)` → 2023
- `industry (P452)` → artificial intelligence (Q11660); software (Q7397)
- `legal form (P1454)` → besloten vennootschap (Q1655459)
- `official website (P856)` → https://aanloopai.nl
- `founded by (P112)` → Mustafa Agah Dogan (maak evt. ook een Person-item)
- `social media`: LinkedIn (P4264/P2013) → aanloop-ai; Instagram (P2003) → aanloop.ai

**References (voeg toe bij elke claim, anders kans op verwijdering):**
- KvK-uittreksel (KvK 88606902), official website, + 1 externe bron (persbericht/G2/Capterra zodra beschikbaar).

**Na aanmaak:** voeg de Wikidata-URL (`https://www.wikidata.org/wiki/Q…`) toe aan de Organization `sameAs` in `src/layouts/BaseLayout.astro` (er staat al een TODO-regel klaar) → ik zet het er dan in.

---

# 2. REVIEW-PLATFORMS (B2B discoverability + DA-backlink + buyer-intent)

Platforms: **G2 · Capterra · Trustpilot · Software Advice · GetApp**. Claim/voeg product toe, vraag founding-klanten om reviews op dezelfde plek.

**Vendor:** Aanloop AI · Rotterdam, NL · https://aanloopai.nl · hello@aanloopai.nl · KvK 88606902

## Product A — Marco (AI Receptionist / AI Voice Agent)
- **Categorieën:** Conversational AI, AI Agents, Virtual Receptionist, Auto Dialer/Voice, Customer Self-Service
- **Tagline:** 24/7 Nederlandstalige AI-receptionist die de telefoon aanneemt, afspraken plant en nooit een lead mist.
- **Korte beschrijving (G2 short):** Marco is een AI-receptionist voor het Nederlandse MKB die 24/7 inkomende telefoongesprekken aanneemt, leads kwalificeert, afspraken inplant en doorzet naar uw CRM — in vloeiend Nederlands met een natuurlijke stem.
- **Features (vink-lijst):** 24/7 inbound voice · NL-native (ElevenLabs) · agenda-integratie (Google/Outlook) · CRM-koppeling (HubSpot/Pipedrive/Salesforce) · live transcripts + opnames · spoed-triage & doorschakeling · nummerportering · dashboard/analytics · AVG-compliant, EU-data
- **Pricing:** vanaf €497/mnd (maandelijks opzegbaar); setup €495. Geen kosten per gesprek.
- **Deployment:** Cloud/SaaS · **Talen:** NL (primair), EN/DE/FR/ES op aanvraag · **Doelgroep:** MKB 1–250 mdw · **Support:** NL, e-mail/telefoon
- **USP's:** managed (geen DIY) · live in 7–14 dagen · EU-only data · vast tarief

## Product B — Emma (AI WhatsApp / Chat Agent)
- **Categorieën:** Conversational AI, Live Chat, Customer Service, Chatbots, WhatsApp Business
- **Tagline:** AI-klantenservice op WhatsApp — 24/7 antwoord op FAQ, orders en afspraken, met menselijke handover.
- **Korte beschrijving:** Emma handelt WhatsApp- en chatvragen automatisch af, getraind op uw FAQ en productcatalogus, met naadloze handover naar uw team. Native koppelingen met Shopify/WooCommerce en CRM.
- **Features:** WhatsApp Business API · eigen kennisbank/FAQ · Shopify/WooCommerce/Magento · CRM-sync · meertalig (NL/EN/FR/DE) · human handover · no-show reminders
- **Pricing:** Emma Lite €49/mnd (tot 500 berichten) · Emma Standard €197/mnd (onbeperkt); inbegrepen in Groei €997/mnd.
- **Deployment:** Cloud/SaaS · **Doelgroep:** MKB, webshops · **AVG-compliant, EU-data.**

**Review-vraag (naar founding-klanten):**
> Zou u ons willen helpen met een korte, eerlijke review op [G2/Capterra]? Het kost 3 minuten en helpt andere ondernemers de juiste keuze te maken. Link: [review-URL]
