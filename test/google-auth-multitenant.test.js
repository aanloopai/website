// getAccessToken(env, kvKey) — parametrisering op KV-key voor multi-tenant
// Google-tokens (Task 10). Regressie-eis: getAccessToken(env) zonder key-arg
// blijft exact het admin-pad ('oauth:google:admin') gebruiken — dat is wat
// calendar-routes.js (bestaande call-sites) aanroept.
import {
  describe, it, expect, afterEach,
} from 'vitest';
import { getAccessToken } from '../src/lib/google-auth.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

// Minimale KV-stub met muteerbare state — get(key,'json') + put(key, string),
// zodat een test kan verifiëren onder WELKE key gelezen/geschreven wordt.
function makeKvStub(initial = {}) {
  const store = { ...initial };
  return {
    store,
    get: async (key, type) => {
      const raw = store[key];
      if (raw === undefined) return null;
      return type === 'json' ? JSON.parse(JSON.stringify(raw)) : raw;
    },
    put: async (key, value) => {
      store[key] = JSON.parse(value);
    },
  };
}

function makeEnv(kv) {
  return {
    GOOGLE_TOKENS: kv,
    GOOGLE_CLIENT_ID: 'client-id-test',
    GOOGLE_CLIENT_SECRET: 'client-secret-test',
  };
}

function mockRefreshFetch({ access_token = 'fresh-token', expires_in = 3600 } = {}) {
  globalThis.fetch = async () => ({
    ok: true,
    json: async () => ({ access_token, expires_in }),
  });
}

describe('getAccessToken — multi-tenant KV-key parametrisering', () => {
  it('leest en refresh\'t onder de opgegeven klant-key, niet onder admin-key', async () => {
    const expiredToken = {
      access_token: 'old-cust-token',
      refresh_token: 'refresh-cust',
      expires_at: Date.now() - 1000, // al verlopen
    };
    const kv = makeKvStub({ 'oauth:google:cust:c1': expiredToken });
    const env = makeEnv(kv);
    mockRefreshFetch({ access_token: 'fresh-cust-token' });

    const token = await getAccessToken(env, 'oauth:google:cust:c1');

    expect(token).toBe('fresh-cust-token');
    // teruggeschreven onder DEZELFDE klant-key
    expect(kv.store['oauth:google:cust:c1'].access_token).toBe('fresh-cust-token');
    // geen admin-key aangeraakt
    expect(kv.store['oauth:google:admin']).toBeUndefined();
  });

  it('zonder key-arg blijft het admin-pad ongewijzigd gebruiken (regressie)', async () => {
    const expiredAdmin = {
      access_token: 'old-admin-token',
      refresh_token: 'refresh-admin',
      expires_at: Date.now() - 1000,
    };
    const kv = makeKvStub({ 'oauth:google:admin': expiredAdmin });
    const env = makeEnv(kv);
    mockRefreshFetch({ access_token: 'fresh-admin-token' });

    const token = await getAccessToken(env);

    expect(token).toBe('fresh-admin-token');
    expect(kv.store['oauth:google:admin'].access_token).toBe('fresh-admin-token');
  });

  it('refresh\'t niet onnodig als het klant-token nog geldig is', async () => {
    const validToken = {
      access_token: 'still-valid-cust-token',
      refresh_token: 'refresh-cust',
      expires_at: Date.now() + 10 * 60 * 1000, // ruim binnen expiry-buffer
    };
    const kv = makeKvStub({ 'oauth:google:cust:c2': validToken });
    const env = makeEnv(kv);
    let fetchCalled = false;
    globalThis.fetch = async () => {
      fetchCalled = true;
      throw new Error('fetch had niet aangeroepen mogen worden');
    };

    const token = await getAccessToken(env, 'oauth:google:cust:c2');

    expect(token).toBe('still-valid-cust-token');
    expect(fetchCalled).toBe(false);
  });

  it('gooit een duidelijke fout als er geen tokens onder de opgegeven key staan', async () => {
    const kv = makeKvStub({});
    const env = makeEnv(kv);

    await expect(getAccessToken(env, 'oauth:google:cust:onbekend')).rejects.toThrow();
  });
});
