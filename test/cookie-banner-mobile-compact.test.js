// De cookiebanner bedekte op mobiel (~250px hoog) de hero-CTA's "Boek een gratis
// demo" en "WhatsApp ons" tot de bezoeker klikte. Playwright-meting 2026-09-16 op
// 375×812: banner-top 718px, CTA-onderkant 669px → geen overlap, banner ~80px.
// Deze test vergrendelt de compacte mobiele variant zodat een goedbedoelde
// "opschoning" van de Tailwind-klassen de overlap niet stilletjes terugbrengt.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const footer = readFileSync(new URL('../src/components/Footer.astro', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles/global.css', import.meta.url), 'utf8');
const banner = footer.slice(footer.indexOf('id="cookie-banner"'), footer.indexOf('</div>\n</div>', footer.indexOf('id="cookie-banner"')));

describe('Cookiebanner — compact op mobiel', () => {
  it('icoon en titel zijn onder md verborgen (titel blijft aria-labelledby-naam)', () => {
    expect(banner).toMatch(/class="hidden md:flex[^"]*"[^>]*aria-hidden="true">🍪/);
    expect(banner).toMatch(/id="cookie-banner-title" class="hidden md:block/);
    expect(banner).toContain('aria-labelledby="cookie-banner-title"');
  });

  it('padding, tekst en knoppen zijn op mobiel krapper dan op desktop', () => {
    expect(banner).toMatch(/rounded-t-lg md:rounded-lg shadow-2xl p-3 md:p-6/);
    expect(banner).toMatch(/text-\[11px\] md:text-xs/);
    expect(banner).toMatch(/mt-2 md:mt-4 flex flex-wrap/);
    expect(banner).toMatch(/id="cookie-accept" class="[^"]*py-1\.5 md:py-2/);
    expect(banner).toMatch(/id="cookie-necessary" class="[^"]*py-1\.5 md:py-2/);
  });

  it('lange uitleg is alleen op desktop zichtbaar, mobiel toont "Meer info"', () => {
    expect(banner).toMatch(/<span class="hidden md:inline"> om uw ervaring te verbeteren<\/span>/);
    expect(banner).toMatch(/<span class="md:hidden">Meer info<\/span>/);
  });

  it('banner staat op mobiel tegen de onderrand op volle breedte', () => {
    const mobile = css.slice(css.indexOf('@media (max-width: 767px) {\n    #cookie-banner'));
    expect(mobile).toMatch(/#cookie-banner \{\s*bottom: 0;\s*width: 100vw;/);
  });
});
