# Tier 2 — Otorite + eerste pilots (playbook)

Doel: DR 3.5 → omhoog (backlinks) + eerste echte klanten (case studies/reviews → vertrouwen).
Wat ik kan: assets, templates, GEO-code. Wat jij doet: outreach + sales (mens-werk).

---

## A. Founding-customers (eerste 2-3 pilots) — chicken-egg breker

**Waarom:** zonder echte case/review blijft sociale bewijskracht leeg → conversie geremd, geen `AggregateRating`-schema mogelijk.

### Aanbod-opties (kies er 1 → dan bouw ik de live landingspagina)
1. **"Founding 10"** — eerste 10 klanten: 3 mnd 50% korting + gratis setup. In ruil: case study (na 60 dagen) + Google/LinkedIn-review + logo-gebruik.
2. **Gratis 30-dagen pilot** — 1 use-case (bv. Marco op 1 telefoonlijn), daarna normaal tarief. In ruil: testimonial + 1 referral.
3. **Resultaat-garantie** — geen setup-fee + maand 1 gratis als afgesproken KPI (bv. gemiste calls −X%) niet gehaald.

### Eerste pilots vinden (warm > koud, geen massa-cold)
- Founder-netwerk: Mustafa's LinkedIn + Big4-contacten → 10-15 warme intro's.
- Lokaal Rotterdam MKB (KvK-buurbedrijven, ondernemersverenigingen).
- 2-3 focus-sectoren met acute pijn: zorg-praktijk (no-show), installateur/loodgieter (gemiste avond-calls), makelaar (leads). Pijn = snelle "ja".

### Warm outreach (LinkedIn/mail, kort)
> Onderwerp: 1 gemiste klant per dag = €X/maand
> Hoi [naam], ik bouw AI-receptionisten voor NL-MKB (Aanloop AI, Rotterdam). We zoeken 3 founding-klanten in [sector] die Marco 30 dagen testen — gratis pilot, jij levert een korte review als 't bevalt. Marco neemt 24/7 je telefoon aan, plant afspraken, mist nooit een lead. 15 min deze week om te kijken of het past?

### Na de pilot → naar de site
- Case-study (probleem → aanpak → resultaat mét cijfers) → `src/pages/cases.astro` (echte case vervangt scenario).
- Review-vraag: Google Business Profile + LinkedIn. 3+ reviews → `AggregateRating`-schema aanzetten (`BaseLayout.astro` Organization).

---

## B. Backlink / digital-PR (DR 3.5 → omhoog)

### B1. Quick-win citaties (deze week, gratis, hoge zekerheid)
- **Google Business Profile** (KvK 56312075, Rotterdam) — claim + invullen.
- **LinkedIn Company Page** (compleet, link naar site).
- **KvK / bedrijfsregisters**, **Glassdoor/Indeed company** (indien recruiting).
- **Agency-directories:** Clutch, Sortlist, The Manifest, DesignRush, GoodFirms (NL AI-agency categorie) — gratis listing = backlink + leads.
- **AI-tool directories:** There's An AI For That, Futurepedia, AI Tools Directory, Toolify — submit Marco/Emma.
- **NL startup/scale-up:** Dealroom, Techleap, StartupDelta, Silicon Canals directory.

### B2. Tech-stack partner-pagina's (backlink + co-marketing)
- **n8n** (partners/community), **ElevenLabs**, **Brevo** (partner/agency), **Mollie** (partner) — vendors linken vaak naar implementatie-partners. Vraag listing.

### B3. Digital-PR met het onderzoeksrapport (nieuwswaardig)
Linkable asset: `/onderzoek/ai-adoption-mkb-nederland-2026/`. = persbericht-haak.
- **Persbericht-concept:** "Onderzoek Aanloop AI: [X]% Nederlandse MKB'ers verliest omzet door gemiste telefoontjes — AI-adoptie [Y]% in 2026."
- **Pitch-targets (NL MKB/tech-media):** Emerce, MT/Sprout, De Ondernemer (KvK), Computable, Techzine, Dutch IT Channel, Baaz, Quote, lokaal: RTV Rijnmond / Rotterdam-zakelijk.
- **Journalist-requests:** Featured.com, Help a B2B Writer, SourceBottle — beantwoord AI/MKB-vragen als expert (Mustafa) → quote + backlink.
- **Guest posts:** 2-3 NL ondernemers-blogs / sector-platforms (1 expertartikel + auteur-link).

### B4. Prioriteit (volgorde)
1. GBP + LinkedIn + KvK (dag 1).
2. 5 agency- + 3 AI-tool-directories (week 1).
3. Tech-stack partner-listings (week 1-2).
4. Persbericht rapport → 8-10 media-pitches (week 2).
5. Featured.com/HARO wekelijks (doorlopend).

---

## C. GEO / AI-search (deels gedaan deze sessie)
- ✅ `llms.txt` + `llms-full.txt` naar canonieke prijzen (was €597/€1.197 — AI-engines kregen verkeerde data). **Deze fix is de grootste GEO-winst.**
- ✅ robots.txt: AI-crawlers (GPTBot/ClaudeBot/PerplexityBot/Google-Extended) expliciet toegestaan.
- Volgende (optioneel): citeerbare stats + bron in top-kennisbank-artikelen; `sameAs` (LinkedIn/KvK) in Organization-schema; FAQ-schema breder.

---

## Volgende stap (van mij)
Kies aanbod-optie A1/A2/A3 → ik bouw de live **founding-landingspagina** (`/founding/` of sectie op homepage) + de outreach-CTA + (na eerste reviews) `AggregateRating`-schema.
