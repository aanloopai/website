// Page-shell checks for the customer portal pages (overeenkomst + aanleveren).
// Consent labels are NOT hardcoded (they come from the API); fixed UI strings are.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const ovkPage = read('src/pages/portal/overeenkomst.astro');
const voorbeeldPage = read('src/pages/admin/overeenkomst-voorbeeld.astro');
// Markup + script live in the shared component (klant + voorbeeld mode).
const ovk = read('src/components/OvereenkomstFlow.astro');
const aan = read('src/pages/portal/aanleveren.astro');
const idx = read('src/pages/portal/index.astro');
const layout = read('src/layouts/PortalLayout.astro');
const worker = read('src/worker.js');

describe('portal/overeenkomst.astro', () => {
  it.each([
    'Lees het document volledig voordat je akkoord gaat.',
    'Scroll tot het einde van het document.',
    'Bedankt, de overeenkomst is ondertekend.',
    'Ga naar aanleverlijst',
    'Wissen',
    'Ondertekenen',
    'Download als PDF',
    'Gelezen en akkoord',
    'Te betalen bedragen (excl. btw)',
    'Cinematic 3D-beleving toevoegen',
    'Vastgelegd bij je eerste akkoordverklaring.',
    'btw-nummer (optioneel)',
    'Voorbeeldweergave — zo ziet de klant de overeenkomst. Er wordt niets opgeslagen.',
  ])('bevat vaste UI-tekst: %s', (s) => {
    expect(ovk).toContain(s);
  });

  it('kent geen verificatiecode meer', () => {
    for (const w of ['Stuur code', 'Verificatiecode', 'Controleer code', '/otp/']) expect(ovk).not.toContain(w);
  });

  it('hardcodeert de drie toestemmingszinnen niet (komen uit de API)', () => {
    expect(ovk).not.toContain('Ik heb de overeenkomst volledig gelezen');
    expect(ovk).not.toContain('Ik heb de Algemene Voorwaarden');
    expect(ovk).not.toContain('Ik heb de Privacyverklaring');
    expect(ovk).toContain('doc.label');
    expect(ovk).toContain('authorized_label');
  });

  it('gebruikt de contract-endpoints en de 24px scroll-drempel', () => {
    for (const ep of ['/lijst', '/open', '/consent', '/bedrijfsgegevens', '/ondertekenen', '/pdf?id=']) {
      expect(ovk).toContain(ep);
    }
    expect(ovk).toMatch(/scrollHeight\s*-\s*24/);
    expect(ovk).toContain("toDataURL('image/png')");
    expect(ovk).toContain('pointerdown');
    expect(ovk).toContain('/portal/aanleveren/');
  });
});

describe('OvereenkomstFlow: modi en bedragen', () => {
  it('portal-pagina gebruikt de component in klant-modus, admin-voorbeeld in voorbeeld-modus', () => {
    expect(ovkPage).toContain('OvereenkomstFlow mode="klant"');
    expect(voorbeeldPage).toContain('OvereenkomstFlow mode="voorbeeld"');
    expect(voorbeeldPage).toContain('AdminLayout');
  });
  it('voorbeeld haalt data uit klantweergave en stuurt geen mutaties', () => {
    expect(ovk).toContain('/api/admin/overeenkomst/klantweergave?id=');
    expect(ovk).toMatch(/PREVIEW && method && method !== 'GET'/);
  });
  it('ondertekenen stuurt bedragen_akkoord en opties gaat via POST /opties', () => {
    expect(ovk).toContain('bedragen_akkoord: true');
    expect(ovk).toContain('/api/portal/overeenkomst/opties');
    expect(ovk).toContain('ovk-bedragen');
  });
});

describe('portal/aanleveren.astro', () => {
  it.each(['aangeleverd', 'n.v.t.', 'Verwijderen'])('bevat vaste UI-tekst: %s', (s) => {
    expect(aan).toContain(s);
  });
  it('gebruikt de contract-endpoints', () => {
    for (const ep of ['/upload', '/tekst', '/nvt', '/bestand?id=']) expect(aan).toContain(ep);
    expect(aan).toContain('FormData');
    expect(aan).toContain('notice');
  });
});

describe('verboden woorden', () => {
  const FORBIDDEN = ['Submit', 'Sign here', 'Upload file', 'Password', 'gönder', 'imza', 'yükle', 'onayla'];
  for (const [name, src] of [['overeenkomst', ovk], ['aanleveren', aan]]) {
    it(`${name}: geen Engelse/Turkse UI-woorden`, () => {
      const low = src.toLowerCase();
      for (const w of FORBIDDEN) expect(low.includes(w.toLowerCase()), `"${w}" in ${name}`).toBe(false);
    });
  }
});

describe('shell-koppelingen', () => {
  it('index.astro toont Overeenkomst- en Aanleverlijst-kaarten', () => {
    expect(idx).toContain('Overeenkomst');
    expect(idx).toContain('Aanleverlijst');
    for (const s of ['Nog te lezen', 'In behandeling', 'Ondertekend']) expect(idx).toContain(s);
    expect(idx).toContain('/api/portal/overeenkomst/lijst');
    expect(idx).toContain('/api/portal/aanleveren');
  });
  it('nav bevat beide ingangen', () => {
    expect(layout).toContain("href: '/portal/overeenkomst/'");
    expect(layout).toContain("href: '/portal/aanleveren/'");
  });
  it('worker redirect /klanten -> /portal met 301, vóór ASSETS', () => {
    const i = worker.indexOf("'/klanten/dashboard'");
    expect(i).toBeGreaterThan(-1);
    expect(i).toBeLessThan(worker.indexOf('if (env.ASSETS) {', i) + 1);
    expect(worker.indexOf("'/klanten/dashboard'")).toBeLessThan(worker.lastIndexOf('if (env.ASSETS) {'));
    expect(worker).toContain("'/portal/overeenkomst/?id='");
    expect(worker).toContain("'/portal/login'");
    expect(worker).toContain('301');
  });
});
