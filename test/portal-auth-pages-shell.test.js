// Live-incident 2026-09-16 (leadpartner go-live test): /portal/verify gebruikte
// PortalLayout, waarvan de auth-guard (GET /api/portal/me → 401 →
// location.href=/portal/login) in productie de verify-POST afbrak. Het
// eenmalige token werd server-side verbrand, de klant landde zonder sessie op
// de loginpagina: elke magic-link login faalde. Deze test houdt de twee
// niet-ingelogde auth-pagina's (login, verify) buiten de app-schil, en de
// portaal/admin-HTML buiten de edge-cache (de andere helft van het incident:
// /portal/intake/ bleef na de deploy een dag oud op de edge).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

describe('auth-pagina\'s draaien buiten de portaal-app-schil', () => {
  for (const page of ['src/pages/portal/login.astro', 'src/pages/portal/verify.astro']) {
    it(`${page} importeert PortalLayout niet en heeft een eigen <html>-schil`, () => {
      const src = read(page);
      expect(src).not.toMatch(/import\s+PortalLayout/);
      expect(src).not.toMatch(/<PortalLayout/);
      expect(src).toContain('<!DOCTYPE html>');
      expect(src).toContain('noindex');
    });
  }

  it('PortalLayout bevat nog steeds de auth-guard (anders is deze test zinloos)', () => {
    const src = read('src/layouts/PortalLayout.astro');
    expect(src).toContain("fetch('/api/portal/me'");
    expect(src).toContain("location.href = '/portal/login'");
  });
});

describe('_headers: portaal/admin-HTML niet op de edge cachen', () => {
  const headers = read('public/_headers');
  for (const path of ['/portal/*', '/admin/*']) {
    it(`${path} → private, no-store (met ! Cache-Control reset)`, () => {
      const block = headers.split(/\n(?=\S)/).find((b) => b.startsWith(path + '\n'));
      expect(block, `blok ${path} ontbreekt`).toBeTruthy();
      expect(block).toContain('! Cache-Control');
      expect(block).toMatch(/Cache-Control: private, no-store/);
    });
  }
  it('de portaal-regels staan NA de /*.html-regel (latere blokken winnen via ! reset)', () => {
    expect(headers.indexOf('/*.html\n')).toBeLessThan(headers.indexOf('/portal/*\n'));
  });
});
