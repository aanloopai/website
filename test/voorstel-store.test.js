import { describe, it, expect, beforeEach } from 'vitest';
import { maakVoorstel, leesVoorstelViaToken, VOORSTEL_TTL_MS } from '../src/lib/voorstel-store.js';

// Minimale D1-dubbel: onthoudt één tabel als array en herkent de twee queries
// die deze module gebruikt.
function fakeDb() {
  const rows = [];
  return {
    rows,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (sql.startsWith('INSERT INTO voorstellen')) {
                const [id, token, intake_id, service_id, product_key, tier_naam,
                  prijs_cent, setup_cent, roi_json, copy_json, expires_at, created_at] = args;
                rows.push({ id, token, intake_id, service_id, product_key, tier_naam,
                  prijs_cent, setup_cent, roi_json, copy_json, status: 'open', expires_at, created_at });
              }
              return { meta: { changes: 1 } };
            },
            async first() {
              return rows.find((r) => r.token === args[0]) || null;
            },
          };
        },
      };
    },
  };
}

describe('voorstel-store', () => {
  let env;
  beforeEach(() => { env = { PORTAL_DB: fakeDb() }; });

  it('slaat een verkoopbaar voorstel op met een 64-hex token', async () => {
    const res = await maakVoorstel(env, {
      intakeId: 'intake-1', serviceId: 'voice-agent',
      customer: { name: 'Jan', company: 'Jansen' },
      answers: { gemiste_gesprekken_week: '5', gemiddelde_klantwaarde: '400' },
    });
    expect(res.token).toMatch(/^[0-9a-f]{64}$/);
    expect(env.PORTAL_DB.rows[0].prijs_cent).toBe(49700);
    expect(env.PORTAL_DB.rows[0].setup_cent).toBe(49500);
    expect(env.PORTAL_DB.rows[0].expires_at - env.PORTAL_DB.rows[0].created_at).toBe(VOORSTEL_TTL_MS);
  });

  it('maakt geen voorstel voor een niet-verkoopbare dienst', async () => {
    const res = await maakVoorstel(env, {
      intakeId: 'intake-2', serviceId: 'whatsapp-bot', customer: {}, answers: {},
    });
    expect(res).toBe(null);
    expect(env.PORTAL_DB.rows).toHaveLength(0);
  });

  it('leest een voorstel terug zonder PII', async () => {
    const { token } = await maakVoorstel(env, {
      intakeId: 'intake-3', serviceId: 'voice-agent',
      customer: { name: 'Jan', company: 'Jansen', email: 'jan@example.nl', phone: '0612345678' },
      answers: { gemiste_gesprekken_week: '5' },
    });
    const publiek = await leesVoorstelViaToken(env, token);
    expect(publiek.prijsCent).toBe(49700);
    expect(JSON.stringify(publiek)).not.toContain('jan@example.nl');
    expect(JSON.stringify(publiek)).not.toContain('0612345678');
  });

  it('geeft null bij een onbekend of verlopen token', async () => {
    expect(await leesVoorstelViaToken(env, 'a'.repeat(64))).toBe(null);
    const { token } = await maakVoorstel(env, {
      intakeId: 'intake-4', serviceId: 'voice-agent', customer: {}, answers: {},
    });
    env.PORTAL_DB.rows[0].expires_at = Date.now() - 1000;
    expect(await leesVoorstelViaToken(env, token)).toBe(null);
  });
});
