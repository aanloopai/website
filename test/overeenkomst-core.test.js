import { describe, it, expect } from 'vitest';
import {
  FIXED_VARS, TEMPLATE_SLUGS, CONSENT_LABELS, NO_PASSWORD_NOTICE, AUTHORIZED_LABEL,
  renderTemplate, buildVars, minReadSeconds, computeEvidenceSha256, sha256Hex,
  DEFAULT_UPLOAD_ITEMS, formatAmsterdam, writeAudit,
  parseEuro, formatEuro, computeTotals, AMOUNTS_LABEL, totalsLines,
} from '../src/lib/overeenkomst-core.js';

describe('renderTemplate', () => {
  it('replaces vars, tolerates spaces, flags unknown ones', () => {
    const out = renderTemplate('A {{x}} B {{ y }} C {{z}} D {{opt|ja/nee}}', { x: '1', y: '2', opt: 'nee' });
    expect(out).toBe('A 1 B 2 C [ontbreekt: z] D nee');
  });
  it('renders known-but-empty vars as empty string', () => {
    expect(renderTemplate('KvK {{k}}.', { k: '' })).toBe('KvK .');
  });
});

describe('buildVars', () => {
  it('merges variables_json, fixed vars, datum, id and customer overrides', () => {
    const v = buildVars(
      { id: 'agr_1', variables_json: '{"klant_kvk":"","klant_btw":"","project_naam":"P"}' },
      { kvk: '12345678', btw_id: 'NL123456789B01' },
    );
    expect(v.project_naam).toBe('P');
    expect(v.klant_kvk).toBe('12345678');
    expect(v.klant_btw).toBe('NL123456789B01');
    expect(v.agreement_id).toBe('agr_1');
    expect(v.aanloopai_btw).toBe(FIXED_VARS.aanloopai_btw);
    expect(v.datum).toMatch(/^\d{1,2} (januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december) \d{4}$/);
  });
  it('renders an empty btw number as a dash (btw is optional)', () => {
    expect(buildVars({ id: 'a', variables_json: '{"klant_btw":""}' }, { kvk: '12345678', btw_id: '' }).klant_btw).toBe('—');
    expect(buildVars({ id: 'a', variables_json: '{}' }, { kvk: '12345678', btw_id: null }).klant_btw).toBe('—');
  });
  it('keeps variable value when customer value is empty and survives bad JSON', () => {
    expect(buildVars({ id: 'a', variables_json: '{"klant_kvk":"99999999"}' }, { kvk: '', btw_id: null }).klant_kvk).toBe('99999999');
    expect(buildVars({ id: 'a', variables_json: '{oops' }, {}).agreement_id).toBe('a');
  });
});

describe('minReadSeconds', () => {
  it('enforces no minimum read time (owner decision 2026-10-09): scroll-to-end is the only gate', () => {
    expect(minReadSeconds('kort')).toBe(0);
    expect(minReadSeconds(Array(800).fill('w').join(' '))).toBe(0);
  });
});

describe('evidence hash', () => {
  const base = {
    agreementId: 'agr_1', userId: 'usr_1', contentHashes: ['h1', 'h2'], typedName: 'Jan', signedAtMs: 5,
    signatureSha256: 'sig', otpVerifiedAt: 4, consentCheckboxAts: [1, 2],
  };
  it('is sha256 of the fixed-order JSON object and deterministic', async () => {
    const a = await computeEvidenceSha256(base);
    expect(a).toBe(await sha256Hex(JSON.stringify({
      agreementId: 'agr_1', userId: 'usr_1', contentHashes: ['h1', 'h2'], typedName: 'Jan', signedAtMs: 5,
      signatureSha256: 'sig', otpVerifiedAt: 4, consentCheckboxAts: [1, 2],
    })));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    // caller key order is irrelevant
    expect(await computeEvidenceSha256({ ...base, signedAtMs: 5, agreementId: 'agr_1' })).toBe(a);
  });
  it('changes when any covered field changes', async () => {
    const a = await computeEvidenceSha256(base);
    for (const patch of [
      { agreementId: 'agr_2' }, { userId: 'usr_2' }, { contentHashes: ['h1', 'h3'] }, { typedName: 'Piet' },
      { signedAtMs: 6 }, { signatureSha256: 'sig2' }, { otpVerifiedAt: 3 }, { consentCheckboxAts: [1, 3] },
      { amountsAcceptedAt: 7 },
    ]) {
      expect(await computeEvidenceSha256({ ...base, ...patch }), JSON.stringify(patch)).not.toBe(a);
    }
  });
});

