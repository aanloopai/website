// Klant-API /api/portal/overeenkomst*: consent-regels, OTP-lockout, ondertekenen.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../src/lib/agreement-pdf.js', () => ({
  buildAgreementPdf: vi.fn(async ({ concept }) => new Uint8Array([0x25, 0x50, 0x44, 0x46, concept ? 0x43 : 0x53])),
}));

import { handlePortalApi } from '../src/lib/portal-routes.js';
import { TEMPLATE_SLUGS } from '../src/lib/overeenkomst-core.js';
import {
  SECRET, makeD1, makeKv, authedRequest, seedCustomers,
} from './_portal-test-helpers.js';

const originalFetch = globalThis.fetch;
// Synthetic PNG header (magic + IHDR with the given size); the PDF builder is mocked in this file.
function pngUrl(w, h) {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8); b.write('IHDR', 12); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20);
  return `data:image/png;base64,${b.toString('base64')}`;
}
const PNG_1PX = pngUrl(300, 100);
const WORDS = Array.from({ length: 40 }, (_, i) => `woord${i}`).join(' '); // min = 20s

let d1; let kv; let env; let mails; let telegrams;

function seedAgreement({ status = 'sent', consents = 0 } = {}) {
  const q = d1.raw;
  q.prepare('INSERT INTO agr_templates (id, slug, version, title, body_markdown, created_at) VALUES (?,?,?,?,?,?)')
    .run('tpl_o', 'overeenkomst', '1.0', 'Overeenkomst', `Hallo {{klant_bedrijfsnaam}}. ${WORDS}`, 1);
  q.prepare(`INSERT INTO agreements (id, customer_id, title, status, variables_json, created_at)
             VALUES ('agr_1','cus_1','Overeenkomst Foralle',?, '{"klant_bedrijfsnaam":"Foralle BV"}', 1)`).run(status);
  for (const [i, slug] of TEMPLATE_SLUGS.entries()) {
    const md = `# ${slug}\n\n${WORDS}`;
    q.prepare(`INSERT INTO agreement_documents (id, agreement_id, template_id, template_slug, template_version, order_index, title, rendered_markdown, content_sha256)
               VALUES (?,?,?,?,?,?,?,?,?)`).run(`agd_${i}`, 'agr_1', 'tpl_o', slug, '1.0', i, slug, md, `${'h'.repeat(20)}${i}`);
  }
  for (let i = 0; i < consents; i++) addConsent(i);
}
function addConsent(i, userId = 'usr_1') {
  d1.raw.prepare(`INSERT INTO agr_consents (id, agreement_document_id, user_id, scrolled_to_end_at, time_on_document_sec, checkbox_at, created_at, superseded)
                  VALUES (?,?,?,?,?,?,?,0)`).run(`cns_${i}_${userId}`, `agd_${i}`, userId, 1, 60, 2, 2);
}
function backdateOpen(docId, userId = 'usr_1') {
  d1.raw.prepare('INSERT OR REPLACE INTO agr_doc_opens (agreement_document_id, user_id, opened_at) VALUES (?,?,?)')
    .run(docId, userId, Date.now() - 120000);
}
const call = async (path, opts) => handlePortalApi(await authedRequest(path, opts), env);
const post = (path, userId, json) => call(path, { userId, method: 'POST', json });

beforeEach(() => {
  d1 = makeD1(); kv = makeKv(); seedCustomers(d1);
  mails = []; telegrams = [];
  env = {
    PORTAL_DB: d1, PORTAL_SESSION_SECRET: SECRET, GOOGLE_TOKENS: makeKv(), PORTAL_FILES: kv,
    BREVO_API_KEY: 'k', TELEGRAM_BOT_TOKEN: 't', TELEGRAM_CHAT_ID: 'c',
  };
  globalThis.fetch = vi.fn(async (url, init) => {
    if (String(url).includes('brevo')) mails.push(JSON.parse(init.body));
    else if (String(url).includes('telegram')) telegrams.push(JSON.parse(init.body));
    return new Response('{}', { status: 200 });
  });
});
afterEach(() => { globalThis.fetch = originalFetch; });

