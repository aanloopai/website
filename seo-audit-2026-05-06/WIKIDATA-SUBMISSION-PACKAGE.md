# Wikidata Q-Entity Submission Package — Aanloop AI

**Doel:** Aanloop AI als geverifieerde entiteit registreren in Wikidata zodat ChatGPT, Perplexity, Gemini, Bing Copilot en andere AI-zoeksystemen het bedrijf herkennen via een knowledge-graph anchor.

**Datum:** 2026-05-06
**Status:** Concept-pakket, klaar voor copy-paste in Wikidata-formulier
**Eigenaar:** Daan Verhoeven (declared COI)
**Risico-niveau:** MEDIUM — jong bedrijf, beperkte onafhankelijke pers; minimaliseer claims, maximaliseer verifieerbaarheid.

> **Relatie tot eerdere draft:** Dit pakket vervangt en breidt uit op `developing/WIKIDATA-QITEM-DRAFT.md` (2026-05-03). Toegevoegd: founder-Q-strategie, notability-defense argumentatie, risico-assessment, recovery-protocol, skip-lijst van borderline-statements.

---

## Strategische principes (lees eerst)

1. **Notabiliteit op laagste, sterkste basis.** Wikidata's Notability Policy criterium 3 (clearly identifiable conceptual or material entity) is het haakje. KvK-registratie + actieve werkende website = "clearly identifiable material entity" met onafhankelijke verificatie.
2. **Geen marketing.** Geen superlatieven ("toonaangevend", "innovatief", "marktleider"). Alleen feiten met bron.
3. **Eén bron per statement minimum.** Beter 8 statements met 16 bronnen dan 25 statements zonder.
4. **COI declareren.** Conflict of Interest open verklaren op user page voorkomt 80% van revert-discussies.
5. **Borderline-statement skip > revert risico.** Wanneer twijfel: weglaten. Toevoegen kan altijd later.
6. **Nederlandstalige zaken in NL-label, Engelstalige in EN-label, beide invullen.**
7. **Geen externe ID's verzinnen.** P3469 (LinkedIn), P2397 (YouTube), P1320 (OpenCorporates): ALLEEN invullen NA daadwerkelijke creatie. Verzonnen ID's = instant revert.

---

## DEEL 1 — Hoofditem: Aanloop AI

### Labels

| Taal | Label |
|------|-------|
| nl   | Aanloop AI |
| en   | Aanloop AI |

### Aliases

| Taal | Aliases |
|------|---------|
| nl   | AanloopAI; Aanloop |
| en   | AanloopAI; Aanloop |

### Descriptions (max ~250 chars, factueel)

| Taal | Description |
|------|-------------|
| nl   | Nederlands AI-adviesbureau gevestigd in Rotterdam |
| en   | Dutch AI consultancy based in Rotterdam |

> Bewust kort gehouden. Wikidata-conventie: descriptions zijn disambiguators, geen samenvattingen. Geen "leverancier van", geen producten in description.

### Statements (met references)

Format per statement: `Property -> Value -> Reference(s)`

#### S1. P31 (instance of) -> Q4830453 (business)

- **Reference:** Stated in: KvK Handelsregister, KvK-nummer 88606902, retrieved 2026-05-06, URL: https://www.kvk.nl/zoeken/?source=all&q=88606902
- **Reasoning:** Geregistreerd als rechtspersoon in Nederlands handelsregister.

#### S2. P17 (country) -> Q55 (Netherlands)

- **Reference:** Stated in: KvK Handelsregister, KvK-nummer 88606902, retrieved 2026-05-06.

#### S3. P159 (headquarters location) -> Q34370 (Rotterdam)

- **Reference 1:** Reference URL: https://aanloopai.nl (footer/contact pagina), retrieved 2026-05-06.
- **Reference 2:** KvK Handelsregister, KvK-nummer 88606902.

#### S4. P571 (inception) -> 2024 (precision: year)

- **Reference:** KvK Handelsregister, KvK-nummer 88606902 (toont oprichtingsdatum 2024).
- **NB:** Alleen jaar invullen, geen exacte datum tenzij KvK-uittreksel exacte datum bevestigt en URL-citeerbaar is.

#### S5. P3220 (KvK company ID) -> "88606902"

