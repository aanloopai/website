import emmaWhatsapp from '../assets/images/emma-whatsapp.png';

// Single source of truth voor de hero-afbeelding op de homepage.
//
// Twee plekken gebruiken dit: het <picture>-blok in components/Hero.astro en de
// LCP-preload in layouts/BaseLayout.astro. Die twee MOETEN identieke opties
// hebben — wijken ze af, dan levert de preload een tweede download op in plaats
// van een snellere eerste. Vandaar dat de opties hier staan en niet twee keer
// los in de componenten.
//
// 2026-08-11 clarity redesign: was een abstracte "AI-golven op telefoon"
// stockgrafiek — toonde het product niet, gaf bezoekers geen idee wat Emma
// doet. Vervangen door dezelfde WhatsApp-gespreksmockup die al op
// /diensten/emma/ staat: laat in één oogopslag zien dat Emma een echt gesprek
// voert. Zelfde 1024×1024 bronformaat, dus geen aanpassing aan widths/sizes
// nodig om layout shift te voorkomen.
export const HERO_IMAGE = emmaWhatsapp;

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
