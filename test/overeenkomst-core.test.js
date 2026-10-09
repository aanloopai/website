import { describe, it, expect } from 'vitest';
import {
  FIXED_VARS, TEMPLATE_SLUGS, CONSENT_LABELS, NO_PASSWORD_NOTICE, AUTHORIZED_LABEL,
  renderTemplate, buildVars, minReadSeconds, computeEvidenceSha256, sha256Hex,
  DEFAULT_UPLOAD_ITEMS, formatAmsterdam, writeAudit,
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
  it('keeps variable value when customer value is empty and survives bad JSON', () => {
    expect(buildVars({ id: 'a', variables_json: '{"klant_kvk":"99999999"}' }, { kvk: '', btw_id: null }).klant_kvk).toBe('99999999');
    expect(buildVars({ id: 'a', variables_json: '{oops' }, {}).agreement_id).toBe('a');
  });
});

describe('minReadSeconds', () => {
  it('has a floor of 20 and scales at 8 words per second', () => {
    expect(minReadSeconds('kort')).toBe(20);
    expect(minReadSeconds(Array(800).fill('w').join(' '))).toBe(100);
    expect(minReadSeconds(Array(801).fill('w').join(' '))).toBe(101);
  });
});

describe('evidence hash', () => {
  it('is sha256 of hashes|name|ts and deterministic', async () => {
    const a = await computeEvidenceSha256({ contentHashes: ['h1', 'h2'], typedName: 'Jan', signedAtMs: 5 });
    expect(a).toBe(await sha256Hex('h1|h2|Jan|5'));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await computeEvidenceSha256({ contentHashes: ['h1', 'h2'], typedName: 'Jan', signedAtMs: 6 })).not.toBe(a);
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
        const st = { sql, args: [], bind(...a) { st.args = a; return st; }, first: async () => ({ n: count }) };
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
