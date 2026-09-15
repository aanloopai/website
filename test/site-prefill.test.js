// /start/ → "Uw website" → /api/intake/prefill. Onboarding-onderzoek 2026-09-15:
// 4 van de 5 AI-receptionist-aanbieders (Voicelabs, Dialzara, Rosie, Loekas)
// beginnen met het kazen van de eigen website van de klant en vullen het
// formulier vooraf in. Deze extractor is puur: HTML in, feiten uit, niets
// verzonnen — een veld dat niet op de pagina staat blijft leeg.
import { describe, it, expect } from 'vitest';
import { extractBusinessFacts, normalizeSiteUrl, isFetchableSiteUrl } from '../src/lib/site-prefill.js';

const HTML = `<!doctype html><html lang="nl"><head>
<title>Fysio De Brug | Fysiotherapie in Rotterdam-Zuid</title>
<meta property="og:site_name" content="Fysiotherapie De Brug">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Physiotherapy","name":"Fysiotherapie De Brug","telephone":"+31 10 123 45 67","openingHoursSpecification":[{"@type":"OpeningHoursSpecification","dayOfWeek":["Monday","Tuesday"],"opens":"08:00","closes":"18:00"}]}</script>
</head><body>
<a href="tel:+31101234567">010 - 123 45 67</a>
<p>KvK: 12345678 · BTW NL001234567B01</p>
</body></html>`;

describe('extractBusinessFacts', () => {
  it('haalt bedrijfsnaam uit og:site_name vóór <title>', () => {
    const f = extractBusinessFacts(HTML, 'https://fysiodebrug.nl/');
    expect(f.bedrijfsnaam).toBe('Fysiotherapie De Brug');
  });

  it('gebruikt JSON-LD name als og:site_name ontbreekt', () => {
    const html = HTML.replace(/<meta property="og:site_name"[^>]*>/, '');
    expect(extractBusinessFacts(html, 'https://fysiodebrug.nl/').bedrijfsnaam).toBe('Fysiotherapie De Brug');
  });

  it('valt terug op het eerste deel van <title> als og:site_name én JSON-LD ontbreken', () => {
    const html = HTML.replace(/<meta property="og:site_name"[^>]*>/, '').replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '');
    const f = extractBusinessFacts(html, 'https://fysiodebrug.nl/');
    expect(f.bedrijfsnaam).toBe('Fysio De Brug');
  });

  it('haalt het telefoonnummer uit een tel:-link en normaliseert naar +31', () => {
    const f = extractBusinessFacts(HTML, 'https://fysiodebrug.nl/');
    expect(f.telefoon).toBe('+31101234567');
  });

  it('haalt telefoon uit JSON-LD als er geen tel:-link is', () => {
    const html = HTML.replace(/<a href="tel:[^"]*">[^<]*<\/a>/, '');
    const f = extractBusinessFacts(html, 'https://fysiodebrug.nl/');
    expect(f.telefoon).toBe('+31101234567');
  });

  it('normaliseert een nationaal nummer 010-1234567 naar +31101234567', () => {
    const html = '<a href="tel:010-1234567">bel</a>';
    expect(extractBusinessFacts(html, 'https://x.nl/').telefoon).toBe('+31101234567');
  });

  it('haalt openingstijden uit openingHoursSpecification als leesbare regels', () => {
    const f = extractBusinessFacts(HTML, 'https://fysiodebrug.nl/');
    expect(f.openingstijden).toContain('Ma');
    expect(f.openingstijden).toContain('08:00');
    expect(f.openingstijden).toContain('18:00');
  });

  it('haalt het KvK-nummer (8 cijfers) uit de tekst', () => {
    expect(extractBusinessFacts(HTML, 'https://fysiodebrug.nl/').kvk).toBe('12345678');
  });

  it('verzint niets: lege pagina geeft lege velden, geen placeholders', () => {
    const f = extractBusinessFacts('<html><body>hoi</body></html>', 'https://leeg.nl/');
    expect(f.bedrijfsnaam).toBe('');
    expect(f.telefoon).toBe('');
    expect(f.openingstijden).toBe('');
    expect(f.kvk).toBe('');
  });

  it('strips HTML-entities en tags uit de naam en kapt op 120 tekens', () => {
    const html = `<title>${'A'.repeat(200)} &amp; Zonen</title>`;
    const f = extractBusinessFacts(html, 'https://x.nl/');
    expect(f.bedrijfsnaam.length).toBeLessThanOrEqual(120);
    expect(f.bedrijfsnaam).not.toContain('&amp;');
  });

  it('negeert een 06-nummer niet: mobiele nummers zijn geldig', () => {
    expect(extractBusinessFacts('<a href="tel:0612345678">x</a>', 'https://x.nl/').telefoon).toBe('+31612345678');
  });
});

describe('normalizeSiteUrl / isFetchableSiteUrl', () => {
  it('voegt https:// toe en houdt alleen origin + pad', () => {
    expect(normalizeSiteUrl('fysiodebrug.nl')).toBe('https://fysiodebrug.nl/');
    expect(normalizeSiteUrl('http://www.kapper.nl/contact?x=1#top')).toBe('http://www.kapper.nl/contact');
  });

  it('weigert localhost, IP-adressen, interne hosts en niet-http-schema\'s (SSRF)', () => {
    for (const bad of ['http://localhost/', 'http://127.0.0.1/', 'http://10.0.0.1/', 'http://192.168.1.1/',
      'http://169.254.169.254/latest/meta-data', 'http://[::1]/', 'ftp://x.nl/', 'javascript:alert(1)',
      'http://intranet/', 'http://user:pw@x.nl/', 'https://x.nl:8443/']) {
      expect(isFetchableSiteUrl(bad), bad).toBe(false);
    }
  });

  it('accepteert een gewone publieke https-site', () => {
    expect(isFetchableSiteUrl('https://www.fysiodebrug.nl/')).toBe(true);
    expect(isFetchableSiteUrl('http://kapper-jan.nl/')).toBe(true);
  });
});