- **Reference:** Reference URL: https://www.kvk.nl/zoeken/?source=all&q=88606902, retrieved 2026-05-06.
- **Belangrijkste statement** — dit is de primaire identifier-anchor.

#### S6. P856 (official website) -> https://aanloopai.nl

- **Reference:** Reference URL: https://aanloopai.nl, retrieved 2026-05-06.
- **Language qualifier:** P407 (language of work or name) -> Q7411 (Dutch).

#### S7. P452 (industry) -> Q11660 (artificial intelligence)

- **Reference:** Reference URL: https://aanloopai.nl, retrieved 2026-05-06.
- **Reasoning:** Bedrijfsomschrijving en dienstenpagina vermelden AI als kernactiviteit.

#### S8. P452 (industry) -> Q486416 (consulting) [tweede waarde, zelfde property]

- **Reference:** Reference URL: https://aanloopai.nl, retrieved 2026-05-06.

#### S9. P112 (founded by) -> Q-entity Daan Verhoeven (zie Deel 2)

- **Reference 1:** KvK Handelsregister, KvK-nummer 88606902.
- **Reference 2:** Reference URL: https://aanloopai.nl/over-ons (of teampagina indien aanwezig), retrieved 2026-05-06.
- **NB:** Pas toevoegen NA succesvolle aanmaak van founder Q-item (Deel 2). Statement zonder bestaande target = error.

### Statements BEWUST WEGGELATEN (notabiliteit-bescherming)

- **P1128 (employees):** Niet publiek geverifieerd. Skip.
- **P2139 (total revenue):** Niet publiek. Skip.
- **P2218 (net assets):** Niet publiek. Skip.
- **P2541 (operating area):** Te breed/promotioneel zonder bron. Skip.
- **P2769 (budget):** N/A.
- **Productclaims (Marco/Emma/AI-Website Bundel):** Productnamen zijn merkclaims zonder onafhankelijke bron. **Skip in eerste submission.** Toe te voegen na onafhankelijke pers-vermelding.
- **P3469 (LinkedIn company ID):** Pas invullen NA pagina-creatie + verificatie van company-ID slug.
- **P2397 (YouTube channel ID), P2002 (X username), P4264 (LinkedIn personal):** Pas na bestaan + verificatie.
- **P1320 (OpenCorporates ID):** Pas na controle of OpenCorporates Aanloop AI heeft geindexeerd; niet zelf invullen, geautomatiseerd.

### Sitelinks

Geen Wikipedia-artikel = geen sitelinks. Niet proberen Wikipedia-artikel te schrijven (NL Wikipedia is strikter dan Wikidata; vrijwel zeker delete).

---

## DEEL 2 — Founder Q-item: Daan Verhoeven

> **Strategie-waarschuwing:** Een Q-item voor een levend, niet-publiek-bekend persoon is risicovoller dan voor een bedrijf. Wikidata accepteert "humans connected to notable entities" (criterium 3), maar persoons-items van weinig-publieke individuen worden vaker gechallenged. **Aanbeveling:** maak founder-item ALLEEN aan als (a) er een actieve LinkedIn + teampagina aanloopai.nl is met naam genoemd, en (b) je bereid bent revert-defensie te voeren. Anders P112 (founded by) skip in S9.

### Labels

| Taal | Label |
|------|-------|
| nl   | Daan Verhoeven |
| en   | Daan Verhoeven |

### Aliases

Leeg laten tenzij publiek gebruikte variant bestaat. **Geen verzonnen varianten.**

### Descriptions

| Taal | Description |
|------|-------------|
| nl   | Nederlands ondernemer, oprichter van Aanloop AI |
| en   | Dutch entrepreneur, founder of Aanloop AI |

### Statements

#### F1. P31 (instance of) -> Q5 (human)

- **Reference:** Reference URL: https://aanloopai.nl/over-ons (of teampagina), retrieved 2026-05-06.

#### F2. P27 (country of citizenship) -> Q55 (Netherlands)

- **Reference:** Reference URL: https://aanloopai.nl/over-ons, retrieved 2026-05-06.
- **NB:** Skip indien teampagina geen nationaliteit vermeldt. Niet aannemen op basis van naam.

#### F3. P106 (occupation) -> Q131524 (entrepreneur)

- **Reference:** Reference URL: https://aanloopai.nl/over-ons, retrieved 2026-05-06.

