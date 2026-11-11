// Guard GEO site-level 2026-11-11: /ai/summary.json geldig + homepage markdown-negotiatie.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleHomeMarkdown } from '../src/lib/markdown-home.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const md = fs.readFileSync(path.join(root, 'public/ai/home.md'), 'utf8');
const env = {
  ASSETS: { fetch: async () => new Response(md, { status: 200 }) },
};
const call = (accept, pathname = '/', method = 'GET') => {
  const req = new Request('https://aanloopai.nl' + pathname, { method, headers: accept ? { accept } : {} });
  return handleHomeMarkdown(req, env, new URL(req.url));
};

describe('GEO site-level', () => {
  it('ai/summary.json is geldig JSON met name en description', () => {
    const j = JSON.parse(fs.readFileSync(path.join(root, 'public/ai/summary.json'), 'utf8'));
    expect(j.name.length).toBeGreaterThanOrEqual(3);
    expect(j.description.length).toBeGreaterThanOrEqual(20);
    expect(j.url).toBe('https://aanloopai.nl');
  });

  it('summary.json en home.md bevatten geen telefoon/KvK', () => {
    const all = fs.readFileSync(path.join(root, 'public/ai/summary.json'), 'utf8') + md;
    expect(all).not.toMatch(/whatsapp|\+31|\b0\d{9}\b|88606902|kvk/i);
  });

  it('Accept: text/markdown op / geeft 200 markdown, no-store, Vary', async () => {
    const r = await call('text/markdown');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toMatch(/^text\/markdown/);
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('vary')).toBe('Accept');
    expect(await r.text()).toContain('# Aanloop AI');
  });

  it('gewone Accept, geen Accept, ander pad of POST: handler laat door (null)', async () => {
    expect(await call('text/html,*/*')).toBeNull();
    expect(await call(null)).toBeNull();
    expect(await call('text/markdown', '/contact/')).toBeNull();
    expect(await call('text/markdown', '/', 'POST')).toBeNull();
  });
});
