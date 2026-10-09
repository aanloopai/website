// Admin klantenportaal pages: static string checks against the real sources.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(dir, '..', p), 'utf8');
const pages = {
  overeenkomst: read('src/pages/admin/overeenkomst.astro'),
  aanleverlijst: read('src/pages/admin/aanleverlijst.astro'),
  sjablonen: read('src/pages/admin/sjablonen.astro'),
};
const KEYS = ['klant_bedrijfsnaam','klant_rechtsvorm','klant_kvk','klant_btw','klant_adres','klant_postcode','klant_plaats','klant_contact_naam','klant_contact_email','klant_contact_tel','klant_dagelijks_contact','project_naam','project_domein','prijs_website','prijs_optie_3d','optie_3d_gekozen','prijs_beheer_maand','prijs_lead','lead_bundel_aantal','lead_bundel_prijs','lead_regio','lead_cap_per_dag','betaling_fasen','betaaltermijn_dagen'];

describe('admin klantenportaal pages', () => {
  it('overeenkomst: labels, endpoints and all 24 variable keys', () => {
    const s = pages.overeenkomst;
    for (const l of ['Nieuwe overeenkomst', 'Versturen', 'Annuleren', 'PDF downloaden', 'Preview']) expect(s).toContain(l);
    for (const k of KEYS) expect(s).toContain("'" + k + "'");
    for (const u of ['/api/admin/overeenkomst/lijst', '/api/admin/overeenkomst/pdf', '/api/admin/overeenkomst/', '/api/admin/customer']) expect(s).toContain(u);
    expect(s).toMatch(/confirm\(/);
    expect(s).toMatch(/'PATCH'/);
  });
  it('overeenkomst detail: Wijzig/Opslaan/Annuleren, bevroren-notitie, 3D-checkbox en voorbeeld-knop', () => {
    const s = pages.overeenkomst;
    for (const l of ['Wijzig', 'Opslaan', 'Annuleren', 'Gegevens zijn bevroren na de eerste akkoordverklaring van de klant.',
      'Cinematic 3D-beleving gekozen', 'Voorbeeld klantweergave', '/admin/overeenkomst-voorbeeld/?id=']) expect(s).toContain(l);
    expect(s).toMatch(/'ja' : 'nee'/);
  });
  it('voorbeeld: lokale simulatie, geen schrijfacties naar de server', () => {
    const page = read('src/pages/admin/overeenkomst-voorbeeld.astro');
    const flow = read('src/components/OvereenkomstFlow.astro');
    expect(page).toContain('mode="voorbeeld"');
    const s = page + flow;
    for (const l of ['niets ondertekend of opgeslagen', 'wordt de tekst niet opnieuw gerenderd', 'Er wordt niets opgeslagen']) expect(s).toContain(l);
    for (const w of ['Stuur code', 'Verificatiecode', 'er wordt geen code verstuurd']) expect(s).not.toContain(w);
    // fetch lives only in api(); every POST goes through apiPost, which throws in voorbeeld mode.
    expect(flow.match(/fetch\(/g)).toHaveLength(1);
    expect(flow.match(/'POST'/g)).toHaveLength(1);
    expect(flow).toMatch(/function apiPost\(path, body\) \{\s*if \(PREVIEW\) throw/);
    expect(flow).toMatch(/if \(PREVIEW && method && method !== 'GET'\) throw/);
  });
  it('aanleverlijst: labels and endpoints', () => {
    const s = pages.aanleverlijst;
    for (const l of ['Standaardlijst aanmaken', 'Herinnering sturen']) expect(s).toContain(l);
    for (const u of ['/api/admin/aanlever/seed', '/api/admin/aanlever/herinnering', '/api/admin/aanlever/bestand', '/api/admin/aanlever/item']) expect(s).toContain(u);
    expect(s).toMatch(/confirm\(/);
  });
  it('sjablonen: labels and endpoints', () => {
    const s = pages.sjablonen;
    for (const l of ['Nieuwe versie', 'Bekijken']) expect(s).toContain(l);
    expect(s).toContain('/api/admin/sjablonen');
    expect(s).toContain('/api/admin/sjablonen/item?id=');
  });
  it('klant.astro links to the portal pages; layout has Sjablonen nav', () => {
    const k = read('src/pages/admin/klant.astro');
    expect(k).toContain('Klantenportaal');
    expect(k).toContain('/admin/overeenkomst/?klant=');
    expect(k).toContain('/admin/aanleverlijst/?klant=');
    expect(k).toContain('/admin/sjablonen/');
    expect(read('src/layouts/AdminLayout.astro')).toContain("href: '/admin/sjablonen/'");
  });
  it('no forbidden foreign-language words', () => {
    for (const s of Object.values(pages)) {
      for (const w of ['Submit', 'gönder', 'imza', 'yükle']) expect(s).not.toContain(w);
    }
  });
});
