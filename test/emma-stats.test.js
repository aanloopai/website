// Pilot-KPI's in het klantportaal (plan D3, 2026-09-15): gesprekken en
// belminuten uit ElevenLabs; afspraken/no-shows blijven null zonder agendabron.
import { describe, it, expect } from 'vitest';
import { aggregateConversations, fetchConversations, agentIdFromProvisioning } from '../src/lib/emma-stats.js';

const NOW = 1_758_000_000; // vaste "nu" in seconden
const SINCE = NOW - 30 * 86400;
const conv = (offsetDays, secs, ok) => ({
  conversation_id: `c${offsetDays}`,
  agent_id: 'agent_1',
  start_time_unix_secs: NOW - offsetDays * 86400,
  call_duration_secs: secs,
  status: 'done',
  call_successful: ok,
});

describe('aggregateConversations', () => {
  it('telt alleen gesprekken binnen het venster en somt minuten afgerond', () => {
    const list = [conv(1, 90, 'success'), conv(5, 150, 'failure'), conv(45, 600, 'success'), conv(2, 30, 'unknown')];
    const s = aggregateConversations(list, { sinceSecs: SINCE, nowSecs: NOW });
    expect(s.gesprekken).toBe(3);
    expect(s.belminuten).toBe(5); // (90+150+30)/60 = 4,5 → 5
    expect(s.gemiddeldeSecs).toBe(90);
    expect(s.geslaagd).toBe(1);
    expect(s.mislukt).toBe(1);
    expect(s.onbekend).toBe(1);
    expect(s.laatsteGesprekUnix).toBe(NOW - 86400);
  });

  it('verzint geen afspraken of no-shows: altijd null zonder agendabron', () => {
    const s = aggregateConversations([conv(1, 60, 'success')], { sinceSecs: SINCE, nowSecs: NOW });
    expect(s.afspraken).toBeNull();
    expect(s.noShows).toBeNull();
  });

  it('is robuust tegen lege, kapotte of niet-array input', () => {
    for (const bad of [null, undefined, 'x', [{}], [{ start_time_unix_secs: 'abc', call_duration_secs: -5 }]]) {
      const s = aggregateConversations(bad, { sinceSecs: SINCE, nowSecs: NOW });
      expect(s.gesprekken).toBe(0);
      expect(s.belminuten).toBe(0);
      expect(s.laatsteGesprekUnix).toBeNull();
    }
  });
});

describe('fetchConversations', () => {
  it('pagineert via has_more/next_cursor en stuurt agent_id + call_start_after_unix mee', async () => {
    const calls = [];
    const fetchImpl = async (url) => {
      calls.push(url);
      const u = new URL(url);
      const page = u.searchParams.get('cursor') ? 2 : 1;
      return {
        ok: true,
        json: async () => (page === 1
          ? { conversations: [conv(1, 60, 'success')], has_more: true, next_cursor: 'abc' }
          : { conversations: [conv(2, 60, 'success')], has_more: false }),
      };
    };
    const list = await fetchConversations({ ELEVENLABS_API_KEY: 'k' }, 'agent_1', { sinceSecs: SINCE, fetchImpl });
    expect(list).toHaveLength(2);
    expect(calls).toHaveLength(2);
    const first = new URL(calls[0]);
    expect(first.pathname).toBe('/v1/convai/conversations');
    expect(first.searchParams.get('agent_id')).toBe('agent_1');
    expect(first.searchParams.get('call_start_after_unix')).toBe(String(SINCE));
    expect(new URL(calls[1]).searchParams.get('cursor')).toBe('abc');
  });

  it('faalt hard (geen stille nullen) bij ontbrekende key, agent of HTTP-fout', async () => {
    await expect(fetchConversations({}, 'agent_1', { fetchImpl: async () => ({ ok: true, json: async () => ({}) }) })).rejects.toThrow(/ELEVENLABS_API_KEY/);
    await expect(fetchConversations({ ELEVENLABS_API_KEY: 'k' }, '', {})).rejects.toThrow(/agent_id/);
    await expect(fetchConversations({ ELEVENLABS_API_KEY: 'k' }, 'agent_1', { fetchImpl: async () => ({ ok: false, status: 401 }) })).rejects.toThrow(/HTTP 401/);
  });
});

describe('agentIdFromProvisioning', () => {
  it('leest agent_id uit JSON-string of object en geeft null bij rommel', () => {
    expect(agentIdFromProvisioning('{"status":"ok","agent_id":"agent_x"}')).toBe('agent_x');
    expect(agentIdFromProvisioning({ agent_id: ' agent_y ' })).toBe('agent_y');
    expect(agentIdFromProvisioning('{"agent_id":""}')).toBeNull();
    expect(agentIdFromProvisioning('not json')).toBeNull();
    expect(agentIdFromProvisioning(null)).toBeNull();
  });
});