describe('consent', () => {
  it('weigert wanneer het document niet geopend is', async () => {
    seedAgreement();
    const res = await post('/api/portal/overeenkomst/consent', 'usr_1',
      { document_id: 'agd_0', scrolled_to_end_at: Date.now(), time_on_document_sec: 999 });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Document is nog niet geopend');
  });

  it('accepteert direct na openen + scrollen (geen minimale leestijd meer, owner 2026-10-09)', async () => {
    seedAgreement();
    const open = await post('/api/portal/overeenkomst/open', 'usr_1', { document_id: 'agd_0' });
    expect(open.status).toBe(200);
    const res = await post('/api/portal/overeenkomst/consent', 'usr_1',
      { document_id: 'agd_0', scrolled_to_end_at: Date.now(), time_on_document_sec: 1 });
    expect(res.status).toBe(200);
  });

  it('weigert een scrolled_to_end_at dat vóór het openen ligt', async () => {
    seedAgreement(); backdateOpen('agd_0');
    const res = await post('/api/portal/overeenkomst/consent', 'usr_1',
      { document_id: 'agd_0', scrolled_to_end_at: 1, time_on_document_sec: 60 });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Lees het document volledig voordat je akkoord gaat.');
  });

  it('weigert zonder scrolled_to_end_at', async () => {
    seedAgreement(); backdateOpen('agd_0');
    const res = await post('/api/portal/overeenkomst/consent', 'usr_1', { document_id: 'agd_0', time_on_document_sec: 60 });
    expect(res.status).toBe(400);
  });

  it('accepteert een geldige consent, zet status op in_progress en vervangt een eerdere consent', async () => {
    seedAgreement(); backdateOpen('agd_0');
    const body = { document_id: 'agd_0', scrolled_to_end_at: Date.now(), time_on_document_sec: 60 };
    const r1 = await post('/api/portal/overeenkomst/consent', 'usr_1', body);
    expect(r1.status).toBe(200);
    expect((await r1.json()).consent.time_on_document_sec).toBe(60);
    expect(d1.raw.prepare('SELECT status FROM agreements WHERE id = ?').get('agr_1').status).toBe('in_progress');
    const r2 = await post('/api/portal/overeenkomst/consent', 'usr_1', body);
    expect(r2.status).toBe(200);
    const rows = d1.raw.prepare('SELECT superseded FROM agr_consents').all();
    expect(rows.map((r) => r.superseded).sort()).toEqual([0, 1]); // nooit verwijderd
    expect(d1.raw.prepare("SELECT COUNT(*) AS n FROM portal_audit_log WHERE action = 'consent_vervangen'").get().n).toBe(1);
  });

  it('weigert scrolled_to_end_at vóór opened_at en in de toekomst', async () => {
    seedAgreement(); backdateOpen('agd_0');
    for (const scrolled of [1, Date.now() + 60000]) {
      const res = await post('/api/portal/overeenkomst/consent', 'usr_1',
        { document_id: 'agd_0', scrolled_to_end_at: scrolled, time_on_document_sec: 60 });
      expect(res.status).toBe(400);
    }
  });

  it('kapt time_on_document_sec af op de server-gemeten tijd (+2s)', async () => {
    seedAgreement(); backdateOpen('agd_0'); // 120s geleden geopend
    const res = await post('/api/portal/overeenkomst/consent', 'usr_1',
      { document_id: 'agd_0', scrolled_to_end_at: Date.now(), time_on_document_sec: 99999 });
    expect(res.status).toBe(200);
    expect((await res.json()).consent.time_on_document_sec).toBeLessThanOrEqual(122);
  });

  it('weigert consent zolang kvk ontbreekt (btw is optioneel)', async () => {
    seedAgreement(); backdateOpen('agd_0');
    d1.raw.prepare("UPDATE customers SET kvk = '' WHERE id = 'cus_1'").run();
    const res = await post('/api/portal/overeenkomst/consent', 'usr_1',
      { document_id: 'agd_0', scrolled_to_end_at: Date.now(), time_on_document_sec: 60 });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Vul eerst de bedrijfsgegevens aan');
  });

  it('kijker krijgt 403 op open, consent, otp, ondertekenen en bedrijfsgegevens', async () => {
    seedAgreement({ consents: 3 });
    for (const [p, json] of [
      ['/api/portal/overeenkomst/open', { document_id: 'agd_0' }],
      ['/api/portal/overeenkomst/consent', { document_id: 'agd_0' }],
      ['/api/portal/overeenkomst/otp/sturen', { agreement_id: 'agr_1' }],
      ['/api/portal/overeenkomst/ondertekenen', { agreement_id: 'agr_1' }],
      ['/api/portal/overeenkomst/bedrijfsgegevens', { kvk: '12345678', btw_id: 'NL123456789B01' }],
    ]) {
      const res = await post(p, 'usr_2', json);
      expect(res.status, p).toBe(403);
    }
  });

  it('een andere klant ziet de overeenkomst niet (404)', async () => {
    seedAgreement();
    expect((await call('/api/portal/overeenkomst?id=agr_1', { userId: 'usr_9' })).status).toBe(404);
    expect((await post('/api/portal/overeenkomst/open', 'usr_9', { document_id: 'agd_0' })).status).toBe(404);
  });
});