describe('constants and labels', () => {
  it('exposes template slugs, labels and notices', () => {
    expect(TEMPLATE_SLUGS).toEqual(['overeenkomst', 'algemene-voorwaarden', 'privacy-verwerker']);
    for (const s of TEMPLATE_SLUGS) expect(CONSENT_LABELS[s]).toBeTruthy();
    expect(NO_PASSWORD_NOTICE).toContain('Deel geen wachtwoorden');
    expect(AUTHORIZED_LABEL('Foralle BV')).toContain('bevoegd om Foralle BV te vertegenwoordigen');
  });
  it('formats Amsterdam time (CEST = UTC+2)', () => {
    expect(formatAmsterdam(Date.UTC(2026, 9, 9, 10, 5))).toBe('9-10-2026 12:05');
    expect(formatAmsterdam(Date.UTC(2026, 0, 5, 10, 5))).toBe('5-1-2026 11:05');
  });
});

describe('DEFAULT_UPLOAD_ITEMS', () => {
  it('returns the 13 SPEC items with sane constraints', () => {
    const items = DEFAULT_UPLOAD_ITEMS('forallekeukens.nl');
    expect(items).toHaveLength(13);
    expect(items[5].label).toContain('forallekeukens.nl');
    expect(items[4].type).toBe('boolean');
    expect(items[4].description).toBe('Ik bevestig dat de klanten toestemming hebben gegeven');
    expect(items[9].type).toBe('text');
    expect(items[10].type).toBe('text');
    for (const i of items) expect(i.max_mb).toBeLessThanOrEqual(25);
    expect(items[2].multi).toBe(1);
  });
});

describe('writeAudit', () => {
  it('inserts a row and never throws', async () => {
    const calls = [];
    const db = { prepare: (sql) => ({ bind: (...a) => ({ run: async () => { calls.push([sql, a]); } }) }) };
    await writeAudit(db, { customer_id: 'cust_1', actor: 'usr_1', action: 'consent', meta: { a: 1 }, ip: '1.2.3.4' });
    expect(calls[0][0]).toContain('INSERT INTO portal_audit_log');
    expect(calls[0][1][0]).toMatch(/^aud_/);
    expect(calls[0][1][4]).toBe('{"a":1}');
    const bad = { prepare: () => { throw new Error('boom'); } };
    await expect(writeAudit(bad, { actor: 'x', action: 'y' })).resolves.toBeUndefined();
  });
});

describe('ensurePortaalSchema', () => {
  async function load() {
    const core = await import('../src/lib/overeenkomst-core.js');
    core.resetPortaalSchemaMemo();
    return core;
  }
  function makeDb({ count = 0, failBatchOnce = false } = {}) {
    const calls = { batches: [], inserts: 0 };
    let fail = failBatchOnce;
    const db = {
      prepare(sql) {
        const st = { sql, args: [], bind(...a) { st.args = a; return st; }, first: async () => ({ n: count }), run: async () => ({}) };
        return st;
      },
      async batch(stmts) {
        if (fail) { fail = false; throw new Error('d1 down'); }
        calls.batches.push(stmts.map((x) => x.sql));
        if (stmts[0].sql.startsWith('INSERT OR IGNORE')) calls.inserts += stmts.length;
        return [];
      },
    };
    return { db, calls };
  }

  it('draait het schema een keer voor twee aanroepen en seedt bij 0 sjablonen', async () => {
    const { ensurePortaalSchema } = await load();
    const { db, calls } = makeDb({ count: 0 });
    await ensurePortaalSchema({ PORTAL_DB: db });
    await ensurePortaalSchema({ PORTAL_DB: db });
    expect(calls.batches).toHaveLength(2);
    expect(calls.batches[0].every((x) => x.startsWith('CREATE '))).toBe(true);
    expect(calls.inserts).toBe(3);
  });

  it('seedt niet als er al sjablonen zijn', async () => {
    const { ensurePortaalSchema } = await load();
    const { db, calls } = makeDb({ count: 3 });
    await ensurePortaalSchema({ PORTAL_DB: db });
    expect(calls.batches).toHaveLength(1);
    expect(calls.inserts).toBe(0);
  });

  it('probeert opnieuw na een fout en gooit die fout door', async () => {
    const { ensurePortaalSchema } = await load();
    const { db, calls } = makeDb({ count: 3, failBatchOnce: true });
    await expect(ensurePortaalSchema({ PORTAL_DB: db })).rejects.toThrow('d1 down');
    await ensurePortaalSchema({ PORTAL_DB: db });
    expect(calls.batches).toHaveLength(1);
  });
});

