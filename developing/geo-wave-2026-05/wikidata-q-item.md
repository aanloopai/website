# Wikidata Q-item — Aanloop AI (creatie-specificatie)

> GEO Track-2 user-action materiaal. Doel: een gestructureerde entiteit in Wikidata zodat
> AI-modellen en zoekmachines Aanloop AI als herkenbare entiteit kunnen koppelen
> (Brand Authority #1 gap, 12/100). Wikidata voedt Google Knowledge Graph + veel AI-trainingsdata.
> Alleen echte feiten uit `public/llms-full.txt`. Geen verzonnen claims.

## Belangrijk vooraf — Wikidata-notabiliteit
Wikidata accepteert items die voldoen aan ten minste een van de notabiliteitscriteria. Een
KvK-geregistreerd bedrijf met een eigen, citeerbaar gepubliceerd onderzoek en externe
vermeldingen heeft een redelijke basis, maar items zonder enige onafhankelijke bron worden
soms verwijderd. **Aanbevolen volgorde:** maak eerst de LinkedIn Company Page en enkele
directory-listings aan (zie de andere documenten in deze map), zodat er externe referenties
bestaan om naar te verwijzen. Maak daarna pas het Wikidata-item.

---

## Item-inhoud (Engelstalig label/description is conventie op Wikidata)

### Label (en)
```
Aanloop AI
```

### Description (en)
```
Dutch artificial intelligence agency for small and medium-sized businesses, based in Rotterdam
```

### Label (nl)
```
Aanloop AI
```

### Description (nl)
```
Nederlands AI-bureau voor het MKB, gevestigd in Rotterdam
```

### Aliases (en + nl)
```
Aanloop AI BV
Aanloop
```

---

## Statements (properties)

| Property | Property-ID | Waarde | Waarde-item / formaat | Bron (referentie) |
|---|---|---|---|---|
| instance of | **P31** | business | item **Q4830453** | aanloopai.nl |
| inception | **P571** | 2023 | datum, precisie = jaar | aanloopai.nl/llms.txt |
| founded by / founder | **P112** | Mustafa Agah Dogan | nieuw persoon-item of string-qualifier | aanloopai.nl/team/magahdogan/ |
| headquarters location | **P159** | Rotterdam | item **Q34370** | aanloopai.nl |
| country | **P17** | Netherlands | item **Q55** | aanloopai.nl |
| official website | **P856** | https://aanloopai.nl | URL | — (zelf-referentieel toegestaan) |
| industry | **P452** | artificial intelligence | item **Q11660** | aanloopai.nl |
| legal form | **P1454** | besloten vennootschap | item **Q2624520** | KvK 88606902 |
| Chamber of Commerce ID (NL) | **P3548** | 88606902 | KvK-nummer (string) | kvk.nl |

### Toelichting per statement
- **P31 (instance of) → Q4830453 "business":** standaard voor een commercieel bedrijf. Indien
  gewenst kan later `Q43229` (organization) als aanvulling, maar `business` volstaat.
- **P571 (inception):** vul `2023` in met precisie "jaar" (llms-full.txt: "Opgericht: 2023").
- **P112 (founder):** Mustafa Agah Dogan. Als er nog geen persoon-item bestaat, kan de founder
  eventueel eerst een eigen Q-item aanmaken (label "Mustafa Agah Dogan", description "founder of
  Aanloop AI"), of voorlopig een tekstwaarde gebruiken. Een gekoppeld persoon-item is sterker.
- **P159 (headquarters location) → Q34370:** dat is het Wikidata-item voor de stad Rotterdam.
- **P17 (country) → Q55:** Q55 is het item voor Nederland.
- **P856 (official website):** exact `https://aanloopai.nl` (met https, zonder trailing slash).
- **P3548 (Chamber of Commerce ID — Netherlands):** het KvK-nummer **88606902**. Dit is de
  meest waardevolle statement voor entiteitsverificatie — het koppelt het item hard aan een
  officieel register.

### Optionele extra statements (alleen invullen als bron beschikbaar)
- **P1448 (official name):** `Aanloop AI BV`
- **P968 (e-mail address):** `mailto:hello@aanloopai.nl`
- LinkedIn: voor LinkedIn-bedrijfspagina's bestaat geen aparte stabiele Wikidata-property; houd
  de LinkedIn-URL buiten Wikidata en registreer die in plaats daarvan via `sameAs` in de
  site-schema (zie linkedin-company-page.md).

---

## Stap-voor-stap: het item aanmaken op wikidata.org

1. Ga naar **https://www.wikidata.org** en maak een account aan (of log in). Gebruik een
   account met enige bewerkingsgeschiedenis als dat kan — gloednieuwe accounts trekken meer
   controle.
2. Controleer eerst of het item al bestaat: zoek bovenin op "Aanloop AI". Bestaat het al,
   bewerk dan dat item in plaats van een nieuw aan te maken.
3. Klik linksin op **"Create a new Item"** (of ga naar Special:NewItem).
4. Vul in:
   - **Language:** `en`
   - **Label:** `Aanloop AI`
   - **Description:** `Dutch artificial intelligence agency for small and medium-sized businesses, based in Rotterdam`
   - **Aliases:** `Aanloop AI BV`, `Aanloop`
5. Sla op. Voeg daarna via "Add" ook de Nederlandse label/description toe (zie hierboven).
6. Voeg de statements toe via **"+ add statement"**. Typ de property-naam of het P-nummer
   (bv. `P31`), kies de waarde uit de tabel hierboven. Begin met P31, P571, P159, P17, P856,
   P3548.
7. Voeg bij elk statement een **referentie** toe ("add reference"): gebruik
   `reference URL (P854)` = de relevante aanloopai.nl-pagina, of voor het KvK-nummer een
   verwijzing naar kvk.nl. Statements zonder bron worden eerder betwist.
8. Controleer alles en sla op. Het item krijgt automatisch een Q-nummer (bv. `Q12345678`).

## Na aanmaak — noteer en koppel
- Noteer het toegekende **Q-nummer** hieronder zodra het item live is:
  ```
  Wikidata Q-ID: Q________
  ```
- Voeg de Wikidata-item-URL (`https://www.wikidata.org/wiki/Q________`) toe aan de
  `sameAs`-array van het Organization JSON-LD in **`src/layouts/BaseLayout.astro`**. Dit
  sluit de entiteit-loop: site → Wikidata → site.
- Optioneel: vermeld het Q-nummer ook in `public/llms-full.txt` onder Bedrijfsinformatie.

> Geen claims toevoegen die niet uit een echte bron blijken. Awards, omzet, werknemersaantallen
> en klantnamen alleen invoeren als er een publieke, verifieerbare bron voor is.
