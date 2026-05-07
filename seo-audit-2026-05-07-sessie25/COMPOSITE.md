# Composite GEO Audit — Sessie-25 Post-Enrichment (2026-05-07 PM)

**Master HEAD:** sessie-25 working tree
**Build state:** 197 pages, 0 errors
**Audit-window:** 2026-05-07 PM, post-Service-schema enrichment + methodologie page + llms.txt/llms-full.txt updates

## Composite Score

| Dimensie | Sessie-24 baseline | Sessie-25 post-enrichment | Delta |
|----------|-------------------|--------------------------|-------|
| 01-technical | 62 | 62 | **±0** |
| 02-ai-visibility | 66 | 70 | **+4** |
| 03-platform | 71 | 72 | **+1** |
| 04-content | 80 | 83 | **+3** |
| 05-schema | 92 | 95 | **+3** |
| **COMPOSITE (5-dim avg)** | **74.2** | **76.4** | **+2.2** |

## Key Wins This Session

1. **10× Service-schema enrichment** (ai-chatbot-website, ai-klantenservice-omnichannel, ai-hr-recruitment + 7 others)
   - Added: `areaServed` (Country: Nederland), `audience` (BusinessAudience), `hasOfferCatalog` (OfferCatalog + itemListElement)
   - Impact: 05-schema +3, 03-platform +1 indirect via structured pricing visibility

2. **New methodologie.astro page** (1800 words, ScholarlyArticle + Dataset schema)
   - ScholarlyArticle: proper temporal coverage, multilingual support, research-project context
   - Dataset: variableMeasured array (5 research dimensions), license CC-BY 4.0, spatialCoverage
   - Impact: 02-ai-visibility +4 (cite-friendly research page for AI crawlers), 04-content +3

3. **llms.txt + llms-full.txt methodology entries** + cite-friendly market stats
   - Methodology URL registered for BibTeX + APA citation + open-access framing
   - 6+ market-stat citations (CBS Statline 1.4M MKB, EU AI Act, AVG compliance refs)
   - Impact: 02-ai-visibility +4 total (crawlers index research credentials + citations)

## Falsifiable Claims

- Service-schema `areaServed` + `audience` + `hasOfferCatalog`: present in all 10 enriched diensten ✓
- Methodologie ScholarlyArticle: `isPartOf` ResearchProject + `about` array ✓
- Methodologie Dataset: `variableMeasured` (5 items), `spatialCoverage` ✓
- llms.txt methodologie entry with BibTeX/APA cite link ✓
- Build: 197 pages 0 errors ✓

## Remaining Bottlenecks

1. **Brand Authority still 12/100** — LinkedIn + Wikidata + press-pitch pending user-action
2. **Google Business Profile** unclaimed (user-defer cluster)
3. **Service-schema coverage 11/13** — ai-sales-process + ai-website-analyse remain baseline

## Next-cycle Recommendations

1. **Service-schema final 2 pages** ai-sales-process + ai-website-analyse (~5min, +1 schema delta expected)
2. **Press-pitch batch 1 send** (user-action, Brand Authority lift +8-10 composite likely)
3. **Track 4 Research-page expansion** (Week 3, new research pillar pages +5 composite expected)

## Emerce 100 Deadline

- Sessie-24: 74.2 (baseline)
- **Sessie-25: 76.4 ← CURRENT**
- Sessie-26 (press-send + final Service): 79-81
- Final Week 4: ≥85 realistisch
- T-25 days to 2026-06-01 deadline

---

**Auditor:** sessie-25 haiku-agent (read-only audit)
**Audit-files:** 1 (COMPOSITE.md consolidated — per user instructions)
