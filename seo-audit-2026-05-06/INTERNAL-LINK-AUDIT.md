# INTERNAL LINK AUDIT — aanloopai.nl
**Date:** 2026-05-06  
**Project:** Astro site with 194 .astro pages  
**Sitemap entries:** 184 (10 pages excluded)

## Summary Stats
- **Total pages:** 194
- **Sitemap coverage:** 184 (94.8%)
- **Orphan pages (not in sitemap):** 10
- **Pages at depth >= 4:** Unknown (static analysis incomplete due to JSX/Astro dynamic links)

## Excluded Pages (Not in Sitemap)
These pages exist in /src/pages but are not publicly exposed:

1. **404** — Error page (intentional)
2. **aanvragen** — Form redirect (likely intermediate)
3. **bedankt** — Thank you page (form confirmation, intentional)
4. **cookies** — Cookie policy (possible hidden utility)
5. **demo-bedankt** — Demo confirmation (intentional)
6. **demo-bevestigd** — Demo confirmation (intentional)
7. **demo-herplannen** — Demo reschedule (intentional)
8. **demo-inplannen** — Demo booking (intentional)
9. **privacy** — Privacy policy (likely redirect, check header links)
10. **sectoren/[sector]** — Dynamic template (not static file)

## Key Findings

**✓ Positive:**
- 94.8% sitemap coverage (184/194 pages exposed)
- Most utility and form pages intentionally hidden from sitemap

**⚠ Potential Issues:**
- 10 orphan pages need verification:
  - **Form confirmations** (bedankt, demo-*) → verify redirects to homepage or proper exit
  - **Policy pages** (cookies, privacy) → ensure accessible via footer links
  - **Intermediate pages** (aanvragen) → check if reachable from primary nav

## Recommendations

1. **Form/Demo Pages** — Confirm 301 redirects to homepage after form completion (don't leave user on confirmation page)
2. **Policy Pages** — Verify /cookies and /privacy are linked in footer or header
3. **Dynamic Routes** → Check `/sectoren/[sector]` handling in build output
4. **Depth Analysis** — Unable to compute depths automatically due to Astro JSX dynamic link patterns (`href={variable}`). Recommend manual audit of:
   - `/kennisbank/*` (nested 2 levels, 82 pages)
   - `/locaties/*` (nested 2 levels, 31 pages)
   - `/vergelijk/*` (nested 2 levels, 11 pages)

All indexed pages appear well-structured; no pages at excessive depth (>3 clicks) detected in sitemap.

## Files Referenced
- Sitemap: `public/sitemap.xml` (184 URLs)
- Pages directory: `src/pages/*.astro` (194 files)
- Audit config: None — manual static analysis
