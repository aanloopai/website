// Uit het donker — site-wide smooth scroll (light theme, no visual change).
// No gsap: the gsap/ScrollTrigger hero-progress wiring belongs to Phase 3 (frozen).
// Reduced-motion -> native scroll (never inits). Astro lifecycle-safe + MPA fallback.
import Lenis from 'lenis';

const prefersReduced = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis: Lenis | null = null;
let rafId = 0;

function raf(time: number): void {
  lenis?.raf(time);
  rafId = requestAnimationFrame(raf);
}

function init(): void {
  if (prefersReduced() || lenis) return;
  lenis = new Lenis({
    lerp: 0.1,
    duration: 1.2,
    wheelMultiplier: 1,
    smoothWheel: true,
    // touch keeps native scrolling for best mobile INP
    smoothTouch: false,
  });
  rafId = requestAnimationFrame(raf);
}

function dispose(): void {
  if (rafId) cancelAnimationFrame(rafId);
  rafId = 0;
  lenis?.destroy();
  lenis = null;
}

// Astro View Transitions lifecycle (no-op if VT is off — fires only with the router).
document.addEventListener('astro:page-load', init);
document.addEventListener('astro:before-swap', dispose);

// MPA fallback (this site has no <ViewTransitions/>; page-load may not fire).
if (document.readyState !== 'loading') init();
else document.addEventListener('DOMContentLoaded', init);
