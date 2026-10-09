// Live-incident 2026-09-16 (leadpartner go-live test): /portal/verify gebruikte
// PortalLayout, waarvan de auth-guard (GET /api/portal/me → 401 →
// location.href=/portal/login) in productie de verify-POST afbrak. Het
// eenmalige token werd server-side verbrand, de klant landde zonder sessie op
// de loginpagina: elke magic-link login faalde. Deze test houdt de twee
// niet-ingelogde auth-pagina's (login, verify) buiten de app-schil, en de
// portaal/admin-HTML buiten de edge-cache (de andere helft van het incident:
// /portal/intake/ bleef na de deploy een dag oud op de edge).
import { describe, it, expect, vi } from 'vitest';
import { handleAuthRequest } from '../src/lib/portal-routes.js';
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

describe('magic link: 48 uur geldig', () => {
  it('slaat expires_at op als nu + 48 uur en noemt 48 uur in de mail', async () => {
    const inserts = [];
    const env = {
      BREVO_API_KEY: 'k',
      PORTAL_DB: {
        prepare(sql) {
          return {
            bind: (...args) => ({
              first: async () => (sql.startsWith('SELECT id, naam FROM users') ? { id: 'usr_1', naam: 'Ron Houter' } : null),
              run: async () => { if (sql.startsWith('INSERT INTO magic_links')) inserts.push(args); return { meta: { changes: 1 } }; },
            }),
          };
        },
      },
    };
    const originalFetch = globalThis.fetch;
    const fetchMock = vi.fn(async () => new Response('{}', { status: 201 }));
    globalThis.fetch = fetchMock;
    try {
      const before = Date.now();
      const res = await handleAuthRequest(new Request('https://aanloopai.nl/api/portal/auth/request', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'ron@foralle.nl' }),
      }), env);
      const after = Date.now();
      expect(res.status).toBe(200);
      expect(inserts).toHaveLength(1);
      const expiresAt = inserts[0][2];
      const h48 = 48 * 60 * 60 * 1000;
      expect(expiresAt).toBeGreaterThanOrEqual(before + h48);
      expect(expiresAt).toBeLessThanOrEqual(after + h48);
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).htmlContent).toContain('48 uur geldig');
    } finally { globalThis.fetch = originalFetch; }
  });
});
