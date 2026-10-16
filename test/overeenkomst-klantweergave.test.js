// Admin preview endpoint: staff-only, exact customer payload, strictly no writes.
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/lib/agreement-pdf.js', () => ({
  buildAgreementPdf: vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46])),
}));

import { handlePortalApi } from '../src/lib/portal-routes.js';
import { handleAdminApi } from '../src/lib/admin-routes.js';
import { handleOvereenkomstAdminApi } from '../src/lib/overeenkomst-admin-routes.js';
import { TEMPLATE_SLUGS } from '../src/lib/overeenkomst-core.js';
import {
  SECRET, makeD1, makeKv, authedRequest, seedCustomers,
} from './_portal-test-helpers.js';

const WORDS = Array.from({ length: 40 }, (_, i) => `woord${i}`).join(' ');
const VARS = '{"prijs_website":"€ 6.000","prijs_optie_3d":"€ 1.500","optie_3d_gekozen":"ja","prijs_beheer_maand":"€ 250","prijs_lead":"€ 25","lead_bundel_aantal":"10","lead_bundel_prijs":"€ 225"}';
const STAFF = { id: 'usr_staff', email: 'm@aanloopai.nl', role: 'staff' };

let d1; let env;

function seed(status = 'sent') {
  const q = d1.raw;
  q.prepare('INSERT INTO agr_templates (id, slug, version, title, body_markdown, created_at) VALUES (?,?,?,?,?,?)')
    .run('tpl_o', 'overeenkomst', '1.0', 'Overeenkomst', `Origineel. ${WORDS}`, 1);
  q.prepare(`INSERT INTO agreements (id, customer_id, title, status, variables_json, created_at)
             VALUES ('agr_1','cus_1','Overeenkomst Foralle',?,?,1)`).run(status, VARS);
  for (const [i, slug] of TEMPLATE_SLUGS.entries()) {
    q.prepare(`INSERT INTO agreement_documents (id, agreement_id, template_id, template_slug, template_version, order_index, title, rendered_markdown, content_sha256)
               VALUES (?,?,?,?,?,?,?,?,?)`).run(`agd_${i}`, 'agr_1', 'tpl_o', slug, '1.0', i, slug, `Opgeslagen ${i}. ${WORDS}`, `${'h'.repeat(20)}${i}`);
  }
}
const snapshot = () => JSON.stringify(['agreements', 'agreement_documents', 'agr_doc_opens', 'agr_consents', 'agr_otp', 'agr_signatures', 'portal_audit_log', 'customers']
  .map((t) => d1.raw.prepare(`SELECT * FROM ${t} ORDER BY 1`).all()));
const preview = (user = STAFF, id = 'agr_1') => handleOvereenkomstAdminApi(
  new Request(`https://aanloopai.nl/api/admin/overeenkomst/klantweergave?id=${id}`), env, user,
  new URL(`https://aanloopai.nl/api/admin/overeenkomst/klantweergave?id=${id}`),
);

beforeEach(() => {
  d1 = makeD1(); seedCustomers(d1);
  env = { PORTAL_DB: d1, PORTAL_SESSION_SECRET: SECRET, GOOGLE_TOKENS: makeKv(), PORTAL_FILES: makeKv() };
});

describe('GET /api/admin/overeenkomst/klantweergave', () => {
  it('is staff-only (module en dispatcher)', async () => {
    seed();
    expect((await preview({ id: 'usr_1', role: 'eigenaar' })).status).toBe(403);
    expect((await preview(null)).status).toBe(403);
    const viaDispatcher = await handleAdminApi(
      await authedRequest('/api/admin/overeenkomst/klantweergave?id=agr_1', { userId: 'usr_1' }), env,
    );
    expect(viaDispatcher.status).toBe(403);
  });

  it('schrijft niets: geen re-render, geen open, geen audit, ook niet voor een concept', async () => {
    seed('draft');
    d1.raw.prepare("UPDATE agr_templates SET body_markdown = 'GEWIJZIGD {{prijs_website}}' WHERE id = 'tpl_o'").run();
    const before = snapshot();
    const res = await preview();
    expect(res.status).toBe(200);
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(j.agreement.status).toBe('draft');
    expect(j.documents).toHaveLength(3);
    expect(j.documents[0].html).toContain('Opgeslagen 0.'); // opgeslagen tekst, niet opnieuw gerenderd
    expect(j.totalen.eenmalig).toBe(7500);
    expect(snapshot()).toBe(before);
  });

  it('geeft exact de klant-GET-payload (bevroren overeenkomst, zodat de klant-GET ook niets herrendert)', async () => {
    seed('in_progress');
    d1.raw.prepare(`INSERT INTO agr_consents (id, agreement_document_id, user_id, scrolled_to_end_at, time_on_document_sec, checkbox_at, created_at, superseded)
                    VALUES ('cns_0','agd_0','usr_1',1,60,2,2,0)`).run();
    const staff = await (await preview()).json();
    const klant = await (await handlePortalApi(await authedRequest('/api/portal/overeenkomst?id=agr_1', { userId: 'usr_1' }), env)).json();
    expect(staff).toEqual(klant);
    expect(staff.documents[0].consent).toMatchObject({ checkbox_at: 2 });
    expect(staff.opties.optie_3d.wijzigbaar).toBe(false);
  });

  it('onbekende overeenkomst -> 404', async () => {
    expect((await preview(STAFF, 'agr_nope')).status).toBe(404);
  });
});