describe('GET detail + bevriezen', () => {
  it('rendert opnieuw zolang er geen consent is, en bevriest daarna', async () => {
    seedAgreement();
    const first = await (await call('/api/portal/overeenkomst?id=agr_1', { userId: 'usr_1' })).json();
    expect(first.ok).toBe(true);
    expect(first.documents).toHaveLength(3);
    expect(first.bedrijf_compleet).toBe(true);
    expect(first.documents[0].min_read_sec).toBe(0);
    expect(first.documents[0].consent).toBeNull();
    const md0 = d1.raw.prepare('SELECT rendered_markdown FROM agreement_documents WHERE id = ?').get('agd_0').rendered_markdown;
    expect(md0).toContain('Hallo Foralle BV.'); // herrender vanuit sjabloon met variabelen
    addConsent(0);
    d1.raw.prepare("UPDATE agr_templates SET body_markdown = 'GEWIJZIGD' WHERE id = 'tpl_o'").run();
    await call('/api/portal/overeenkomst?id=agr_1', { userId: 'usr_1' });
    const md1 = d1.raw.prepare('SELECT rendered_markdown FROM agreement_documents WHERE id = ?').get('agd_0').rendered_markdown;
    expect(md1).toBe(md0);
  });

  it('draft-overeenkomsten zijn onzichtbaar', async () => {
    seedAgreement({ status: 'draft' });
    expect((await call('/api/portal/overeenkomst?id=agr_1', { userId: 'usr_1' })).status).toBe(404);
    const l = await (await call('/api/portal/overeenkomst/lijst', { userId: 'usr_1' })).json();
    expect(l.agreements).toHaveLength(0);
  });
});

describe('bedrijfsgegevens', () => {
  it('is vergrendeld (409) zodra er een consent bestaat', async () => {
    seedAgreement({ consents: 1 });
    const res = await post('/api/portal/overeenkomst/bedrijfsgegevens', 'usr_1', { kvk: '87654321', btw_id: 'NL987654321B02' });
    expect(res.status).toBe(409);
    expect(d1.raw.prepare('SELECT kvk FROM customers WHERE id = ?').get('cus_1').kvk).toBe('12345678');
  });

  it('btw is optioneel: alleen kvk volstaat; een ingevulde maar ongeldige btw blijft 400', async () => {
    const onlyKvk = await post('/api/portal/overeenkomst/bedrijfsgegevens', 'usr_9', { kvk: '87601234', btw_id: '' });
    expect(onlyKvk.status).toBe(200);
    expect(d1.raw.prepare('SELECT kvk, btw_id FROM customers WHERE id = ?').get('cus_2')).toMatchObject({ kvk: '87601234', btw_id: '' });
    const list = await (await call('/api/portal/overeenkomst/lijst', { userId: 'usr_9' })).json();
    expect(list.bedrijf_compleet).toBe(true);
    const badBtw = await post('/api/portal/overeenkomst/bedrijfsgegevens', 'usr_9', { kvk: '87601234', btw_id: 'x' });
    expect(badBtw.status).toBe(400);
  });

  it('valideert kvk en btw en slaat genormaliseerd op', async () => {
    const bad = await post('/api/portal/overeenkomst/bedrijfsgegevens', 'usr_1', { kvk: '123', btw_id: 'x' });
    expect(bad.status).toBe(400);
    const ok = await post('/api/portal/overeenkomst/bedrijfsgegevens', 'usr_9', { kvk: '8760 1234', btw_id: 'nl 987654321 b02' });
    expect(ok.status).toBe(200);
    expect(d1.raw.prepare('SELECT kvk, btw_id FROM customers WHERE id = ?').get('cus_2'))
      .toMatchObject({ kvk: '87601234', btw_id: 'NL987654321B02' });
  });
});

