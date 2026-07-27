import heroAiAgent from '../assets/images/hero-ai-agent.png';

// Single source of truth voor de hero-afbeelding op de homepage.
//
// Twee plekken gebruiken dit: het <picture>-blok in components/Hero.astro en de
// LCP-preload in layouts/BaseLayout.astro. Die twee MOETEN identieke opties
// hebben — wijken ze af, dan levert de preload een tweede download op in plaats
// van een snellere eerste. Vandaar dat de opties hier staan en niet twee keer
// los in de componenten.
export const HERO_IMAGE = heroAiAgent;

export const HERO_IMAGE_OPTIONS = {
  widths: [400, 600, 900, 1200, 1400],
  sizes: '(min-width: 1024px) 40vw, 100vw',
  format: 'webp',
  quality: 88,
} as const;

// De hero staat op `hidden lg:block`. Onder 1024px is de h1 de LCP en hoort er
// geen byte aan beeld opgehaald te worden — daarom matcht de <source> alleen
// vanaf 1024px en valt de <img> terug op deze lege SVG (data-URI, geen request).
// Zelfde verhouding als het origineel (1024×1024), zodat er geen layout shift
// ontstaat op het moment dat de desktop-bron wel binnenkomt.
export const HERO_MEDIA = '(min-width: 1024px)';
export const HERO_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1024' height='1024'%3E%3C/svg%3E";