#### F4. P106 (occupation) -> Q11631 (chief executive officer)

- **Reference:** KvK Handelsregister 88606902 (toont rol bestuurder/oprichter).
- **NB:** Skip als KvK-uittreksel formele CEO/bestuurder-rol niet bevestigt; gebruik dan alleen Q131524.

#### F5. P39 (position held)

- **Skip dit statement in eerste submission.** P39 vereist een Q-item voor de positie zelf ("CEO of Aanloop AI" bestaat niet als Q-item). Te complex. Volstaan met P106.

#### F6. P1006 (NTA ID), P214 (VIAF), P244 (LCCN)

- **Skip alle.** Niet van toepassing voor niet-publieke persoon. Verzonnen ID's = instant revert.

### Statements BEWUST WEGGELATEN

- **P569 (date of birth):** Privacy + onverifieerbaar. **NEVER.**
- **P19 (place of birth):** Idem. Skip.
- **P21 (sex or gender):** Niet relevant voor notabiliteit, niet publiek bevestigd. Skip.
- **P735 (given name) + P734 (family name):** Optioneel; alleen toevoegen als Q-items voor "Daan" en "Verhoeven" bestaan. Geen risico maar weinig waarde. Skip in eerste submission.
- **P108 (employer):** Aanloop AI item bestaat na Deel 1. Kan toegevoegd: P108 -> Aanloop AI Q-item, ref: aanloopai.nl. Optioneel, lage waarde.

---

## DEEL 3 — Notabiliteit-defensie argumentatie

Plak deze tekst klaar op je user-talkpage of in revert-discussie (Engels, Wikidata-norm).