async function sendOtp() {
  const sent = await post('/api/portal/overeenkomst/otp/sturen', 'usr_1', { agreement_id: 'agr_1' });
  expect(sent.status).toBe(200);
  return /(\d{6})<\/strong>/.exec(mails.at(-1).htmlContent)[1];
}
const verify = (code) => post('/api/portal/overeenkomst/otp/verifieer', 'usr_1', { agreement_id: 'agr_1', code });

describe('OTP', () => {
  it('weigert zonder 3 consents', async () => {
    seedAgreement({ consents: 2 });
    const res = await post('/api/portal/overeenkomst/otp/sturen', 'usr_1', { agreement_id: 'agr_1' });
    expect(res.status).toBe(400);
    expect(mails).toHaveLength(0);
  });

  it('mailt een code en bewaart alleen de hash', async () => {
    seedAgreement({ consents: 3 });
    const code = await sendOtp();
    expect(mails.at(-1).subject).toBe('Je verificatiecode voor Mijn AanloopAI');
    expect(mails.at(-1).to[0].email).toBe('ron@klant.nl');
    const row = d1.raw.prepare('SELECT code_hash FROM agr_otp').get();
    expect(row.code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.code_hash).not.toContain(code);
  });

  it('sluit na 5 foute pogingen af, ook voor de juiste code', async () => {
    seedAgreement({ consents: 3 });
    const code = await sendOtp();
    const wrong = code === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) expect((await verify(wrong)).status).toBe(400);
    const locked = await verify(code);
    expect(locked.status).toBe(429);
    expect((await locked.json()).error).toBe('Te veel pogingen. Vraag een nieuwe code aan.');
  });

  it('consents van een andere gebruiker tellen niet mee voor de eigenaar', async () => {
    seedAgreement();
    for (let i = 0; i < 3; i++) addConsent(i, 'usr_3'); // bewerker heeft akkoord gegeven, eigenaar niet
    const res = await post('/api/portal/overeenkomst/otp/sturen', 'usr_1', { agreement_id: 'agr_1' });
    expect(res.status).toBe(400);
    expect(mails).toHaveLength(0);
  });

  it('verifieert de juiste code', async () => {
    seedAgreement({ consents: 3 });
    const code = await sendOtp();
    expect(await (await verify(code)).json()).toEqual({ ok: true, verified: true });
  });

  it('rate-limit: maximaal 5 codes per 15 minuten', async () => {
    seedAgreement({ consents: 3 });
    for (let i = 0; i < 5; i++) {
      expect((await post('/api/portal/overeenkomst/otp/sturen', 'usr_1', { agreement_id: 'agr_1' })).status).toBe(200);
    }
    expect((await post('/api/portal/overeenkomst/otp/sturen', 'usr_1', { agreement_id: 'agr_1' })).status).toBe(429);
  });
});

