# Directory submissions — veld-voor-veld (copy-paste)

> Voor elke listing exact dezelfde gegevens (consistentie = entity-autoriteit voor GEO).
> Na elke listing: profiel-URL → geef door zodat de `sameAs`-array in `BaseLayout.astro` wordt uitgebreid (nu 2 → doel 8+).
> ❌ Geen review-incentives (schendt G2/Trustpilot-beleid). Geen klantaantallen of awards verzinnen.

## Universeel blok (overal identiek plakken)
```
Bedrijfsnaam:   Aanloop AI B.V.
Website:        https://aanloopai.nl
E-mail:         hello@aanloopai.nl
Telefoon:       +31 6 2474 1597
Adres:          Blokfluit 31, 3068 KZ Rotterdam, Nederland
KvK:            88606902
BTW:            NL004672676B48
Opgericht:      2023
Oprichter/CEO:  Mustafa Agah Dogan
Servicegebied:  Nederland (HQ Rotterdam)
Logo:           public/logo-mark-light-1024.png (licht) / logo-mark-dark variant
Tagline:        AI-medewerkers voor het Nederlandse MKB
```
**Korte omschrijving (≤160 tekens):**
> AI-bureau voor het Nederlandse MKB. AI-receptionist (Marco), WhatsApp-agent (Emma), workflow-automatisering en AI-vindbaarheid (GEO). AVG-compliant, EU-data.

**Lange omschrijving (≤500 tekens):**
> Aanloop AI is het AI-bureau voor het Nederlandse MKB uit Rotterdam. Wij bouwen kant-en-klare AI-agents: Marco neemt 24/7 de telefoon aan in vloeiend Nederlands en plant afspraken; Emma handelt WhatsApp- en klantvragen af. Daarnaast workflow-automatisering, AI-websites en AI-vindbaarheid (GEO) — zodat u gevonden wordt in ChatGPT, Gemini en Claude. AVG-compliant, EU-data, transparante prijzen vanaf €249/mnd. Geen vendor lock-in.

**Categorieën:** Software Company · Artificial Intelligence · Marketing Agency · Business Automation

---

## Per directory (volgorde = prioriteit)

### 1. Sortlist.nl  (NL agency-marktplaats — hoogste relevantie)
- Account → "List your agency". Velden:
  - Services: AI development · Marketing automation · Chatbot development · Conversational AI · SEO/GEO
  - Talen: Nederlands, Engels · Locatie: Rotterdam · Teamgrootte: kies eerlijk
  - Min. projectbudget: kies een drempel die past (bv. €1.000+)
  - Portfolio: link naar aanloopai.nl/cases/ en /diensten/
- Lange omschrijving = universeel blok.

### 2. DesignRush  (agency directory, hoge DA)
- "Add your agency". Velden: categorie = Artificial Intelligence / Digital Marketing
  - Hourly rate / min project: invullen
  - Focus areas (%): AI 60 / Marketing 25 / Web 15 (pas aan naar werkelijkheid)
  - Beschrijving = lange omschrijving.

### 3. Bing Places for Business  (bing.com/places — Bing/Copilot lokaal)
- Net als GBP: **Service-area business** (adres verbergen, gebied = Nederland/Rotterdam).
- Categorie: Software Company · Beschrijving = lange omschrijving (730-tekens GBP-versie mag ook).
- Verificatie via post/telefoon.

### 4. Trustpilot  (trustpilot.com/business — vertrouwenssignaal)
- "Claim your business" op domein aanloopai.nl. Profiel invullen, **geen** reviews uitlokken met incentive.
- Voeg categorie + beschrijving toe.

### 5. FutureTools.io  (AI-tool directory — GEO-relevant)
- "Submit a tool". Submit Marco + Emma als afzonderlijke tools:
  - Marco: "AI-telefoonreceptionist (NL), 24/7, plant afspraken." URL → aanloopai.nl/diensten/marco/
  - Emma: "AI WhatsApp-/klantenservice-agent (NL)." URL → aanloopai.nl/diensten/emma/

### 6. There's An AI For That (TAAFT)  (theresanaiforthat.com)
- Submit Marco/Emma als tools (zelfde teksten als FutureTools). Kies categorie Voice / Customer support.

### 7. G2  (g2.com — software reviews, voor Marco)
- Vendor-account → product "Marco". Categorie: Conversational AI / Virtual Receptionist.
- Geen incentivized reviews.

### 8. Capterra  (capterra.com — voor Emma)
- Vendor-account → product "Emma". Categorie: Live Chat / Customer Service.

### 9. Apple Business Connect  (businessconnect.apple.com)
- Claim de business voor Apple Maps/Siri-zichtbaarheid. Service-area.

### 10. KvK / LinkedIn / publieke profielen
- Zorg dat publieke vermeldingen (LinkedIn company, KvK-profiel) dezelfde NAP tonen — consistentie telt zwaar voor AI.

---

## Na alle listings
- Verzamel de profiel-URL's → toevoegen aan `sameAs` in `src/layouts/BaseLayout.astro` Organization-schema.
- Dan pas Wikidata aanmaken (`marketing/wikidata/QUICKSTATEMENTS.md`) — directories dienen als notability-referenties.
