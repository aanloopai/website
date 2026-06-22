# Uit het donker — lessons / decisions log

## 2026-06-22 — Phase 0

### Spec vs live-repo conflicts found (executor must NOT silently resolve — §0.2)

1. **Brand hex mismatch.** Spec §4.0 "official press-kit" palette ≠ live `tailwind.config.mjs`
   (which is the real production source of truth and is commented "never recolor or reorder"):
   | token    | spec     | live prod |
   |----------|----------|-----------|
   | navy     | #0F1E3D  | #0F172A   |
   | pearl    | #F4F6FA  | #F1F5F9   |
   | midnight | #0B1220  | #0B1120   |
   | indigo   | #4F46E5  | #4338CA   |
   Live also has rose/amber/emerald accents; spec says "only six, no teal".
   → **RESOLVED 2026-06-22 by repo's own `BRAND-GUIDELINE.md` (April 2026, §2 + §7 CSS):**
   official palette = navy #0F172A, pearl #F1F5F9, indigo #4338CA, rose #E11D48, amber #D97706,
   emerald #047857, midnight #0B1120 — EXACTLY the live tailwind.config. The spec §4.0 "press-kit"
   hexes are FABRICATED/wrong. Live + BRAND-GUIDELINE win. No M question needed on palette.
   Any tokens.css must use these values (and is only justified as a bridge for the non-Tailwind
   WebGL/ambient layer; the Tailwind site already has them).

2. **Light vs dark.** Live site is predominantly LIGHT (bg-white, navy-on-white, slate).
   Spec assumes a dark "uit het donker" aesthetic (Midnight bg, Pearl text, ambient grain).
   That is a full visual redirection of a ranking #1 site → M decision, not executor's.

3. **Font.** Live = Inter Variable (`@fontsource-variable/inter`), deliberate, set in tailwind
   fontFamily.sans. Spec §4.1 own rule: match the live font. → KEEP Inter. Do NOT add
   Clash Display / General Sans. Skip the font-download step entirely.

### Sequencing deviations (low-risk, recorded)

4. **3D stack install deferred.** Spec Phase 0 installs the full R3F set. But the ONLY consumer
   (the hero island) is frozen pending the missing override doc. Installing React 19 + three +
   R3F + postprocessing into a live Tailwind/Astro site now = pure risk for dead code.
   → Defer React/three/drei/postprocessing to Phase 3 (hero unfreeze). Move gsap/lenis/web-vitals
   (site-wide motion, no React) to Phase 2.

5. **tasks/todo.md already taken.** Holds the social-media automation backlog. Spec said create
   tasks/todo.md verbatim. → Created `tasks/todo-uit-het-donker.md` instead. Never overwrite.

6. **KvK swap done.** 56312075 -> 88606902 across 110 files in src/ + public/ (and 23 more
   non-deploy docs in marketing/docs/etc -> repo-wide old = 0). Confirmed each occurrence was the
   standalone 8-digit KvK (incl. mollie.js / worker.js / admin-routes invoice footers, BaseLayout
   Organization schema, footer trust strip, llms.txt). dist gate PASSED.
   **NOTE — flip-flop:** 88606902 is the CONFIRMED canonical (M, 2026-06-22), reversing a prior
   2026-06-12 switch to 56312075. Do NOT flip back. If doubt: verify KvK.nl.

### Repo hygiene (from memory)

- This repo's working tree is ALWAYS dirty (OneDrive). NEVER `git add -A`. Stage only own files explicitly.
- OneDrive Edit-race: bulk text ops via `sed -i`, verify with `git grep`/`grep`.
- Push only via `aanloopai` gh account. No push / no deploy without M's explicit approval.