describe('ondertekenen', () => {
  const sign = (extra = {}, userId = 'usr_1') => post('/api/portal/overeenkomst/ondertekenen', userId,
    { agreement_id: 'agr_1', typed_name: 'Ron Houter', signature_png: PNG_1PX, bevoegd: true, alles_aanvaard: true, bedragen_akkoord: true, ...extra });

  it('weigert zonder 3 consents', async () => {
    seedAgreement({ consents: 2 });
    expect((await sign()).status).toBe(400);
    expect(d1.raw.prepare('SELECT status FROM agreements WHERE id = ?').get('agr_1').status).toBe('sent');
  });

  it('weigert zonder geverifieerde OTP', async () => {
    seedAgreement({ consents: 3 });
    expect((await sign()).status).toBe(400);
  });

  it('weigert bewerker (alleen eigenaar tekent)', async () => {
    seedAgreement({ consents: 3 });
    expect((await sign({}, 'usr_3')).status).toBe(403);
  });

  it('volledige flow: opslaan, PDF in KV, 2 mails met bijlage, Telegram, audit, tweede poging 409', async () => {
    seedAgreement({ consents: 3 });
    await verify(await sendOtp());
    mails.length = 0;

    expect((await sign({ typed_name: 'abc' })).status).toBe(400);
    expect((await sign({ bevoegd: false })).status).toBe(400);
    const noAccept = await sign({ alles_aanvaard: false });
    expect(noAccept.status).toBe(400);
    expect((await noAccept.json()).error).toBe('Aanvaard eerst alle voorwaarden.');
    const noAmounts = await sign({ bedragen_akkoord: false });
    expect(noAmounts.status).toBe(400);
    expect((await noAmounts.json()).error).toBe('Bevestig eerst de bedragen.');
    expect((await sign({ bedragen_akkoord: undefined })).status).toBe(400);
    expect((await sign({ signature_png: 'data:image/png;base64,AAAA' })).status).toBe(400);

    const res = await sign();
    expect(res.status).toBe(200);
    expect((await res.json()).pdf_url).toBe('/api/portal/overeenkomst/pdf?id=agr_1');

    const ag = d1.raw.prepare('SELECT * FROM agreements WHERE id = ?').get('agr_1');
    expect(ag.status).toBe('signed');
    expect(ag.pdf_key).toBe('portal:pdf:agr_1');
    expect(ag.evidence_sha256).toMatch(/^[0-9a-f]{64}$/);
    const sig = d1.raw.prepare('SELECT * FROM agr_signatures').get();
    expect(sig.evidence_sha256).toBe(ag.evidence_sha256);
    expect(sig.accepted_all_at).toBe(sig.signed_at);
    expect(sig.amounts_accepted_at).toBe(sig.signed_at);
    expect(kv.store.has(sig.signature_key)).toBe(true);
    expect(kv.store.has('portal:pdf:agr_1')).toBe(true);

    expect(mails).toHaveLength(2);
    expect(mails.map((m) => m.to[0].email).sort()).toEqual(['m.dogan@aanloopai.nl', 'ron@klant.nl']);
    expect(mails.every((m) => m.attachment?.[0]?.name === 'overeenkomst-agr_1.pdf' && m.attachment[0].content)).toBe(true);
    expect(mails.find((m) => m.to[0].email === 'ron@klant.nl').subject).toBe('Je overeenkomst met AanloopAI is ondertekend');
    expect(mails.find((m) => m.to[0].email !== 'ron@klant.nl').subject).toBe('[Portaal] Overeenkomst ondertekend: Foralle BV');
    expect(telegrams).toHaveLength(1);
    expect(d1.raw.prepare("SELECT COUNT(*) AS n FROM portal_audit_log WHERE action = 'ondertekend'").get().n).toBe(1);

    expect((await sign()).status).toBe(409);

    const pdf = await call('/api/portal/overeenkomst/pdf?id=agr_1', { userId: 'usr_1' });
    expect(pdf.status).toBe(200);
    expect(pdf.headers.get('content-type')).toBe('application/pdf');
    expect(pdf.headers.get('cache-control')).toBe('private, no-store');
    expect(pdf.headers.get('content-disposition')).toBe('attachment; filename="overeenkomst-agr_1.pdf"');
  });

  it('mailstoring is niet fataal: handtekening blijft opgeslagen', async () => {
    seedAgreement({ consents: 3 });
    await verify(await sendOtp());
    globalThis.fetch = vi.fn(async () => new Response('boem', { status: 500 }));
    expect((await sign()).status).toBe(200);
    expect(d1.raw.prepare('SELECT status FROM agreements WHERE id = ?').get('agr_1').status).toBe('signed');
  });

  it('weigert PNG-afmetingen buiten 10..2000 px (400, niets opgeslagen)', async () => {
    seedAgreement({ consents: 3 });
    await verify(await sendOtp());
    for (const url of [pngUrl(9, 100), pngUrl(100, 9), pngUrl(2001, 100), pngUrl(100, 5000)]) {
      const res = await sign({ signature_png: url });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('Ongeldige handtekening');
    }
    expect(d1.raw.prepare('SELECT COUNT(*) AS n FROM agr_signatures').get().n).toBe(0);
  });

  it('orphan handtekening-rij sluit de klant niet buiten: wordt opgeruimd en opnieuw geprobeerd', async () => {
    seedAgreement({ consents: 3 });
    await verify(await sendOtp());
    d1.raw.prepare(`INSERT INTO agr_signatures (id, agreement_id, user_id, typed_name, signature_key, otp_verified_at, signed_at, evidence_sha256)
                    VALUES ('sig_orphan','agr_1','usr_1','Ron','portal:sig:sig_orphan',1,?, 'x')`).run(Date.now() - 5 * 60 * 1000);
    await kv.put('portal:sig:sig_orphan', new ArrayBuffer(1), {});
    expect((await sign()).status).toBe(200);
    expect(kv.store.has('portal:sig:sig_orphan')).toBe(false);
    const rows = d1.raw.prepare('SELECT id FROM agr_signatures').all();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).not.toBe('sig_orphan');
    expect(d1.raw.prepare('SELECT status FROM agreements WHERE id = ?').get('agr_1').status).toBe('signed');
  });

  it('een verse (nog lopende) handtekening-claim blijft staan: 409', async () => {
    seedAgreement({ consents: 3 });
    await verify(await sendOtp());
    d1.raw.prepare(`INSERT INTO agr_signatures (id, agreement_id, user_id, typed_name, signature_key, otp_verified_at, signed_at, evidence_sha256)
                    VALUES ('sig_fresh','agr_1','usr_1','Ron','portal:sig:sig_fresh',1,?, 'x')`).run(Date.now());
    expect((await sign()).status).toBe(409);
    expect(d1.raw.prepare('SELECT id FROM agr_signatures').all().map((r) => r.id)).toEqual(['sig_fresh']);
  });

  it('admin-annulering tijdens het tekenen: 409, handtekening en PDF teruggedraaid, geen audit', async () => {
    seedAgreement({ consents: 3 });
    await verify(await sendOtp());
    const realPut = kv.put.bind(kv);
    kv.put = async (key, ...rest) => { // cancel right after the PDF is stored, before the final UPDATE
      await realPut(key, ...rest);
      if (key === 'portal:pdf:agr_1') d1.raw.prepare("UPDATE agreements SET status = 'cancelled' WHERE id = 'agr_1'").run();
    };
    const res = await sign();
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('Overeenkomst kan niet meer ondertekend worden');
    expect(d1.raw.prepare('SELECT COUNT(*) AS n FROM agr_signatures').get().n).toBe(0);
    expect(kv.store.has('portal:pdf:agr_1')).toBe(false);
    expect(d1.raw.prepare("SELECT COUNT(*) AS n FROM portal_audit_log WHERE action = 'ondertekend'").get().n).toBe(0);
    expect(mails).toHaveLength(1); // only the OTP mail
  });

  it('ondertekende overeenkomst zonder PDF in KV: 404 in plaats van concept-PDF', async () => {
    seedAgreement({ consents: 3 });
    await verify(await sendOtp());
    expect((await sign()).status).toBe(200);
    kv.store.delete('portal:pdf:agr_1');
    const res = await call('/api/portal/overeenkomst/pdf?id=agr_1', { userId: 'usr_1' });
    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe('PDF niet gevonden');
  });

  it('concept-PDF voor niet-ondertekende overeenkomst', async () => {
    seedAgreement();
    const res = await call('/api/portal/overeenkomst/pdf?id=agr_1', { userId: 'usr_1' });
    expect(res.status).toBe(200);
    expect(new Uint8Array(await res.arrayBuffer())[4]).toBe(0x43);
  });
});

