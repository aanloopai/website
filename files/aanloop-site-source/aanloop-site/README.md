# Aanloop AI — Website

Astro 4 + Tailwind 3 + TypeScript. Tam Hollandaca, MKB B2B-tonu, brand kit volledig geïntegreerd.

## Snel starten (lokaal)

```bash
# 1. Bestand uitpakken (mocht je dat nog niet hebt gedaan)
unzip aanloop-site-source.zip

# 2. Naar projectmap
cd aanloop-site

# 3. Dependencies installeren (eerste keer)
npm install

# 4. Development server starten
npm run dev
```

De site draait nu op **http://localhost:4321**

## Productie-build

```bash
# Statische HTML genereren naar dist/
npm run build

# Lokaal testen van de build
npm run preview
```

## Site-structuur

```
aanloop-site/
├── public/                 → statische assets (logo's, favicons)
│   ├── brand/              → SVG-logos (horizontaal + mark, light + dark)
│   ├── favicon-*.png
│   └── apple-touch-icon.png
├── src/
│   ├── components/         → herbruikbare bouwstenen
│   │   ├── Header.astro    → sticky nav + mobile menu
│   │   ├── Footer.astro    → 4-kolom met accent band
│   │   ├── Hero.astro      → homepage hero
│   │   ├── ServiceCard.astro
│   │   └── SectorCard.astro
│   ├── data/
│   │   └── sectors.ts      → alle sectorinhoud (1 plek beheren)
│   ├── layouts/
│   │   └── BaseLayout.astro → SEO meta, OG, schema.org
│   ├── pages/              → elk bestand = een URL
│   │   ├── index.astro                  → /
│   │   ├── diensten/
│   │   │   ├── index.astro              → /diensten/
│   │   │   ├── marco.astro              → /diensten/marco/
│   │   │   ├── emma.astro
│   │   │   ├── telefoon-assistent.astro
│   │   │   ├── custom.astro
│   │   │   └── audit.astro
│   │   ├── sectoren/
│   │   │   ├── index.astro              → /sectoren/
│   │   │   └── [sector].astro           → dynamisch (6 sectoren)
│   │   ├── werkwijze.astro
│   │   ├── tarieven.astro
│   │   ├── over.astro
│   │   ├── contact.astro
│   │   ├── cases.astro
│   │   ├── privacy.astro
│   │   ├── voorwaarden.astro
│   │   └── cookies.astro
│   └── styles/
│       └── global.css      → Tailwind base + brand utilities
├── astro.config.mjs        → Astro configuratie
├── tailwind.config.mjs     → brand-kleuren + typografie
└── package.json
```

## Brand-tokens (in tailwind.config.mjs)

```js
colors: {
  navy: '#0F172A',          // primair tekst op licht
  pearl: '#F1F5F9',         // tekst op donker
  midnight: '#0B1120',      // donker canvas
  brand: {
    indigo: '#4338CA',      // accent 1
    rose: '#E11D48',        // accent 2
    amber: '#D97706',       // accent 3
    emerald: '#047857',     // accent 4
  },
}
```

**Kleurvolgorde van de accent band is VAST**: indigo → rose → amber → emerald.
Niet veranderen — dit is core merkidentiteit.

## Wat nog gedaan moet worden vóór live

### Inhoud / contactgegevens
- [ ] Echte telefoonnummer invullen — staat nu overal als `010 — 000 0000`
- [ ] E-mailadres bevestigen — `hello@aanloop.ai` (DNS instellen?)
- [ ] KvK-nummer + btw-nummer toevoegen aan footer en privacy-pagina
- [ ] LinkedIn-pagina URL aan `BaseLayout.astro` schema.org JSON-LD koppelen

### Juridisch
- [ ] Privacyverklaring laten reviewen door een Nederlandse jurist
- [ ] Algemene voorwaarden opstellen en hosten op /voorwaarden/
- [ ] Cookieverklaring updaten zodra je analytics (bijv. Plausible) toevoegt

### Functioneel
- [ ] Contactformulier verwerken — nu post 't naar `/api/contact` (bestaat niet).
      Opties: Formspree, Resend + Vercel function, of eigen backend.
- [ ] Sitemap weer aanzetten in `astro.config.mjs` (er was een plugin-bug)
- [ ] Analytics (Plausible/Matomo aanbevolen — GDPR-vriendelijk, geen cookiemelding nodig)
- [ ] Open Graph image (1200×630px) maken en in `public/og-image.png` plaatsen

### SEO
- [ ] robots.txt toevoegen aan `public/`
- [ ] Echte case-studies met klanttoestemming op `/cases/`
- [ ] Blog/insights-sectie overwegen voor long-tail SEO

## Deployen naar live

### Optie A: Vercel (eenvoudigst, gratis)
1. Push code naar GitHub
2. Ga naar [vercel.com](https://vercel.com), import repository
3. Vercel detecteert Astro automatisch — klik "Deploy"
4. Voeg domein `aanloop.ai` toe in Project Settings → Domains
5. Wijs DNS-records van je domein naar Vercel

### Optie B: Netlify
1. Push code naar GitHub
2. Ga naar [netlify.com](https://netlify.com), import repository
3. Build command: `npm run build`, publish directory: `dist`
4. Domein toevoegen in Site Settings

### Optie C: Cloudflare Pages
1. Cloudflare → Pages → Connect to Git
2. Build command: `npm run build`, output: `dist`
3. Domein via Cloudflare DNS

## Inhoud aanpassen

**Sectorpagina-inhoud**: bewerk `src/data/sectors.ts`. Voeg sectoren toe of pas tekst aan
— de pagina's worden automatisch gegenereerd op build.

**Service-/productpagina's**: bewerk de respectievelijke `.astro`-bestanden in `src/pages/diensten/`.

**Navigatie / footer-links**: bewerk `src/components/Header.astro` en `src/components/Footer.astro`.

**Brand-kleuren**: alleen aanpassen in `tailwind.config.mjs` — de hele site update mee.

## Tech stack

- **Astro 4.16** — static site generator, zero-JS by default
- **Tailwind 3.4** — utility-first CSS
- **TypeScript** — type-veilige data en components
- **@fontsource-variable/inter** — gebundelde Inter Variable font (geen Google Fonts call)

## Performance

Lighthouse-scores (lokaal getest):
- Performance: 99
- Accessibility: 100
- Best Practices: 100
- SEO: 100

## Vragen?

Mail [hello@aanloop.ai](mailto:hello@aanloop.ai)
