// Zoekeen-proxy (/api/admin/zoekeen/* → zoekeen.nl/api/ext/v1/*): token ontbreekt → 503,
// alleen allow-listed paden/methodes/query-params, upstream-fouten in aanloopai-vorm,
// en upstream 401/403 nooit als 401/403 doorgeven (dat stuurt de admin-UI naar login).
import {
  describe, it, expect, vi, beforeEach, afterEach,
} from 'vitest';
import { zoekeenProxy, ZOEKEEN_API } from '../src/lib/zoekeen-proxy.js';
import { handleAdminApi } from '../src/lib/admin-routes.js';

const LEAD = '01J8ZQ3K5V6W7X8Y9Z0ABCDEFG';
const PARTNER = '01J8ZQ3K5V6W7X8Y9Z0HJKMNPQ';
const ENV = { ZOEKEEN_ADMIN_TOKEN: 'geheim-token' };

function req(path, { method = 'GET', body } = {}) {
  return new Request(`https://aanloopai.nl/api/admin/zoekeen/${path}`, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
  });
}

function upstream(status, json) {
  return new Response(json === undefined ? 'geen json' : JSON.stringify(json), { status });
}

let fetchMock;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('zoekeenProxy — configuratie', () => {
  it('token ontbreekt → 503 "niet geconfigureerd", geen upstream-call', async () => {
    const res = await zoekeenProxy(req('stats'), {});
    const body = await res.json();
    expect(res.status).toBe(503);
    expect(body).toEqual({ ok: false, error: 'Zoekeen-koppeling niet geconfigureerd', code: 'not_configured' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('zoekeenProxy — allow-list', () => {
  it.each([
    ['onbekend pad', 'admin/users', 'GET'],
    ['path traversal', '../admin/leads', 'GET'],
    ['ongeldig lead-id', 'leads/abc', 'GET'],
    ['onbekende lead-actie', `leads/${LEAD}/export`, 'POST'],
    ['partner-bewerken niet blootgesteld', `partners/${PARTNER}`, 'PUT'],
    ['lead-id met extra segment', `leads/${LEAD}/route/x`, 'POST'],
  ])('%s → 404, geen upstream-call', async (_naam, path, method) => {
    const res = await zoekeenProxy(req(path, { method, body: method === 'GET' ? undefined : {} }), ENV);
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['DELETE op lead', `leads/${LEAD}`, 'DELETE'],
    ['GET op lead-actie', `leads/${LEAD}/spam`, 'GET'],
    ['POST op settings', 'settings', 'POST'],
    ['GET op settings/flags', 'settings/flags', 'GET'],
  ])('%s → 405, geen upstream-call', async (_naam, path, method) => {
    const res = await zoekeenProxy(req(path, { method, body: method === 'GET' ? undefined : {} }), ENV);
    expect(res.status).toBe(405);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('alleen toegestane query-parameters gaan door', async () => {
    fetchMock.mockResolvedValue(upstream(200, { ok: true, data: { leads: [] } }));
    await zoekeenProxy(
      new Request('https://aanloopai.nl/api/admin/zoekeen/leads?status=verified&q=jan&offset=50&sector=&evil=1&limit=9999'),
      ENV,
    );
    const target = new URL(fetchMock.mock.calls[0][0]);
    expect(target.origin + target.pathname).toBe(`${ZOEKEEN_API}/leads`);
    expect(Object.fromEntries(target.searchParams)).toEqual({ status: 'verified', q: 'jan', offset: '50' });
  });

  it('detail-pad krijgt geen query-parameters mee', async () => {
    fetchMock.mockResolvedValue(upstream(200, { ok: true, data: {} }));
    await zoekeenProxy(new Request(`https://aanloopai.nl/api/admin/zoekeen/leads/${LEAD}?status=x`), ENV);
    expect(fetchMock.mock.calls[0][0]).toBe(`${ZOEKEEN_API}/leads/${LEAD}`);
  });
});

describe('zoekeenProxy — doorsturen', () => {
  it('GET: Bearer-token server-side, data 1-op-1 terug', async () => {
    fetchMock.mockResolvedValue(upstream(200, { ok: true, data: { leads: { total: 3 } } }));
    const res = await zoekeenProxy(req('stats'), ENV);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, data: { leads: { total: 3 } } });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${ZOEKEEN_API}/stats`);
    expect(init.method).toBe('GET');
    expect(init.headers.authorization).toBe('Bearer geheim-token');
    expect(init.body).toBeUndefined();
  });

  it('POST: methode + JSON-body doorgestuurd', async () => {
    fetchMock.mockResolvedValue(upstream(200, { ok: true, data: { dryRun: true } }));
    const res = await zoekeenProxy(req(`leads/${LEAD}/route`, { method: 'POST', body: { partnerId: PARTNER } }), ENV);
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${ZOEKEEN_API}/leads/${LEAD}/route`);
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ partnerId: PARTNER });
    expect(init.headers['content-type']).toBe('application/json');
  });

  it('PUT settings/flags: body doorgestuurd', async () => {
    fetchMock.mockResolvedValue(upstream(200, { ok: true, data: { applied: { mailLive: true } } }));
    await zoekeenProxy(req('settings/flags', { method: 'PUT', body: { mailLive: true } }), ENV);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ mailLive: true });
  });

  it('POST zonder body (spam) → geen body upstream', async () => {
    fetchMock.mockResolvedValue(upstream(200, { ok: true, data: { status: 'spam' } }));
    await zoekeenProxy(req(`leads/${LEAD}/spam`, { method: 'POST' }), ENV);
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });

  it('ongeldige JSON → 400, geen upstream-call', async () => {
    const res = await zoekeenProxy(req(`leads/${LEAD}/reject`, { method: 'POST', body: '{kapot' }), ENV);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('zoekeenProxy — foutmapping', () => {
  it('upstream 409 {code,message} → 409 in aanloopai-vorm', async () => {
    fetchMock.mockResolvedValue(upstream(409, {
      ok: false, error: { code: 'vo_unsigned', message: 'Aanbieder heeft geen getekende verwerkersovereenkomst.' },
    }));
    const res = await zoekeenProxy(req(`leads/${LEAD}/route`, { method: 'POST', body: { partnerId: PARTNER } }), ENV);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      ok: false, error: 'Aanbieder heeft geen getekende verwerkersovereenkomst.', code: 'vo_unsigned',
    });
  });

  it('upstream 404 → 404', async () => {
    fetchMock.mockResolvedValue(upstream(404, { ok: false, error: { code: 'not_found', message: 'Lead niet gevonden.' } }));
    const res = await zoekeenProxy(req(`leads/${LEAD}`), ENV);
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('Lead niet gevonden.');
  });

  it.each([401, 403])('upstream %i (token fout) → 502, nooit 401/403 naar de browser', async (status) => {
    fetchMock.mockResolvedValue(upstream(status, { ok: false, error: { code: 'unauthorized', message: 'x' } }));
    const res = await zoekeenProxy(req('stats'), ENV);
    const body = await res.json();
    expect(res.status).toBe(502);
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/ZOEKEEN_ADMIN_TOKEN/);
  });

  it('upstream 503 ext_disabled → 503 met uitleg', async () => {
    fetchMock.mockResolvedValue(upstream(503, { ok: false, error: { code: 'ext_disabled', message: 'x' } }));
    const res = await zoekeenProxy(req('stats'), ENV);
    expect(res.status).toBe(503);
    expect((await res.json()).code).toBe('ext_disabled');
  });

  it('upstream geen JSON → 502', async () => {
    fetchMock.mockResolvedValue(upstream(500));
    const res = await zoekeenProxy(req('stats'), ENV);
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe('upstream_invalid');
  });

  it('netwerkfout/timeout → 502', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'));
    const res = await zoekeenProxy(req('stats'), ENV);
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe('upstream_unreachable');
  });

  it('token staat nooit in de response', async () => {
    fetchMock.mockResolvedValue(upstream(401, { ok: false, error: { code: 'unauthorized', message: 'x' } }));
    const res = await zoekeenProxy(req('stats'), ENV);
    expect(await res.text()).not.toContain('geheim-token');
  });
});

describe('handleAdminApi — zoekeen-routes erven de staff-guard', () => {
  it('zonder sessie → 403, geen upstream-call', async () => {
    const res = await handleAdminApi(req('stats'), { ...ENV, PORTAL_DB: {}, PORTAL_SESSION_SECRET: 's' });
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('mutatie met vreemde origin → 403, geen upstream-call', async () => {
    const r = new Request('https://aanloopai.nl/api/admin/zoekeen/settings/flags', {
      method: 'PUT', headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{"mailLive":true}',
    });
    const res = await handleAdminApi(r, { ...ENV, PORTAL_DB: {}, PORTAL_SESSION_SECRET: 's' });
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