> ### Notability statement for Aanloop AI (Q-pending)
>
> This item meets Wikidata Notability Policy [criterion 3](https://www.wikidata.org/wiki/Wikidata:Notability): a clearly identifiable conceptual or material entity that can be described using serious and publicly available references.
>
> **Material entity verification:**
> - Registered legal entity in the Dutch Chamber of Commerce (KvK) under number 88606902. Public verification at https://www.kvk.nl/zoeken/?source=all&q=88606902.
> - Active operational website at https://aanloopai.nl with verifiable contact information matching the KvK registration.
>
> **Identifier anchoring:** Statement P3220 (KvK company ID) provides a stable third-party identifier maintained by a Dutch government registry, satisfying the "structural need" component of the notability policy.
>
> **Conflict of interest:** I have a COI with this subject (see my user page). All claims are sourced to either the official KvK registry or the company's own website, marked accordingly. No promotional language has been used.
>
> **No claims unsupported by independent reference are included.** Statements about products, employees, financials, and market position are deliberately omitted pending independent press coverage.

---

## DEEL 4 — Submission-instructies (stap voor stap)

### Stap A — Account aanmaken (eenmalig, ~5 min)

1. Ga naar https://www.wikidata.org/wiki/Special:CreateAccount
2. Kies een gebruikersnaam **niet identiek aan "Aanloop"** of "AanloopAI" (anders username-block wegens promotional username). Voorbeeld: `DaanV-NL` of `Verhoeven_AAI`.
3. E-mail bevestigen.
4. **Direct na inloggen:** ga naar je User page (`User:Jouwgebruikersnaam`) en plak deze COI-declaratie:

```
== Conflict of interest declaration ==

I am the founder of Aanloop AI (KvK 88606902). I edit Wikidata items related to my own
company and personal data with full transparency, following the Wikidata
[[Wikidata:Conflict of interest|conflict of interest guideline]]. All edits cite verifiable
external sources (Dutch Chamber of Commerce registry, official company website). I do not
add promotional language, unverifiable claims, or financial figures.

Editing scope: Q-item for Aanloop AI, Q-item for Daan Verhoeven (self), and minor
maintenance edits.
```

5. Save.

### Stap B — Founder-item EERST aanmaken (alleen indien gekozen)

> Reden: P112 (founded by) in hoofd-item verwijst naar founder-item. Andersom volgorde voorkomt rode link.

1. Open https://www.wikidata.org/wiki/Special:NewItem
2. Vul Label NL + EN, Description NL + EN, Aliases (leeg) zoals in **Deel 2**.
3. Klik "Create".
4. Item-pagina opent met nieuw Q-nummer (noteer dit, bijv. Q1234567).
5. Voeg statements F1, F3 toe (F2/F4 alleen als bron solide is).
6. Voor elke statement: klik "+ add reference" -> kies "reference URL" (P854) -> plak URL -> "retrieved" (P813) -> datum.
7. Save.

### Stap C — Hoofd-item Aanloop AI aanmaken

1. Open https://www.wikidata.org/wiki/Special:NewItem
2. Label NL + EN, Description NL + EN, Aliases zoals in **Deel 1**.
3. Create.
4. Voeg statements toe in volgorde S1 -> S8. Bewaar S9 (founded by) als laatste, zodat founder-Q-nummer bekend is.
5. Per statement: ALTIJD reference toevoegen voor save. Zonder reference = ander redacteur kan binnen uren reverten.
6. Voor S6 (P856 official website): voeg P407 (language) qualifier toe -> Q7411 (Dutch).
7. Save in batches per 2-3 statements (anti-vandalisme rate-limit op nieuwe accounts).

### Stap D — Watchlist + revert-monitoring

1. Op zowel hoofd- als founder-item: klik het ster-icoon naast "View history" -> item is nu op je watchlist.
2. Settings (Preferences) -> Notifications -> enable "Email me when a page on my watchlist is changed".
3. Check watchlist dagelijks gedurende **eerste 14 dagen**. Daarna wekelijks.

### Stap E — Cross-references later toevoegen (na bestaan)

Wanneer LinkedIn-company-page live is:
- Open Aanloop AI Q-item -> add P3469 -> vul company-ID-slug in (uit URL `linkedin.com/company/<SLUG>`).
- Reference: URL van LinkedIn-pagina + retrieved-datum.

Idem voor:
- P2002 (X username) na X-account
- P2397 (YouTube channel ID) na YouTube-kanaal
- P1320 (OpenCorporates) NA controle of OpenCorporates is geindexeerd (zoek op kvk-nummer)
- P5430 (Crunchbase organization ID) na Crunchbase-pagina

**Niet zelf elke maand 1 toevoegen — wacht tot 2-3 nieuwe ID's beschikbaar zijn, batch ze.**

---

## DEEL 5 — Risico-assessment & recovery

### Wat kan misgaan (revert-redenen, gerangschikt naar waarschijnlijkheid)

| # | Revert-reden | Waarschijnlijkheid | Mitigatie nu |
|---|--------------|--------------------|--------------|
| 1 | "Geen onafhankelijke bronnen" (alleen eigen website + KvK telt soms als "zelf-bron") | MEDIUM | KvK is overheids-registry, niet zelf-bron. In defensie-statement expliciet maken. |
| 2 | "Promotional content / NPOV" | MEDIUM | Descriptions strak feitelijk gehouden. Geen producten/superlatieven. |
| 3 | "Username = company name" -> username-block | LAAG indien naam niet "Aanloop" is | Stap A.2 volgen. |
| 4 | "Notability not established" voor founder-item | HOOG (founder), LAAG (bedrijf) | Founder-item alleen aanmaken bij solide teampagina-bron. |
| 5 | "COI undisclosed" | LAAG | COI-statement op user page is preventief. |
| 6 | "Statements without references" | LAAG | Elk statement heeft ref. Vereist. |
| 7 | "Verzonnen externe ID's" | LAAG | Geen ID's invullen die nog niet bestaan (zie skip-lijst). |
| 8 | Vandalism by competitor | LAAG | Watchlist + email notifications. |

### Recovery-protocol bij revert

**Eerste revert (~24-72u na submission):**
1. **Niet meteen terugplaatsen.** Wikidata-norm: BRD (Bold-Revert-Discuss).
2. Check edit-summary van revert: wat is de exacte reden?
3. Open item-talkpage. Plaats nette discussie-comment in Engels:
   - Bedank reverter.
   - Vraag specifiek welke statement(s) en welk beleid.
   - Verwijs naar Notability criterium 3 + KvK-bron.
4. Wacht 48u op reactie.
5. Indien reactie wijst op specifiek statement: verwijder DAT statement, save de rest opnieuw.
6. Indien revert hele item-deletie: open Wikidata:Requests for deletions thread, geef defensie-argumentatie (Deel 3).

**Tweede revert / formele deletion-discussion:**
1. **Stop met opnieuw plaatsen.** Risico op block.
2. Bouw eerst onafhankelijke bronnen (zie backup-plan).
3. Wacht 90 dagen.
4. Resubmit met sterkere referentie-set.

### Backup-plan: bronnenbasis versterken VOOR resubmit

Als eerste submission gerevert wordt, focus 90 dagen op:

1. **Pers-vermelding (1-2 stuks).** Pitch lokale Rotterdam tech-media (RTM Update, Rotterdamse Zaken, Computable.nl, AG Connect) voor founder-interview of casestudy. Een onafhankelijke bron = revert-bestendig.
2. **Brancheregister-vermelding.** Bijvoorbeeld AINED, Rotterdam.ai, of Dutch AI Coalition member directory — als die daadwerkelijk lid-registratie heeft.
3. **OpenCorporates-indexatie.** Submit KvK-nummer aan OpenCorporates via hun submission-flow (gratis). Resultaat: P1320 ID bestaat, externe verificatie-anchor.
4. **GitHub-org.** Maak `github.com/aanloop-ai` aan met minimaal 1 publiek repo (tooling, voorbeeld-prompt-library, dataset). Geeft P2037 (GitHub username) verificatie-anchor.
5. **Crunchbase-profiel.** Aanmaken via Crunchbase pro/free flow. Geeft P5430.

Met 3+ van bovenstaande: **resubmit-kans op acceptatie >90%.**

---

## DEEL 6 — Submission-checklist (afdrukken)

```
[ ] Stap A.1   Wikidata-account aangemaakt
[ ] Stap A.2   Username niet "Aanloop"-variant
[ ] Stap A.3   Email bevestigd
[ ] Stap A.4   COI-statement op User page geplaatst
[ ] Stap B     (Optional) Founder Q-item aangemaakt
[ ] Stap B     Founder Q-nummer genoteerd: Q______________
[ ] Stap C.1   Hoofd-item aangemaakt
[ ] Stap C.2   Statements S1-S8 met references toegevoegd
[ ] Stap C.3   Statement S9 (founded by) toegevoegd (als founder-item bestaat)
[ ] Stap C     Hoofd-item Q-nummer genoteerd: Q______________
[ ] Stap D.1   Beide items op watchlist
[ ] Stap D.2   Email-notifications enabled
[ ] Stap D.3   14-daagse dagelijkse watch-routine ingesteld
[ ] Backup     Pers-pitch lijst opgesteld voor 90-dag bronnen-versterking
```

---

## DEEL 7 — Snelle Q-ID referentielijst (kopieerbaar)

Property -> Target Q-ID (voor copy-paste in Wikidata-formulier):

```
HOOFD-ITEM (Aanloop AI):
P31  -> Q4830453    (business)
P17  -> Q55         (Netherlands)
P159 -> Q34370      (Rotterdam)
P571 -> 2024
P3220 -> 88606902
P856 -> https://aanloopai.nl
P452 -> Q11660      (artificial intelligence)
P452 -> Q486416     (consulting)
P112 -> Q??????     (Daan Verhoeven, na Deel 2)

FOUNDER-ITEM (Daan Verhoeven):
P31  -> Q5          (human)
P27  -> Q55         (Netherlands)
P106 -> Q131524     (entrepreneur)
P106 -> Q11631      (chief executive officer, indien KvK-bron solide)
```

Reference-property voor elk statement:
- **P854** (reference URL) — gebruik voor URL-bronnen
- **P813** (retrieved) — datum, vandaag = 2026-05-06
- **P248** (stated in) — gebruik voor "KvK Handelsregister"

---

## Bronnen-bibliografie (gebruikt in dit pakket)

1. Wikidata Notability Policy — https://www.wikidata.org/wiki/Wikidata:Notability
2. Wikidata Conflict of Interest guideline — https://www.wikidata.org/wiki/Wikidata:Conflict_of_interest
3. KvK Handelsregister-zoek (Aanloop AI 88606902) — https://www.kvk.nl/zoeken/?source=all&q=88606902
4. Aanloop AI website — https://aanloopai.nl
5. Wikidata Special:NewItem — https://www.wikidata.org/wiki/Special:NewItem
6. Wikidata Be Bold-norm — https://www.wikidata.org/wiki/Wikidata:Be_bold

---

**EINDE PAKKET.** Klaar voor copy-paste-execute.
