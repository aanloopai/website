// Page-shell checks for the customer portal pages (overeenkomst + aanleveren).
// Consent labels are NOT hardcoded (they come from the API); fixed UI strings are.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const ovk = read('src/pages/portal/overeenkomst.astro');
const aan = read('src/pages/portal/aanleveren.astro');
const idx = read('src/pages/portal/index.astro');
const layout = read('src/layouts/PortalLayout.astro');
const worker = read('src/worker.js');

describe('portal/overeenkomst.astro', () => {
  it.each([
    'Lees het document volledig voordat je akkoord gaat.',
    'Bedankt, de overeenkomst is ondertekend.',
    'Ga naar aanleverlijst',
    'Wissen',
    'Stuur code',
    'Ondertekenen',
    'Download als PDF',
  ])('bevat vaste UI-tekst: %s', (s) => {
    expect(ovk).toContain(s);
  });

  it('hardcodeert de drie toestemmingszinnen niet (komen uit de API)', () => {
    expect(ovk).not.toContain('Ik heb de overeenkomst volledig gelezen');
    expect(ovk).not.toContain('Ik heb de Algemene Voorwaarden');
    expect(ovk).not.toContain('Ik heb de Privacyverklaring');
    expect(ovk).toContain('doc.label');
    expect(ovk).toContain('authorized_label');
  });

  it('gebruikt de contract-endpoints en de 24px scroll-drempel', () => {
    for (const ep of ['/lijst', '/open', '/consent', '/bedrijfsgegevens', '/otp/sturen', '/otp/verifieer', '/ondertekenen', '/pdf?id=']) {
      expect(ovk).toContain(ep);
    }
    expect(ovk).toMatch(/scrollHeight\s*-\s*24/);
    expect(ovk).toContain("toDataURL('image/png')");
    expect(ovk).toContain('pointerdown');
    expect(ovk).toContain('/portal/aanleveren/');
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
