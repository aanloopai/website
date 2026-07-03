// Best-effort KV rate-limiter shared by public-facing POST endpoints in worker.js
// (/api/submit, /api/calendar/book, /api/calendar/availability, /api/geo-scan).
// Mirrors the get-then-put pattern already used in portal-routes.js (rateLimited),
// reusing the GOOGLE_TOKENS KV binding with a caller-supplied key prefix so the
// counters for each route/identity don't collide.
//
// KNOWN LIMITATION (Phase 1, non-atomic): this is a plain KV get() followed by a
// put() — there is no compare-and-swap, so concurrent requests within the same
// window can race and both read the same "current" count before either writes,
// letting a well-timed burst slip a few requests past the limit. That's an
// acceptable trade-off for a spam/abuse throttle (not an authentication or
// billing gate). If a hard limit is ever needed, switch to Durable Objects or
// Cloudflare's native Rate Limiting API.
//
// @param {KVNamespace|undefined} kv - KV binding (e.g. env.GOOGLE_TOKENS). If
//   missing, rate limiting is skipped (fail-open) so a missing binding never
//   takes the endpoint down.
// @param {string} key - Full KV key, e.g. `rl:submit:203.0.113.4`.
// @param {number} limit - Max allowed requests within the window.
// @param {number} windowSec - Window length in seconds (KV expirationTtl).
// @returns {Promise<{allowed: boolean, remaining: number}>}
export async function rateLimit(kv, key, limit, windowSec) {
  if (!kv) return { allowed: true, remaining: limit };
  const current = parseInt((await kv.get(key)) || '0', 10);
  if (current >= limit) return { allowed: false, remaining: 0 };
  await kv.put(key, String(current + 1), { expirationTtl: windowSec });
  return { allowed: true, remaining: Math.max(0, limit - current - 1) };
}
