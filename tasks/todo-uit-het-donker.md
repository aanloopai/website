# Uit het donker — execution todo (v4 GODMODE)

> Separate from `tasks/todo.md` (that file is the social-media automation backlog — DO NOT overwrite it).
> Branch: `feat/uit-het-donker`. Prove before checking. No deploy without M.
> Spec: pasted v4 GODMODE (2026-06-22). Hero PARTIALLY OVERRIDDEN by missing `AANLOOPAI_EMMA_CONSOLIDATION_AND_HERO_v1.md`.

## Phase 0 setup
- [x] branch feat/uit-het-donker
- [x] .env PUBLIC_ENABLE_3D=false (kill switch, default off)
- [x] tasks docs (this file + lessons + baseline)
- [x] **KvK 56312075 -> 88606902** across src/ + public/ (110 files, source grep = 0). dist gate PASSED (build green, 249 pages, dist grep 56312075 = 0; 88606902 in 237 files). Confirmed canonical = 88606902 (M, 2026-06-22). Also swept 23 non-deploy docs (marketing/docs/etc) -> repo-wide old KvK = 0.
- [ ] Lighthouse + conversion baselines -> tasks/baseline.md (deferred — needs build/serve)
- [ ] sitemap/robots/canonical snapshot
- [ ] React19/R3F gate + §3.2 install -> **DEFERRED to Phase 3** (only the hero consumes three/R3F; hero is frozen pending override doc). gsap/lenis/web-vitals install moves to Phase 2.

## Phase 1 design system + KvK
- [x] KvK swap (done in Phase 0)
- [ ] **BLOCKED — needs M decision:** brand-hex + light-vs-dark conflict (see lessons). tokens.css/ambient.css NOT written until resolved.
- [ ] fonts: KEEP Inter (live `@fontsource-variable/inter`). NO Clash Display/General Sans (spec §4.1 rule: match live font).
- [ ] layout wiring (only after tokens decision)
- [ ] restyle header/footer/buttons (only after tokens decision)

## Phase 2 motion  — DONE (light-only, M chose "keep light + add motion")
- [x] install lenis only (1.3.23). gsap/web-vitals NOT installed: gsap = hero-progress (Phase 3, frozen); reveal already exists; web-vitals RUM = optional/Phase 8.
- [x] `src/components/motion/lenis.client.ts` (no gsap) + `lenis.css` + wired in BaseLayout (css import + module script).
- [x] did NOT duplicate existing `.reveal` IntersectionObserver / counter anims.
- [x] build green (249 pages), lenis bundled (hoisted.*.js), KvK still clean in dist.
- [x] Playwright verify: lenis class present (normal), absent (reduced-motion), skip-link `#main` intact, ElevenLabs widget intact, 0 console errors.
- DROPPED from spec: dark tokens.css / ambient.css / scroll-store (hero) / dark restyle — M chose light.

## Phase 3 hero island — FROZEN
- [ ] WAIT for `AANLOOPAI_EMMA_CONSOLIDATION_AND_HERO_v1.md` (Emma-character + WebGL aura hero, NOT abstract agent-mesh). Do not build until M supplies it.
- [ ] then: install React19 + R3F + drei + postprocessing, build hero per override doc.

## Marco -> Emma consolidation (M directive 2026-06-22: NO Marco anywhere; Emma = umbrella)
Decisions locked:
- Emma = single OMNICHANNEL agent (telefoon + WhatsApp + workflow — absorbs Marco's receptionist identity).
- `/diensten/marco/` -> **301 to /diensten/emma/** (delete marco.astro, repoint 105 internal links).
- Voice widget: SAME ElevenLabs agent-id (`agent_9701…`), relabel Marco->Emma. `MarcoLiveDemo.astro` -> `EmmaLiveDemo.astro`.
- Comparison pages **DELETE + 301 -> /diensten/emma/**: marco-vs-emma, marco-vs-voiceflow, marco-vs-make-com-voice, marco-emma-lite-genoeg (4 files).
- pricing.ts: **BLOCKED — M writing new tier/price structure himself.** Current €49/197/497/997 + "Marco+Emma €997" bundle to be replaced. Most price-bearing copy depends on this -> do NOT touch until M delivers.

Scope: ~1515 "Marco"/"marco"/"MARCO" across 179 files. Blind sed FORBIDDEN (would yield "Emma+Emma", "Emma vs Emma", broken prices). OG `public/og/marco.png` + 8 social-feed `*marco*` assets to rename/regen.

Execution plan (ONE atomic pass, AFTER M delivers pricing):
1. pricing.ts new structure -> single source.
2. delete marco.astro + 4 comparison pages; add 301s to public/_redirects.
3. rewrite copy site-wide Marco->Emma (omnichannel framing; fix bundles "Website+Marco+Emma"->"Website+Emma"; "Marco(telefoon)+Emma(WhatsApp)"->Emma omnichannel).
4. MarcoLiveDemo -> EmmaLiveDemo (keep agent-id); repoint 3 usages (index, ai-receptionist-nederland, [marco.astro deleted]).
5. BaseLayout ogSlugMap marco->emma; rename OG + social-feed assets.
6. rebuild -> verify `grep -ri marco dist/` = 0 (excl legit non-brand if any); 301s resolve; no broken img/links; emma page covers receptionist content.
STATUS: **DONE 2026-06-22.** New Emma ladder (M-approved): Start €99 / Core €249 / Pro €497 / Enterprise op aanvraag, setup €0.
Executed: pricing.ts rewritten (+ legacy PORTAL_* so Mollie/D1 checkout unchanged); tarieven.astro + emma.astro
rewritten to omnichannel (via subagents); marco.astro + 4 comparison pages deleted; 301s in _redirects;
~1515 Marco->Emma sweep (capitalized) + entangled-phrase fixes + "Emma of Emma" dedup; MarcoLiveDemo->EmmaLiveDemo;
intake-schemas EMMA collision fixed; sectoren [sector] service-keys marco->emma+dedup; BaseLayout ogSlugMap +
priceRange €99; sitemaps regenerated + image-sitemap/ manifest cleaned; orphan og/marco.png removed.
Build green (244 pages). **0 visible "Marco"/"MARCO" in dist.** Remaining lowercase "marco" = internal-only
(D1 product key, data-score/id attrs, marco_live_demo analytics event, social-feed image filenames) — not user-visible.

OPEN follow-ups (flagged, not blocking):
- Portal/Mollie catalog: display is Emma-branded but tier `naam` (Starter/Groei/Lite/Standard) + prices are LEGACY
  (D1-bound, checkout-critical). Migrating portal to the new €99/249/497 ladder needs M + a data migration.
- Cosmetic: rename internal ids `marco-live-*` + analytics event `marco_live_demo` + social-feed `*marco*.png` filenames.
- Cold-page copy: generic Marco->Emma may leave a few stylistically-awkward sentences in long kennisbank articles
  (no "Marco" remains; just occasional phrasing worth a human polish pass).

## Phase 4 audio (optional) / Phase 5 key pages / Phase 6 hardening / Phase 7 gates / Phase 8 deploy
- [ ] per spec, after hero unfreezes.

## Review
- (fill after each phase)
