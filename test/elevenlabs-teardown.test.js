import { describe, it, expect, afterEach, vi } from 'vitest';
import { deleteAgent, teardownProvisioning } from '../src/lib/elevenlabs.js';

const origFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = origFetch; });

describe('deleteAgent', () => {
  it('doet een DELETE naar /convai/agents/{id}', async () => {
    let called = null;
    globalThis.fetch = async (url, opts) => { called = { url: String(url), method: opts.method }; return { ok: true, status: 200, text: async () => '' }; };
    await deleteAgent('k', 'ag_1');
    expect(called.method).toBe('DELETE');
    expect(called.url).toContain('/convai/agents/ag_1');
  });
  it('slikt een 404 (agent al weg)', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 404, text: async () => 'not found' });
    await expect(deleteAgent('k', 'ag_1')).resolves.toBeUndefined();
  });
  it('gooit op een andere non-2xx', async () => {
    globalThis.fetch = async () => ({ ok: false, status: 500, text: async () => 'boom' });
    await expect(deleteAgent('k', 'ag_1')).rejects.toThrow();
  });
});

describe('teardownProvisioning', () => {
  it('verwijdert agent én KB, geeft {ok:true} terug bij succes', async () => {
    const calls = [];
    globalThis.fetch = async (url, opts) => {
      calls.push(`${opts.method} ${String(url)}`);
      return { ok: true, status: 200, text: async () => '' };
    };
    await expect(teardownProvisioning({ ELEVENLABS_API_KEY: 'k' }, { agent_id: 'ag_1', kb_id: 'kb_1' })).resolves.toEqual({ ok: true });
    expect(calls.some((c) => c.includes('/convai/agents/ag_1'))).toBe(true);
    expect(calls.some((c) => c.includes('/convai/knowledge-base/kb_1'))).toBe(true);
  });
  it('gooit nooit ook al faalt de agent-delete, maar geeft {ok:false} terug (agent niet verwijderd)', async () => {
    const calls = [];
    globalThis.fetch = async (url, opts) => {
      calls.push(`${opts.method} ${String(url)}`);
      if (String(url).includes('/convai/agents/')) return { ok: false, status: 500, text: async () => 'boom' };
      return { ok: true, status: 200, text: async () => '' };
    };
    await expect(teardownProvisioning({ ELEVENLABS_API_KEY: 'k' }, { agent_id: 'ag_1', kb_id: 'kb_1' })).resolves.toEqual({ ok: false });
    expect(calls.some((c) => c.includes('/convai/agents/ag_1'))).toBe(true);
    expect(calls.some((c) => c.includes('/convai/knowledge-base/kb_1'))).toBe(true);
  });
  it('een falende KB-delete alleen zet ok niet op false (agent is wel weg)', async () => {
    globalThis.fetch = async (url) => {
      if (String(url).includes('/convai/knowledge-base/')) return { ok: false, status: 500, text: async () => 'boom' };
      return { ok: true, status: 200, text: async () => '' };
    };
    await expect(teardownProvisioning({ ELEVENLABS_API_KEY: 'k' }, { agent_id: 'ag_1', kb_id: 'kb_1' })).resolves.toEqual({ ok: true });
  });
  it('no-op zonder key of zonder ids → {ok:true}, geen fetch', async () => {
    let called = false;
    globalThis.fetch = async () => { called = true; return { ok: true, status: 200, text: async () => '' }; };
    await expect(teardownProvisioning({}, { agent_id: 'ag_1' })).resolves.toEqual({ ok: true });
    await expect(teardownProvisioning({ ELEVENLABS_API_KEY: 'k' }, null)).resolves.toEqual({ ok: true });
    expect(called).toBe(false);
  });
});