describe('bedragen', () => {
  it('parseEuro: Dutch euro strings, plain numbers, garbage -> null', () => {
    expect(parseEuro('€ 4.500')).toBe(4500);
    expect(parseEuro('4500')).toBe(4500);
    expect(parseEuro('€ 1.000,00')).toBe(1000);
    expect(parseEuro('1.000,5')).toBe(1000.5);
    expect(parseEuro('€ 25')).toBe(25);
    expect(parseEuro('12.5')).toBe(12.5);
    for (const bad of ['', 'abc', null, undefined, '1.5.5', '€']) expect(parseEuro(bad), String(bad)).toBeNull();
  });
  it('formatEuro: whole amounts without decimals, others with comma, null -> dash', () => {
    expect(formatEuro(4500)).toBe('€ 4.500');
    expect(formatEuro(25)).toBe('€ 25');
    expect(formatEuro(1000.5)).toBe('€ 1.000,50');
    expect(formatEuro(null)).toBe('—');
  });
  const vars = {
    prijs_website: '€ 6.000', prijs_optie_3d: '€ 1.500', optie_3d_gekozen: 'nee', prijs_beheer_maand: '€ 250',
    prijs_lead: '€ 25', lead_bundel_aantal: '10', lead_bundel_prijs: '€ 225',
  };
  it('computeTotals without the 3D option', () => {
    const t = computeTotals(vars);
    expect(t.eenmalig).toBe(6000);
    expect(t.eenmalig_specificatie).toEqual([{ label: 'Website', bedrag: 6000 }]);
    expect(t.maandelijks).toBe(250);
    expect(t.leads).toEqual({ per_lead: 25, bundel_aantal: 10, bundel_prijs: 225 });
    expect(t.optie_3d).toEqual({ gekozen: false, prijs: 1500 });
  });
  it('computeTotals with the 3D option adds a line and the amount', () => {
    const t = computeTotals({ ...vars, optie_3d_gekozen: 'ja' });
    expect(t.eenmalig).toBe(7500);
    expect(t.eenmalig_specificatie.map((r) => r.label)).toEqual(['Website', 'Cinematic 3D-beleving']);
    expect(t.optie_3d.gekozen).toBe(true);
  });
  it('computeTotals: unparseable amount -> null (never NaN or a partial sum)', () => {
    expect(computeTotals({ ...vars, prijs_website: 'n.t.b.' }).eenmalig).toBeNull();
    expect(computeTotals({ ...vars, optie_3d_gekozen: 'ja', prijs_optie_3d: '' }).eenmalig).toBeNull();
    expect(computeTotals({}).maandelijks).toBeNull();
  });
  it('AMOUNTS_LABEL and totalsLines use the formatted amounts', () => {
    const t = computeTotals({ ...vars, optie_3d_gekozen: 'ja' });
    expect(AMOUNTS_LABEL(t)).toBe('Ik ga akkoord met het eenmalige bedrag van € 7.500 excl. btw en het maandelijkse bedrag van € 250 excl. btw, en met de leadprijs van € 25 per lead (bundel van 10 leads voor € 225).');
    expect(totalsLines(t)[0]).toBe('Eenmalig: € 7.500 excl. btw');
    expect(totalsLines(t).join('\n')).toContain('Cinematic 3D-beleving: € 1.500');
  });
});
