// Task 5 (spec plak A): admin/klant.astro — per-dienst pauzeren/hervatten +
// verwijderen, en klant-breed verwijderen met bedrijfsnaam-bevestiging.
// Zelfde stijl als test/onboarding-page.test.js / test/base-layout-analytics.test.js:
// statische assertions op de echte bronsource (geen herschreven kopie).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagePath = path.join(__dirname, '../src/pages/admin/klant.astro');
const pageSrc = fs.readFileSync(pagePath, 'utf8');

describe('admin/klant.astro — dienst pauzeren/hervatten/verwijderen', () => {
  it('rendert per dienst een Pauzeren/Hervatten-knop', () => {
    expect(pageSrc).toMatch(/Pauzeren/);
    expect(pageSrc).toMatch(/Hervatten/);
  });

  it('pauzeren/hervatten roept PATCH /api\\/admin\\/service aan met een status', () => {
    expect(pageSrc).toMatch(/post\(['"]\/api\/admin\/service['"],\s*['"]PATCH['"]/);
    expect(pageSrc).toMatch(/status:\s*next/);
  });

  it('rendert per dienst een Verwijderen-knop die confirm() vraagt vóór DELETE /api\\/admin\\/service', () => {
    const delIdx = pageSrc.indexOf("s-del");
    expect(delIdx).toBeGreaterThan(-1);
    const scriptTail = pageSrc.slice(delIdx);
    expect(scriptTail).toMatch(/confirm\(['"]Dienst verwijderen/);
    expect(scriptTail).toMatch(/method:\s*['"]DELETE['"]/);
    expect(scriptTail).toMatch(/\/api\/admin\/service\?id=/);
  });

  it('bevat de klant-verwijder-sectie met een del-confirm-input', () => {
    expect(pageSrc).toMatch(/id="del-confirm"/);
    expect(pageSrc).toMatch(/Klant verwijderen/);
  });

  it('klant-verwijderen vergelijkt de ingevoerde tekst met de geladen bedrijfsnaam vóór DELETE /api\\/admin\\/customer', () => {
    const btnIdx = pageSrc.indexOf('k-delete');
    expect(btnIdx).toBeGreaterThan(-1);
    const scriptTail = pageSrc.slice(pageSrc.indexOf("getElementById('k-delete')"));
    expect(scriptTail).toMatch(/del-confirm/);
    expect(scriptTail).toMatch(/k-bedrijf/);
    expect(scriptTail).toMatch(/!==/);
    expect(scriptTail).toMatch(/method:\s*['"]DELETE['"]/);
    expect(scriptTail).toMatch(/\/api\/admin\/customer/);
    expect(scriptTail).toMatch(/confirm:\s*typed/);
  });

  it('bij succesvolle klant-verwijdering navigeert de pagina naar /admin/klanten', () => {
    expect(pageSrc).toMatch(/location\.href\s*=\s*['"]\/admin\/klanten['"]/);
  });
});
