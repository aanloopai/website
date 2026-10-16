// Klant-API /api/portal/aanleveren*: extensie/grootte/magic-bytes, rollen, eigendom.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handlePortalApi } from '../src/lib/portal-routes.js';
import {
  SECRET, makeD1, makeKv, authedRequest, seedCustomers,
} from './_portal-test-helpers.js';

const originalFetch = globalThis.fetch;
let d1; let kv; let env; let telegrams;

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
function item(id, o = {}) {
  const r = {
    customer_id: 'cus_1', type: 'file', required: 1, accepted_ext: 'png,jpg', max_mb: 1,
    multi: 0, max_files: 1, order_index: 1, status: 'open', ...o,
  };
  d1.raw.prepare(`INSERT INTO upload_items (id, customer_id, label, description, type, required, accepted_ext, max_mb, multi, max_files, order_index, status, created_at)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, r.customer_id, `Item ${id}`, null, r.type, r.required, r.accepted_ext, r.max_mb, r.multi, r.max_files, r.order_index, r.status, 1);
}
function uploadForm(itemId, bytes, name) {
  const f = new FormData();
  f.set('item_id', itemId);
  if (bytes) f.set('file', new File([bytes], name));
  return f;
}
const call = async (path, opts) => handlePortalApi(await authedRequest(path, opts), env);
const up = (userId, itemId, bytes, name) => call('/api/portal/aanleveren/upload', { userId, method: 'POST', form: uploadForm(itemId, bytes, name) });

beforeEach(() => {
  d1 = makeD1(); kv = makeKv(); seedCustomers(d1); telegrams = [];
  env = {
    PORTAL_DB: d1, PORTAL_SESSION_SECRET: SECRET, GOOGLE_TOKENS: makeKv(), PORTAL_FILES: kv,
    TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: 'c',
  };
  globalThis.fetch = vi.fn(async (url, init) => {
    if (String(url).includes('telegram')) telegrams.push(JSON.parse(init.body).text);
    return new Response('{}', { status: 200 });
  });
});
afterEach(() => { globalThis.fetch = originalFetch; });

describe('upload', () => {
  it('weigert een niet-toegestane extensie', async () => {
    item('upi_1');
    expect((await up('usr_1', 'upi_1', PNG, 'logo.exe')).status).toBe(400);
    expect(kv.store.size).toBe(0);
  });

  it('weigert een te groot bestand (> max_mb)', async () => {
    item('upi_1', { max_mb: 1 });
    const big = new Uint8Array(1024 * 1024 + 1); big.set(PNG);
    expect((await up('usr_1', 'upi_1', big, 'groot.png')).status).toBe(413);
    expect(kv.store.size).toBe(0);
  });

  it('weigert een bestand waarvan de inhoud niet bij de extensie past', async () => {
    item('upi_1');
    expect((await up('usr_1', 'upi_1', new TextEncoder().encode('geen png'), 'nep.png')).status).toBe(400);
  });

  it('accepteert een geldige png, zet status received, schrijft audit + Telegram', async () => {
    item('upi_1');
    const res = await up('usr_1', 'upi_1', PNG, 'logo.PNG');
    expect(res.status).toBe(200);
    const { upload } = await res.json();
    expect(upload.original_name).toBe('logo.PNG');
    expect(d1.raw.prepare('SELECT status FROM upload_items WHERE id = ?').get('upi_1').status).toBe('received');
    const row = d1.raw.prepare('SELECT file_key FROM uploads WHERE id = ?').get(upload.id);
    expect(row.file_key).toBe(`portal:file:cus_1/${upload.id}`);
    expect(kv.store.get(row.file_key).metadata).toMatchObject({ mime: 'image/png', customer_id: 'cus_1' });
    expect(d1.raw.prepare("SELECT COUNT(*) AS n FROM portal_audit_log WHERE action = 'upload'").get().n).toBe(1);
    expect(telegrams[0]).toBe('Nieuwe upload van Foralle BV: Item upi_1 (logo.PNG)');
  });

  it('respecteert max_files (niet-multi = 1)', async () => {
    item('upi_1');
    expect((await up('usr_1', 'upi_1', PNG, 'a.png')).status).toBe(200);
    expect((await up('usr_1', 'upi_1', PNG, 'b.png')).status).toBe(400);
  });

  it('svg moet met < beginnen', async () => {
    item('upi_1', { accepted_ext: 'svg', multi: 1, max_files: 3 });
    expect((await up('usr_1', 'upi_1', new TextEncoder().encode('hallo'), 'a.svg')).status).toBe(400);
    expect((await up('usr_1', 'upi_1', new TextEncoder().encode('\n <svg/>'), 'a.svg')).status).toBe(200);
  });

  it('kijker krijgt 403; item van andere klant geeft 404', async () => {
    item('upi_1');
    expect((await up('usr_2', 'upi_1', PNG, 'a.png')).status).toBe(403);
    expect((await up('usr_9', 'upi_1', PNG, 'a.png')).status).toBe(404);
  });

  it('weigert mutaties zonder Origin (CSRF-guard blijft actief)', async () => {
    item('upi_1');
    const res = await call('/api/portal/aanleveren/nvt', { userId: 'usr_1', method: 'POST', json: { item_id: 'upi_1' }, origin: null });
    expect(res.status).toBe(403);
  });
});

describe('tekst / nvt / lijst / verwijderen / bestand', () => {
  it('tekst: upsert, boolean ja/nee, limiet, kijker 403', async () => {
    item('upi_t', { type: 'text', accepted_ext: null });
    item('upi_b', { type: 'boolean', accepted_ext: null });
    const post = (userId, json) => call('/api/portal/aanleveren/tekst', { userId, method: 'POST', json });
    expect((await post('usr_1', { item_id: 'upi_t', text_value: 'eerste' })).status).toBe(200);
    expect((await post('usr_1', { item_id: 'upi_t', text_value: 'tweede' })).status).toBe(200);
    expect(d1.raw.prepare('SELECT text_value FROM uploads WHERE upload_item_id = ?').all('upi_t').map((r) => r.text_value)).toEqual(['tweede']);
    expect((await post('usr_1', { item_id: 'upi_b', text_value: 'misschien' })).status).toBe(400);
    expect((await post('usr_1', { item_id: 'upi_b', text_value: 'ja' })).status).toBe(200);
    expect((await post('usr_1', { item_id: 'upi_t', text_value: 'x'.repeat(5001) })).status).toBe(400);
    expect((await post('usr_2', { item_id: 'upi_t', text_value: 'x' })).status).toBe(403);
  });

  it('nvt alleen voor niet-verplichte items', async () => {
    item('upi_r', { required: 1 }); item('upi_o', { required: 0 });
    const post = (id) => call('/api/portal/aanleveren/nvt', { userId: 'usr_1', method: 'POST', json: { item_id: id } });
    expect((await post('upi_r')).status).toBe(400);
    expect((await post('upi_o')).status).toBe(200);
    expect(d1.raw.prepare('SELECT status FROM upload_items WHERE id = ?').get('upi_o').status).toBe('nvt');
  });

  it('lijst: voortgang, notice en alleen eigen items', async () => {
    item('upi_1'); item('upi_2', { required: 0, order_index: 2 }); item('upi_x', { customer_id: 'cus_2' });
    await up('usr_1', 'upi_1', PNG, 'a.png');
    const body = await (await call('/api/portal/aanleveren', { userId: 'usr_1' })).json();
    expect(body.items.map((i) => i.id)).toEqual(['upi_1', 'upi_2']);
    expect(body.progress).toEqual({ done: 1, total: 2 });
    expect(body.notice).toBe('Deel geen wachtwoorden. Toegang verlenen we via uitnodiging op jouw account.');
    expect(body.items[0].uploads).toHaveLength(1);
  });

  it('verwijderen: KV + rij weg, item terug naar open, alleen eigen upload', async () => {
    item('upi_1');
    const { upload } = await (await up('usr_1', 'upi_1', PNG, 'a.png')).json();
    const del = (userId) => call(`/api/portal/aanleveren/upload?id=${upload.id}`, { userId, method: 'DELETE' });
    expect((await del('usr_9')).status).toBe(404);
    expect((await del('usr_2')).status).toBe(403);
    expect((await del('usr_1')).status).toBe(200);
    expect(kv.store.size).toBe(0);
    expect(d1.raw.prepare('SELECT status FROM upload_items WHERE id = ?').get('upi_1').status).toBe('open');
  });

  it('bestand: streamt eigen bestand met veilige headers, andere klant 404', async () => {
    item('upi_1');
    const { upload } = await (await up('usr_1', 'upi_1', PNG, 'mijn "logo".png')).json();
    const res = await call(`/api/portal/aanleveren/bestand?id=${upload.id}`, { userId: 'usr_1' });
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
    expect(res.headers.get('content-disposition')).toContain('attachment; filename="mijn logo.png"');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);
    expect((await call(`/api/portal/aanleveren/bestand?id=${upload.id}`, { userId: 'usr_9' })).status).toBe(404);
  });
});
