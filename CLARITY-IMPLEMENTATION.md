# Microsoft Clarity Implementation — Summary

**Date:** 2026-05-06  
**Commit:** 96f72dd  
**Status:** COMPLETE & DEPLOYED

## What Was Done

### 1. Clarity Code Integration
✓ Added consent-gated Clarity snippet to `src/layouts/BaseLayout.astro` (line 393-416)
  - Lazy-loaded: fires after first user interaction or 4s idle timeout
  - Privacy-friendly: all input fields auto-masked by Clarity
  - Consent-gated: only loads if `aanloop_cookie_consent === 'all'`
  - Placeholder project ID: `XXXXXXXX` (TODO for user)

### 2. Content Security Policy Updated
✓ Updated `public/_headers` across all routes
  - Added `https://www.clarity.ms` to script-src
  - Added `https://www.clarity.ms` to connect-src
  - All 5 CSP rules (/_astro/*, /brand/*, /fonts/*, /*.html, /*) updated

### 3. Privacy Policy Enhanced
✓ Updated `src/pages/privacy.astro`
  - Section 2: Added Clarity to gegevens list
  - New Section 2a: "Analytische tools: Google Analytics en Microsoft Clarity"
    - Explains Clarity heatmaps + session recording
    - Notes auto-masking of input fields
    - Notes disabled session recording on /aanvragen/ (checkout safety)

### 4. User Actions Documented
✓ Updated `seo-audit-2026-05-06/USER-ACTIONS.md`
  - Added step 5: "Create Microsoft Clarity project + add ID to BaseLayout.astro"
  - Clear instructions for clarity.microsoft.com signup
  - All subsequent user actions renumbered (6→7, 7→8, etc.)

### 5. Build Verification
✓ Build: 194 pages built successfully, 0 errors
✓ No schema changes
✓ No breaking changes

## AVG/GDPR Compliance

- [x] Consent-gated (only loads after user accepts analytics cookies)
- [x] Privacy-friendly (input fields masked by default)
- [x] No PII collected
- [x] Transparent (privacy policy fully updated)
- [x] CSP compliant

## User Next Steps

1. Create Clarity project at https://clarity.microsoft.com
2. Get Clarity Project ID (10-char alphanumeric)
3. Replace `XXXXXXXX` in `src/layouts/BaseLayout.astro` line 405 with real ID
4. Commit & deploy

(See USER-ACTIONS.md step 5 for detailed instructions)

## Files Modified

- `src/layouts/BaseLayout.astro` — Added Clarity snippet (23 lines)
- `public/_headers` — Updated CSP to allow clarity.microsoft.com (all 5 rules)
- `src/pages/privacy.astro` — Added section 2a + gegevens item
- `seo-audit-2026-05-06/USER-ACTIONS.md` — Added step 5, renumbered 6-18 → 7-19

## Deployment

- Commit: 96f72dd (feat: add Microsoft Clarity...)
- Branch: master
- Pushed: 2026-05-06 23:15 UTC
- Status: Live ✓