describe('totalen + opties', () => {
  const VARS = '{"klant_bedrijfsnaam":"Foralle BV","prijs_website":"€ 6.000","prijs_optie_3d":"€ 1.500","optie_3d_gekozen":"nee","prijs_beheer_maand":"€ 250","prijs_lead":"€ 25","lead_bundel_aantal":"10","lead_bundel_prijs":"€ 225"}';
  const getDetail = async (userId = 'usr_1') => (await call('/api/portal/overeenkomst?id=agr_1', { userId })).json();
  const setOptie = (gekozen, userId = 'usr_1') => post('/api/portal/overeenkomst/opties', userId, { agreement_id: 'agr_1', optie_3d_gekozen: gekozen });
  beforeEach(() => {
    seedAgreement();
    d1.raw.prepare('UPDATE agreements SET variables_json = ? WHERE id = ?').run(VARS, 'agr_1');
    d1.raw.prepare("UPDATE agr_templates SET body_markdown = 'Optie 3D gekozen = {{optie_3d_gekozen}}. ' || ? WHERE id = 'tpl_o'").run(WORDS);
    d1.raw.prepare("UPDATE agreement_documents SET rendered_markdown = 'x ' || ? WHERE id = 'agd_0'").run(WORDS);
  });

  it('GET detail levert totalen, amounts_label en opties (wijzigbaar zolang er geen consent is)', async () => {
    const d = await getDetail();
    expect(d.totalen.eenmalig).toBe(6000);
    expect(d.totalen.maandelijks).toBe(250);
    expect(d.totalen.leads).toEqual({ per_lead: 25, bundel_aantal: 10, bundel_prijs: 225 });
    expect(d.opties.optie_3d).toEqual({ gekozen: false, prijs: 1500, wijzigbaar: true });
    expect(d.amounts_label).toContain('€ 6.000 excl. btw');
  });

  it('POST opties: zet ja/nee, rendert documenten opnieuw, schrijft audit', async () => {
    const res = await setOptie(true);
    expect(res.status).toBe(200);
    expect(JSON.parse(d1.raw.prepare('SELECT variables_json FROM agreements WHERE id = ?').get('agr_1').variables_json).optie_3d_gekozen).toBe('ja');
    expect(d1.raw.prepare('SELECT rendered_markdown FROM agreement_documents WHERE id = ?').get('agd_0').rendered_markdown).toContain('gekozen = ja');
    const d = await getDetail();
    expect(d.opties.optie_3d.gekozen).toBe(true);
    expect(d.totalen.eenmalig).toBe(7500);
    expect(d1.raw.prepare("SELECT COUNT(*) AS n FROM portal_audit_log WHERE action = 'optie_gewijzigd'").get().n).toBe(1);
    expect((await setOptie(false)).status).toBe(200);
    expect((await getDetail()).totalen.eenmalig).toBe(6000);
  });

  it('POST opties: 409 zodra er een akkoord is, variabelen blijven onaangeroerd', async () => {
    addConsent(0);
    const res = await setOptie(true);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('Opties zijn bevroren na de eerste akkoordverklaring.');
    expect(JSON.parse(d1.raw.prepare('SELECT variables_json FROM agreements WHERE id = ?').get('agr_1').variables_json).optie_3d_gekozen).toBe('nee');
    expect((await getDetail()).opties.optie_3d.wijzigbaar).toBe(false);
  });

  it('POST opties: 409 bij ondertekende overeenkomst, 400 bij niet-boolean, 403 voor kijker, 404 voor andere klant', async () => {
    expect((await post('/api/portal/overeenkomst/opties', 'usr_1', { agreement_id: 'agr_1', optie_3d_gekozen: 'ja' })).status).toBe(400);
    expect((await setOptie(true, 'usr_2')).status).toBe(403);
    expect((await setOptie(true, 'usr_9')).status).toBe(404);
    d1.raw.prepare("UPDATE agreements SET status = 'signed' WHERE id = 'agr_1'").run();
    expect((await setOptie(true)).status).toBe(409);
  });

  it('bewerker mag de optie wijzigen', async () => {
    expect((await setOptie(true, 'usr_3')).status).toBe(200);
  });
});
