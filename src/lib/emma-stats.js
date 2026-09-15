// Emma-gespreksstatistieken voor het klantportaal (pilot-KPI's, plan D3).
//
// Bron: ElevenLabs Agents `GET /v1/convai/conversations?agent_id=…` — velden
// geverifieerd op elevenlabs.io/docs/api-reference/conversations/list
// (2026-09-15): conversations[] met conversation_id, agent_id,
// start_time_unix_secs, call_duration_secs, status, call_successful
// ('success' | 'failure' | 'unknown'); paginatie via has_more + next_cursor;
// filter call_start_after_unix.
//
// Twee van de vier pilot-cijfers komen hier vandaan (beantwoorde gesprekken,
// belminuten). Ingeplande afspraken en no-shows vragen agendadata en worden
// NIET verzonnen: die velden blijven null tot er een bron is.

const EL_BASE = 'https://api.elevenlabs.io';
const MAX_PAGES = 5; // 5 × 100 = 500 gesprekken per venster — ruim voor een MKB-praktijk

/**
 * Puur: lijst ElevenLabs-gesprekken → KPI-object. Negeert alles zonder
 * bruikbare starttijd; telt alleen gesprekken binnen [sinceSecs, nowSecs].
 * @param {Array<object>} conversations
 * @param {{ sinceSecs: number, nowSecs: number }} window
 */
export function aggregateConversations(conversations, { sinceSecs, nowSecs }) {
  const rows = (Array.isArray(conversations) ? conversations : []).filter((c) => {
    const t = Number(c?.start_time_unix_secs);
    return Number.isFinite(t) && t >= sinceSecs && t <= nowSecs;
  });
  let secs = 0;
  let geslaagd = 0;
  let mislukt = 0;
  let onbekend = 0;
  let laatste = 0;
  for (const c of rows) {
    const d = Number(c.call_duration_secs);
    if (Number.isFinite(d) && d > 0) secs += d;
    if (c.call_successful === 'success') geslaagd += 1;
    else if (c.call_successful === 'failure') mislukt += 1;
    else onbekend += 1;
    const t = Number(c.start_time_unix_secs);
    if (t > laatste) laatste = t;
  }
  const gesprekken = rows.length;
  return {
    gesprekken,
    belminuten: Math.round(secs / 60),
    gemiddeldeSecs: gesprekken ? Math.round(secs / gesprekken) : 0,
    geslaagd,
    mislukt,
    onbekend,
    laatsteGesprekUnix: laatste || null,
    // Geen agendabron gekoppeld → geen cijfer. Nooit een schatting.
    afspraken: null,
    noShows: null,
  };
}

/**
 * Haalt tot MAX_PAGES pagina's op voor één agent binnen het venster.
 * @param {{ ELEVENLABS_API_KEY?: string }} env
 * @param {string} agentId
 * @param {{ sinceSecs: number, fetchImpl?: typeof fetch }} opts
 * @returns {Promise<Array<object>>}
 */
export async function fetchConversations(env, agentId, { sinceSecs, fetchImpl = fetch } = {}) {
  if (!env?.ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY ontbreekt');
  if (!agentId) throw new Error('agent_id ontbreekt');
  const out = [];
  let cursor = '';
  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = new URLSearchParams({ agent_id: agentId, page_size: '100' });
    if (Number.isFinite(sinceSecs)) qs.set('call_start_after_unix', String(Math.floor(sinceSecs)));
    if (cursor) qs.set('cursor', cursor);
    const res = await fetchImpl(`${EL_BASE}/v1/convai/conversations?${qs}`, {
      headers: { 'xi-api-key': env.ELEVENLABS_API_KEY },
    });
    if (!res.ok) throw new Error(`ElevenLabs conversations HTTP ${res.status}`);
    const data = await res.json();
    out.push(...(Array.isArray(data?.conversations) ? data.conversations : []));
    if (!data?.has_more || !data?.next_cursor) break;
    cursor = data.next_cursor;
  }
  return out;
}

/** agent_id uit de provisioning-JSON van een service (shape: { agent_id, kb_id, status }). */
export function agentIdFromProvisioning(provisioningJson) {
  try {
    const p = typeof provisioningJson === 'string' ? JSON.parse(provisioningJson) : provisioningJson;
    const id = p?.agent_id;
    return typeof id === 'string' && id.trim() ? id.trim() : null;
  } catch {
    return null;
  }
}
