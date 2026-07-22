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

// Stub die faalt zodra hij wordt aangesproken — bewijst dat een malvormd
// token wordt afgewezen vóórdat er een query naar de database gaat.
function poisonDb() {
  return {
    prepare() {
      throw new Error('poisonDb: prepare() aangeroepen — leesVoorstelViaToken had de database niet mogen raadplegen voor dit token');
    },
  };
}

describe('voorstel-store', () => {
  let env;
  beforeEach(() => { env = { PORTAL_DB: fakeDb() }; });

  it('slaat een verkoopbaar voorstel op met een 64-hex token en elk veld op de juiste bind-positie', async () => {
    const res = await maakVoorstel(env, {
      intakeId: 'intake-1', serviceId: 'voice-agent',
      customer: { name: 'Jan', company: 'Jansen' },
      answers: { gemiste_gesprekken_week: '5', gemiddelde_klantwaarde: '400' },
    });
    expect(res.token).toMatch(/^[0-9a-f]{64}$/);
    const row = env.PORTAL_DB.rows[0];
    expect(row.prijs_cent).toBe(49700);
    expect(row.setup_cent).toBe(49500);
    expect(row.expires_at - row.created_at).toBe(VOORSTEL_TTL_MS);

    // Elk veld op zijn eigen bind-positie — met onderling niet-verwisselbare
    // waarden, zodat een verschoven bind-volgorde hier daadwerkelijk breekt.
    expect(row.intake_id).toBe('intake-1');
    expect(row.service_id).toBe('voice-agent');
    expect(row.product_key).toBe('emma-telefoon');
    expect(row.tier_naam).toBe('Starter');

    // roi_json en copy_json zijn structureel verschillend (roi heeft "modus",
    // copy heeft "kop"). Als de bind-volgorde ze verwisselt, staat het
    // verkeerde veld op de verkeerde kolom en falen deze checks.
    const roi = JSON.parse(row.roi_json);
    const copy = JSON.parse(row.copy_json);
    expect(roi).toHaveProperty('modus');
    expect(roi).not.toHaveProperty('kop');
    expect(copy).toHaveProperty('kop');
    expect(copy).not.toHaveProperty('modus');
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

  it('rondt correct door de opslag: serviceId, productKey, tierNaam, roi en copy komen terug zoals opgeslagen', async () => {
    const { token } = await maakVoorstel(env, {
      intakeId: 'intake-5', serviceId: 'voice-agent',
      customer: { name: 'Piet' },
      answers: { gemiste_gesprekken_week: '10', gemiddelde_klantwaarde: '250' },
    });
    const stored = env.PORTAL_DB.rows.find((r) => r.token === token);

    // roi_json/copy_json staan als JSON-string in D1...
    expect(typeof stored.roi_json).toBe('string');
    expect(typeof stored.copy_json).toBe('string');

    const publiek = await leesVoorstelViaToken(env, token);

    // ...en komen als object terug uit de publieke leesfunctie.
    expect(typeof publiek.roi).toBe('object');
    expect(typeof publiek.copy).toBe('object');

    expect(publiek.serviceId).toBe('voice-agent');
    expect(publiek.productKey).toBe(stored.product_key);
    expect(publiek.tierNaam).toBe(stored.tier_naam);
    expect(publiek.roi).toEqual(JSON.parse(stored.roi_json));
    expect(publiek.copy).toEqual(JSON.parse(stored.copy_json));
  });

  it('geeft null bij een onbekend of verlopen token', async () => {
    expect(await leesVoorstelViaToken(env, 'a'.repeat(64))).toBe(null);
    const { token } = await maakVoorstel(env, {
      intakeId: 'intake-4', serviceId: 'voice-agent', customer: {}, answers: {},
    });
    env.PORTAL_DB.rows[0].expires_at = Date.now() - 1000;
    expect(await leesVoorstelViaToken(env, token)).toBe(null);
  });

  it('geeft null voor een malvormd token zonder de database te raadplegen', async () => {
    const poisonEnv = { PORTAL_DB: poisonDb() };
    const kandidaten = [
      'A'.repeat(64),                                    // hoofdletters — regex is hex-lowercase-only
      'a'.repeat(65),                                     // te lang
      "'; DROP TABLE voorstellen; --" + 'a'.repeat(40),   // SQL-achtige inhoud, geen geldige hex-string
    ];
    for (const token of kandidaten) {
      expect(await leesVoorstelViaToken(poisonEnv, token)).toBe(null);
    }
  });
});
