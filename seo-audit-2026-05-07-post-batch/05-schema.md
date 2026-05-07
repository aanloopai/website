# Schema Markup — Audit Sessie-24 Post-Batch

**Baseline (sessie-23):** 89/100

## Top schema-types in src/pages (post-batch)

| Type | Count |
|------|-------|
| Organization | 103 |
| Thing | 85 |
| SpeakableSpecification | 81 |
| ImageObject | 59 |
| Answer | 52 |
| Person | 50 |
| Article | 49 |
| Question | 43 |
| WebPage | 36 |
| OpeningHoursSpecification | 30 |
| PostalAddress | 29 |
| LocalBusiness | 28 |
| GeoCoordinates | 28 |
| City | 28 |
| Offer | 27 |
| Country | 21 |
| BusinessAudience | 11 |
| Service | 10 |
| ListItem | 10 |
| FAQPage | 10 |

**HowTo: 0** ✓ (was 27 pre-batch, alle verwijderd via Track A)
**HowToStep: 0** ✓ (231 occurrences pre-batch verdwenen)

## Schema-quality delta (Track A)

Pre-batch totaal HowTo + HowToStep refs: 258
Post-batch: 0

Voordeel: deprecated Google-rich-result-type weggehaald → minder schema-spam-flag-risico, schoner JSON-LD output. Alle blijvende schemas (Article, FAQPage, Speakable, Organization, Person) zijn AI-citatie-relevante types.

## JSON-LD validatie

Build clean (198 pages, 0 errors) → impliciet syntax-validate via Astro renderer.
Geen orphan-references naar `howToSchema` constant (sessie-24 codemod-grep `howToSchema` = 0 hits).

## Speakable + Article coverage

- Speakable schema: 81 SpeakableSpecification + 197/197 pages (sessie-18 codemod blijft intact)
- Article schema: 49 instances + Person-schema voor founder Mustafa Agah Dogan
- ArticleSection codemod: 84/84 kennisbank pages (sessie-20)

## Score

**05-schema: 92/100** (+3 vs 89/100)

- **+3:** HowTo-pollution weggehaald → schema-quality-lift, alleen AI-relevante types over
- **Gap (−8):** Service-schema underused (10 vs verwachte 15+ voor 14 diensten); ProfessionalService-niche-types nog niet gebruikt
