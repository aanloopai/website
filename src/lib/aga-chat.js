// Owner AGA chat — server-side proxy from the browser to the AGA terminal
// surface on Hetzner (fleetclaw/approvals/terminal.py, exposed as
// https://aga.alfareclame.nl behind a bearer token).
//
// Security model (three layers, all required):
//   1. Staff-only: same session cookie + role check as the admin panel
//      (getSessionUser -> role === 'staff'). A customer or anonymous request
//      gets 403 before anything else.
//   2. Origin lock to https://aanloopai.nl (mutating cross-origin blocked).
//   3. The AGA bearer token (env.AGA_TERMINAL_TOKEN) lives ONLY here, as a
//      Worker secret — it never reaches the browser. The browser talks to
//      this same-origin route; only this route holds the key to AGA.
//
// This route streams Server-Sent Events straight through from AGA to the
// browser (the terminal emits started/activity/answer/error/done). AGA runs
// with full tools (owner decision): chat is one fast turn, `mode:"gorev"` is
// the heavy plan->verify->review pipeline.

import { getSessionUser } from './auth.js';

const SITE_ORIGIN = 'https://aanloopai.nl';
const MAX_TASK = 8000;

// Staff-gate shared by both AGA routes.
async function requireStaff(request, env) {
  const origin = request.headers.get('Origin');
  if (origin && origin !== SITE_ORIGIN) return 'Verboden (origin)';
  const user = await getSessionUser(request, env);
  if (!user || user.role !== 'staff') return 'Geen toegang';
  if (!env.AGA_CHAT_URL || !env.AGA_TERMINAL_TOKEN) return 'AGA backend niet geconfigureerd';
  return null;
}

// GET /api/aga/models — proxy the picker options (models + effort levels).
export async function handleAgaModels(request, env) {
  const deny = await requireStaff(request, env);
  if (deny) return new Response(deny, { status: deny === 'Geen toegang' ? 403 : 503 });
  const base = env.AGA_CHAT_URL.replace(/\/+$/, '');
  try {
    const r = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${env.AGA_TERMINAL_TOKEN}` },
    });
    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ models: [{ id: 'auto', label: 'Otomatik' }], efforts: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function handleAgaChat(request, env) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Origin lock — this is a mutating, tool-capable route.
  const origin = request.headers.get('Origin');
  if (origin && origin !== SITE_ORIGIN) {
    return new Response('Verboden (origin)', { status: 403 });
  }

  // Staff-only, exactly like admin-routes.js.
  const user = await getSessionUser(request, env);
  if (!user || user.role !== 'staff') {
    return new Response('Geen toegang', { status: 403 });
  }

  if (!env.AGA_CHAT_URL || !env.AGA_TERMINAL_TOKEN) {
    return new Response('AGA backend niet geconfigureerd (AGA_CHAT_URL / AGA_TERMINAL_TOKEN ontbreekt).',
      { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Ongeldige JSON', { status: 400 });
  }
  const task = String(body.task || '').slice(0, MAX_TASK).trim();
  const images = Array.isArray(body.images) ? body.images.slice(0, 4) : null;
  if (!task && !images) return new Response('Leeg bericht', { status: 400 });
  const endpoint = body.mode === 'gorev' ? 'run' : 'chat';
  const adapter = body.adapter ? String(body.adapter).slice(0, 60) : null;
  const model = body.model ? String(body.model).slice(0, 80) : null;
  const effort = ['low', 'medium', 'max'].includes(body.effort) ? body.effort : 'medium';

  const payload = { task, adapter };
  // /run (gorev) is the heavy pipeline and ignores model/effort/images.
  if (endpoint === 'chat') {
    if (model) payload.model = model;
    payload.effort = effort;
    if (images) payload.images = images;
  }

  const base = env.AGA_CHAT_URL.replace(/\/+$/, '');
  let upstream;
  try {
    upstream = await fetch(`${base}/${endpoint}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.AGA_TERMINAL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return new Response(`AGA onbereikbaar: ${err?.message || err}`, { status: 502 });
  }

  if (!upstream.body) {
    const detail = await upstream.text().catch(() => '');
    return new Response(`AGA upstream ${upstream.status}: ${detail.slice(0, 300)}`,
      { status: 502 });
  }

  // Stream the SSE response straight to the browser.
  return new Response(upstream.body, {
    status: upstream.ok ? 200 : upstream.status,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
