# Baseline — before "Uit het donker" (captured 2026-06-22, branch feat/uit-het-donker)

## Stack (live)
- Astro ^4.16.18, output: static, compressHTML, prefetch viewport.
- @astrojs/tailwind ^5.1.4, tailwindcss ^3.4.17.
- Fonts: @fontsource-variable/inter (Inter Variable) — self-hosted, set as tailwind fontFamily.sans.
- GrowthBook ^1.6.5, @astrojs/sitemap (static sitemap workaround), basicSsl dev HTTPS.
- NO React, three, R3F, gsap, lenis, web-vitals installed (greenfield adds).

## Brand (live tailwind.config.mjs — authoritative, "never recolor")
- navy #0F172A · pearl #F1F5F9 · midnight #0B1120
- accent sequence: brand.indigo #4338CA -> rose #E11D48 -> amber #D97706 -> emerald #047857
- theme-color meta: #FFFFFF (light) / #0B1120 (dark). Site is predominantly LIGHT.

## Existing motion (BaseLayout.astro)
- `.reveal` IntersectionObserver (reduced-motion aware) — already present, no gsap.
- `[data-counter]` count-up animation.
- No smooth-scroll (lenis would be new).

## Live integrations to NOT break (spec 1.2 / DoD #15)
- ElevenLabs ConvAI widget (`<elevenlabs-convai>` + attachShadow branding-hide intercept).
- Cookie consent banner (`aanloop_cookie_consent` localStorage), Consent Mode v2, GTM lazy-load.
- ExitIntentModal, sticky mobile CTA bar, RelatedLinks, breadcrumb nav, skip-link `#main`.
- Meta Pixel / LinkedIn Insight / Clarity (consent-gated, ID placeholders).

## KvK
- Was 56312075 in 110 src/+public files. Swapped -> 88606902 (Phase 0, confirmed canonical M 2026-06-22). Source grep = 0.

## Lighthouse / CWV baseline
- DEFERRED: requires `npm run build` + serve + lighthouse run. To capture before any visual change
  (none made yet — only KvK string + env + task docs so far, zero visual/CSS impact).

## SEO snapshot to diff later
- robots.txt + public/sitemap.xml + per-template canonical (BaseLayout builds canonical/hreflang).
- TODO: snapshot these files' current bytes before Phase 1 visual work.
