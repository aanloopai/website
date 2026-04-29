# Aanloop AI — Website

Professionele B2B website voor Aanloop AI, gebouwd met Astro + Tailwind CSS.

## Technologie

- **Framework**: [Astro](https://astro.build/) v4
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v3 + custom design system
- **Fonts**: Inter Variable (via @fontsource-variable)
- **Taal**: Nederlands (nl)

## Lokale ontwikkeling

```bash
npm install
npm run dev        # Start dev server op http://localhost:4321
npm run build      # Bouw productie-site in /dist
npm run preview    # Preview de productie-build
```

## Projectstructuur

```
src/
├── components/     # Header, Footer, Hero, ServiceCard, SectorCard
├── layouts/        # BaseLayout (SEO, schema.org, fonts)
├── pages/          # Alle pagina's
│   ├── diensten/   # Marco, Emma, Telefoon, Custom, Audit
│   ├── sectoren/   # Horeca, Logistiek, Vastgoed, Detailhandel, Zakelijk, Zorg
│   ├── index.astro
│   ├── contact.astro
│   ├── cases.astro
│   ├── over.astro
│   ├── tarieven.astro
│   ├── werkwijze.astro
│   ├── privacy.astro
│   ├── voorwaarden.astro
│   └── cookies.astro
├── styles/
│   └── global.css  # Design system, animaties, cookie banner
public/
├── brand/          # Logo SVG bestanden
├── favicon-32.png
└── apple-touch-icon.png
```

## Features

- ✅ Scroll-reveal animaties
- ✅ ROI calculator (homepage)
- ✅ Testimonials carousel
- ✅ Cookie consent banner
- ✅ Scroll progress bar
- ✅ Typing animation in hero
- ✅ Mobile-responsive nav met hamburger menu
- ✅ Schema.org JSON-LD (Organization + LocalBusiness)
- ✅ Open Graph / Twitter cards
- ✅ Canonical URLs
- ✅ WCAG AA toegankelijkheid (skip-links, focus rings, aria)
- ✅ 22 pagina's volledig uitgewerkt

## Merk

Gebaseerd op de [Brand Identity Kit](./BRAND-GUIDELINE.md):
- **Navy** `#0F172A` — primaire tekst
- **Indigo** `#4338CA` — accent 1
- **Rose** `#E11D48` — accent 2  
- **Amber** `#D97706` — accent 3
- **Emerald** `#047857` — accent 4

## Deployment

Klaar voor Cloudflare Pages:
- Build command: `npm run build`
- Output directory: `dist`
- Node.js versie: 18+
