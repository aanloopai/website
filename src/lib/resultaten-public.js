// Publiek, geaggregeerd resultatenbord voor /resultaten/ — GET /api/resultaten.
//
// Wat eruit gaat: per site alleen totalen van de laatste 28 dagen (sessies,
// AI-kanaal, zoekkanaal, verzonden formulieren). Geen paden, geen verwijzers,
// geen individuele hits — niets dat tot een bezoeker herleidbaar is.
// Alleen sites uit PUBLIC_SITES (eigen bedrijven + klanten die akkoord zijn).
// Cache: 1 uur op de edge (Cache API) + browser, zodat zeven D1-queries niet
// per paginaweergave draaien.
import { summarizeHits } from './visibility-core.js';

export const PUBLIC_SITES = ['keukeninbeeld', 'fth', 'alfa', 'tripandtick', 'aanloop', 'zoekeen', 'grynnstudio'];
export const PUBLIC_WINDOW_DAYS = 28;
const ROW_LIMIT = 200000;
const CACHE_SECONDS = 3600;

const pick = (kanalen, naam) => {
  const k = (kanalen || []).find((x) => x.kanaal === naam);
  return k ? { sessies: k.sessions, contactacties: k.conv, pct: k.convRate } : { sessies: 0, contactacties: 0, pct: 0 };
};

/** Pure projectie van een summarizeHits()-resultaat naar het publieke formaat. */
export function publicResultaat(key, summary) {
  const s = summary || summarizeHits([]);
  return {
    site: key,
    sessies: s.sessions || 0,
    ai: pick(s.kanalen, 'ai'),
    zoek: pick(s.kanalen, 'zoek'),
    formulieren: (s.formulier && s.formulier.verzonden) || 0,
  };
}

export async function loadPublicResultaten(env) {
  const since = Date.now() - PUBLIC_WINDOW_DAYS * 86400000;
  const out = [];
  for (const key of PUBLIC_SITES) {
    const rows = (await env.PORTAL_DB.prepare(
      `SELECT sid, seq, t, path, ref, src, med, dev, sec, sc FROM visibility_hits
       WHERE site_key = ? AND ts >= ? ORDER BY sid, seq LIMIT ?`,
    ).bind(key, since, ROW_LIMIT).all()).results || [];
    out.push(publicResultaat(key, summarizeHits(rows)));
  }
  return out;
}

export async function resultatenPublic(request, env, ctx) {
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': `public, max-age=${CACHE_SECONDS}`,
    'access-control-allow-origin': 'https://aanloopai.nl',
    'x-robots-tag': 'noindex, nofollow',
  };
  if (request.method !== 'GET') return new Response(JSON.stringify({ ok: false, error: 'Use GET' }), { status: 405, headers });
  const cacheKey = new Request(new URL('/api/resultaten', request.url).toString(), { method: 'GET' });
  const cache = typeof caches !== 'undefined' && caches.default;
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }
  const sites = await loadPublicResultaten(env);
  const body = JSON.stringify({ ok: true, win: PUBLIC_WINDOW_DAYS, generatedAt: new Date().toISOString(), sites }, null, 1);
  const res = new Response(body, { headers });
  if (cache && ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}
