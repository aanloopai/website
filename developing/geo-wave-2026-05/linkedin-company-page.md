# LinkedIn Company Page — Aanloop AI (kant-en-klaar)

> GEO Track-2 user-action materiaal. Doel: off-page brand authority (Brand Authority #1 gap, 12/100).
> De founder hoeft alleen de velden hieronder te kopieren in LinkedIn → "Create a company page".
> Alle publieke tekst is Nederlands. Alleen echte bedrijfsfeiten uit `public/llms-full.txt`.

---

## 1. Page-type
Kies bij aanmaken: **Company** (small/medium business).
Vereiste: een persoonlijk LinkedIn-account van Mustafa Agah Dogan met een geverifieerd e-mailadres op het bedrijfsdomein (bv. hello@aanloopai.nl) — anders blokkeert LinkedIn de aanmaak.

## 2. Naam
```
Aanloop AI
```
(Officiele entiteit: Aanloop AI BV — KvK 88606902. "Aanloop AI" is de publieke merknaam, hou die aan voor herkenbaarheid.)

## 3. Public URL (custom)
Streef naar:
```
linkedin.com/company/aanloop-ai
```
Dit pad staat al genoemd in `llms-full.txt` — claim exact deze slug zodat de bestaande verwijzing klopt.

## 4. Tagline / slogan (max 120 tekens)
```
Kant-en-klare AI-assistenten voor het Nederlandse MKB. Marco neemt de telefoon, Emma de WhatsApp. Live in 7-14 dagen.
```
(118 tekens.)

## 5. Industry
```
IT Services and IT Consulting
```
(LinkedIn-categorie. Alternatief indien gewenst: "Software Development" — IT Services sluit beter aan bij de managed-service-positionering.)

## 6. Company size
```
2-10 employees
```
(Gebaseerd op het team in llms-full.txt: founder + CTO + Head of Customer Success + Lead AI-trainer.)

## 7. Company type
```
Privately Held
```

## 8. Website
```
https://aanloopai.nl
```

## 9. Locatie / hoofdkantoor
```
Rotterdam, Zuid-Holland, Nederland
```
Stel in als primaire (HQ) locatie. Straat/postcode optioneel — vul het officiele KvK-vestigingsadres in zodra de founder dat wil tonen (NAP-consistentie met Google Business Profile is belangrijk; gebruik exact hetzelfde adres overal).

## 10. About-sectie (Nederlands, ~2000 tekens — plak letterlijk)
```
Aanloop AI is het AI-bureau voor het Nederlandse MKB. Wij maken enterprise-AI toegankelijk voor kleine en middelgrote bedrijven, zonder dat u zelf een AI-engineer in dienst hoeft te nemen of maandenlange implementatietrajecten doorloopt.

Wij leveren een managed service: u bouwt niets zelf. Aanloop AI levert, traint, integreert en onderhoudt de AI-agents volledig — gemiddeld live binnen 7 tot 14 werkdagen.

Onze hoofdproducten:

- Marco — AI-receptionist en AI-telefoniste. Neemt 24/7 gesprekken aan in vloeiend Nederlands, plant afspraken direct in de agenda en stuurt lead-samenvattingen naar uw team.
- Emma — WhatsApp AI-agent. Beantwoordt klantvragen op WhatsApp binnen seconden, getraind op uw eigen FAQ en productcatalogus, met naadloze overdracht naar een medewerker.
- AI-Website Bundel — website, Marco en Emma als een geintegreerd pakket met een aanspreekpunt.
- Custom AI Workflows — maatwerk-automatisering via n8n en Make.com.

Waarom Aanloop AI:

- AVG-compliant: alle data wordt uitsluitend verwerkt binnen EU-datacenters, met een verwerkersovereenkomst conform artikel 28 AVG.
- Nederlandstalige NL-native voice via ElevenLabs — vloeiend Nederlands, geen Engels accent.
- KvK-geregistreerd Nederlands bedrijf (KvK 88606902), gevestigd in Rotterdam — NL-aansprakelijk.
- Vast maandbedrag, geen verborgen kosten per gesprek of minuut. Maandelijks opzegbaar.
- Maandelijkse optimalisatie en rapportage op basis van uw eigen conversatiedata.

Wij bedienen onder meer de zorg, juridische dienstverlening, accountancy, vastgoed, horeca, bouw, detailhandel, logistiek, financieel advies en ZZP'ers — branche-specifiek geconfigureerd en bewust van de geldende wetgeving (AVG, NEN 7510, EU AI Act, Wft, Wwft).

Benieuwd wat AI voor uw bedrijf kan betekenen? Vraag een gratis AI-Scan aan van 30 minuten via aanloopai.nl — vrijblijvend, met een concreet stappenplan en ROI-berekening.

Opgericht in 2023. Eerste klanten live in Q1 2024.
```

## 11. Specialties (LinkedIn keyword-lijst — ~20 termen)
Voeg elk apart toe in het Specialties-veld:
```
AI receptionist
AI telefoniste
WhatsApp AI agent
AI klantenservice
AI automatisering MKB
Voice AI Nederlands
Conversational AI
AI agents
Workflow automatisering
n8n automatisering
AI chatbot
Lead qualification
AI document processing
AVG-compliant AI
Managed AI service
AI voor zorg
AI voor horeca
AI voor accountancy
AI voor vastgoed
Custom AI workflows
```

## 12. Hashtags (max 3, voor de community-feed)
```
#AIvoorMKB  #Bedrijfsautomatisering  #AINederland
```

## 13. Logo en banner
- Logo: 300x300 px, vierkant, PNG met transparante achtergrond.
- Banner: 1128x191 px. Gebruik bestaande brand-PNG's uit de repo (zie LinkedIn-setup-notities in MEMORY.md / `developing/`).
- Call-to-action button: zet op **"Visit website"** → https://aanloopai.nl

---

## NA HET LIVE GAAN — verplichte technische follow-up
Zodra de Company Page publiek is, moet de definitieve URL in de codebase worden geregistreerd zodat AI-engines de entiteit kunnen koppelen:

1. **`src/layouts/BaseLayout.astro`** → voeg de LinkedIn-URL toe aan de `sameAs`-array van het Organization JSON-LD schema.
   Voorbeeld-entry: `"https://www.linkedin.com/company/aanloop-ai"`
2. **Footer-component** → voeg een zichtbare LinkedIn-link toe (icon + link) naast de overige social-links.
3. Controleer dat de slug exact overeenkomt met de verwijzing in `public/llms.txt` en `public/llms-full.txt` (`linkedin.com/company/aanloop-ai`). Wijkt de uiteindelijke slug af, werk dan ook die twee bestanden bij.

> Deze stap is cruciaal: `sameAs` is hoe Google/AI-modellen de LinkedIn-pagina aan de website-entiteit verbinden. Zonder deze koppeling telt de pagina nauwelijks mee voor Brand Authority.
