// Klantenportaal — aanleverlijst-API voor klanten (/api/portal/aanleveren*).
// Wired into handlePortalApi (portal-routes.js) after the session gate. Every
// query is scoped by user.customer_id; ids from the client are never trusted
// without an ownership check. Files live in KV (env.PORTAL_FILES), max 25 MiB.
import { jsonResponse, errorResponse } from './google-auth.js';
import { randomId } from './auth.js';
import { notifyTelegram } from './notify.js';
import { NO_PASSWORD_NOTICE, writeAudit } from './overeenkomst-core.js';

const KV_MAX_BYTES = 25 * 1024 * 1024;
const MAX_TEXT_CHARS = 5000;

const MIME_BY_EXT = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf',
  svg: 'image/svg+xml', heic: 'image/heic', ai: 'application/postscript', eps: 'application/postscript',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', md: 'text/markdown',
};

// ── helpers ────────────────────────────────────────────────────────────────
function canWrite(role) { return role === 'eigenaar' || role === 'bewerker'; }
function readOnly() { return errorResponse('Alleen-lezen account', 403); }
function clientIp(request) { return request.headers.get('CF-Connecting-IP') || null; }
async function readJson(request) {
  try { const b = await request.json(); return b && typeof b === 'object' ? b : null; } catch { return null; }
}
function str(v, max = 200) { return typeof v === 'string' ? v.trim().slice(0, max) : ''; }

function fileExt(name) {
  const m = /\.([A-Za-z0-9]{1,10})$/.exec(String(name || ''));
  return m ? m[1].toLowerCase() : '';
}
function parseAccepted(accepted) {
  return String(accepted || '').toLowerCase().split(/[\s,;]+/).map((e) => e.replace(/^\./, '')).filter(Boolean);
}
// Strip path parts + control chars; keep it short. Used for storage and headers.
export function sanitizeFileName(name) {
  const base = String(name || 'bestand').split(/[\\/]/).pop()
    .replace(/[\x00-\x1f\x7f"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);
  return base || 'bestand';
}
function asciiFallback(name) { return name.replace(/[^\x20-\x7e]/g, '_').replace(/[\\"%;]/g, '_'); }

const startsWith = (b, sig, off = 0) => b.length >= off + sig.length && sig.every((x, i) => b[off + i] === x);
// Magic-byte check per extension. Unknown extensions are not content-checked.
function magicOk(ext, bytes) {
  switch (ext) {
    case 'jpg': case 'jpeg': return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case 'png': return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case 'pdf': return startsWith(bytes, [0x25, 0x50, 0x44, 0x46]);
    case 'heic': return startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4);
    case 'svg': {
      let head = new TextDecoder('utf-8').decode(bytes.subarray(0, 512));
      head = head.replace(/^\uFEFF/, '').trimStart();
      return head.startsWith('<');
    }
    case 'docx': return startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]);
    case 'ai': return startsWith(bytes, [0x25, 0x50, 0x44, 0x46]) || startsWith(bytes, [0x25, 0x21]);
    case 'eps': return startsWith(bytes, [0x25, 0x21]) || startsWith(bytes, [0xc5, 0xd0, 0xd3, 0xc6]);
    default: return true;
  }
}

async function loadItem(env, user, itemId) {
  if (!itemId) return null;
  return env.PORTAL_DB
    .prepare('SELECT * FROM upload_items WHERE id = ? AND customer_id = ?')
    .bind(itemId, user.customer_id).first();
}
async function bedrijfNaam(env, customerId) {
  const c = await env.PORTAL_DB.prepare('SELECT bedrijf FROM customers WHERE id = ?').bind(customerId).first();
  return c?.bedrijf || '';
}
function publicUpload(u) {
  return {
    id: u.id, original_name: u.original_name || null, size_bytes: u.size_bytes ?? null,
    text_value: u.text_value ?? null, created_at: u.created_at,
  };
}

// ── dispatcher ─────────────────────────────────────────────────────────────
export async function handleAanleverApi(request, env, user, url) {
  const path = url.pathname.replace(/\/+$/, '');
  const method = request.method;
  const sub = path.slice('/api/portal/aanleveren'.length);

  if (!env.PORTAL_DB) return errorResponse('Er ging iets mis', 500);

  if (sub === '' && method === 'GET') return lijst(env, user);
  if (sub === '/bestand' && method === 'GET') return bestand(env, user, url);
  if (sub === '/upload' && method === 'POST') return upload(request, env, user);
  if (sub === '/upload' && method === 'DELETE') return verwijder(request, env, user, url);
  if (sub === '/tekst' && method === 'POST') return tekst(request, env, user);
  if (sub === '/nvt' && method === 'POST') return nvt(request, env, user);
  return errorResponse('Niet gevonden', 404);
}

// ── GET / ──────────────────────────────────────────────────────────────────
async function lijst(env, user) {
  const items = (await env.PORTAL_DB
    .prepare('SELECT * FROM upload_items WHERE customer_id = ? ORDER BY order_index, created_at')
    .bind(user.customer_id).all()).results || [];
  const uploads = (await env.PORTAL_DB
    .prepare('SELECT id, upload_item_id, original_name, size_bytes, text_value, created_at FROM uploads WHERE customer_id = ? ORDER BY created_at')
    .bind(user.customer_id).all()).results || [];
  const byItem = new Map();
  for (const u of uploads) {
    if (!byItem.has(u.upload_item_id)) byItem.set(u.upload_item_id, []);
    byItem.get(u.upload_item_id).push(publicUpload(u));
  }
  let done = 0;
  const out = items.map((it) => {
    const ups = byItem.get(it.id) || [];
    if (it.status === 'received' || it.status === 'nvt' || ups.length > 0) done++;
    return {
      id: it.id, label: it.label, description: it.description, type: it.type,
      required: it.required, accepted_ext: it.accepted_ext, max_mb: it.max_mb,
      multi: it.multi, max_files: it.max_files, order_index: it.order_index,
      status: it.status, uploads: ups,
    };
  });
  return jsonResponse({ ok: true, items: out, progress: { done, total: items.length }, notice: NO_PASSWORD_NOTICE });
}

// ── POST /upload (multipart) ───────────────────────────────────────────────
async function upload(request, env, user) {
  if (!canWrite(user.role)) return readOnly();
  if (!env.PORTAL_FILES) return errorResponse('Er ging iets mis', 500);
  let form;
  try { form = await request.formData(); } catch { return errorResponse('Ongeldige aanvraag', 400); }
  const item = await loadItem(env, user, str(form.get('item_id')));
  if (!item) return errorResponse('Onderdeel niet gevonden', 404);
  if (item.type !== 'file') return errorResponse('Dit onderdeel accepteert geen bestanden.', 400);
  const file = form.get('file');
  if (!file || typeof file !== 'object' || typeof file.arrayBuffer !== 'function') {
    return errorResponse('Kies eerst een bestand.', 400);
  }

  const name = sanitizeFileName(file.name);
  const ext = fileExt(name);
  const accepted = parseAccepted(item.accepted_ext);
  if (!ext || (accepted.length ? !accepted.includes(ext) : !(ext in MIME_BY_EXT))) {
    return errorResponse(`Dit bestandstype is niet toegestaan. Toegestaan: ${accepted.join(', ') || Object.keys(MIME_BY_EXT).join(', ')}.`, 400);
  }
  const capBytes = Math.min(Number(item.max_mb) || 25, 25) * 1024 * 1024;
  if (Number.isFinite(file.size) && file.size > capBytes) {
    return errorResponse(`Het bestand is te groot (maximaal ${Math.floor(capBytes / 1048576)} MB).`, 413);
  }
  const buf = await file.arrayBuffer();
  if (buf.byteLength > capBytes || buf.byteLength > KV_MAX_BYTES) {
    return errorResponse(`Het bestand is te groot (maximaal ${Math.floor(capBytes / 1048576)} MB).`, 413);
  }
  if (buf.byteLength === 0) return errorResponse('Het bestand is leeg.', 400);
  if (!magicOk(ext, new Uint8Array(buf))) {
    return errorResponse('De inhoud van het bestand komt niet overeen met het bestandstype.', 400);
  }

  const maxFiles = item.multi ? Math.max(1, Number(item.max_files) || 1) : 1;
  const cnt = await env.PORTAL_DB
    .prepare('SELECT COUNT(*) AS n FROM uploads WHERE upload_item_id = ? AND customer_id = ?')
    .bind(item.id, user.customer_id).first();
  if (Number(cnt?.n || 0) >= maxFiles) {
    return errorResponse(`Je kunt hier maximaal ${maxFiles} bestand${maxFiles === 1 ? '' : 'en'} aanleveren.`, 400);
  }

  const id = randomId('upl');
  const key = `portal:file:${user.customer_id}/${id}`;
  const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
  const now = Date.now();
  await env.PORTAL_FILES.put(key, buf, {
    metadata: { mime, name, size: buf.byteLength, customer_id: user.customer_id },
  });
  try {
    await env.PORTAL_DB
      .prepare(`INSERT INTO uploads (id, upload_item_id, customer_id, user_id, file_key, original_name, mime, size_bytes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, item.id, user.customer_id, user.id, key, name, mime, buf.byteLength, now).run();
  } catch (err) {
    try { await env.PORTAL_FILES.delete(key); } catch { /* best effort */ }
    throw err;
  }
  await env.PORTAL_DB.prepare("UPDATE upload_items SET status = 'received' WHERE id = ? AND customer_id = ?")
    .bind(item.id, user.customer_id).run();
  await writeAudit(env.PORTAL_DB, {
    customer_id: user.customer_id, actor: user.id, action: 'upload',
    meta: { item_id: item.id, upload_id: id, name, size: buf.byteLength }, ip: clientIp(request),
  });
  await notifyTelegram(env, `Nieuwe upload van ${await bedrijfNaam(env, user.customer_id)}: ${item.label} (${name})`);
  return jsonResponse({
    ok: true,
    upload: publicUpload({ id, original_name: name, size_bytes: buf.byteLength, text_value: null, created_at: now }),
  });
}

// ── POST /tekst ────────────────────────────────────────────────────────────
async function tekst(request, env, user) {
  if (!canWrite(user.role)) return readOnly();
  const body = await readJson(request);
  if (!body) return errorResponse('Ongeldige aanvraag', 400);
  const item = await loadItem(env, user, str(body.item_id));
  if (!item) return errorResponse('Onderdeel niet gevonden', 404);
  if (item.type !== 'text' && item.type !== 'boolean') return errorResponse('Dit onderdeel accepteert geen tekst.', 400);
  const value = typeof body.text_value === 'string' ? body.text_value.trim() : '';
  if (!value) return errorResponse('Vul een antwoord in.', 400);
  if (item.type === 'boolean' && value !== 'ja' && value !== 'nee') return errorResponse('Kies ja of nee.', 400);
  if (value.length > MAX_TEXT_CHARS) return errorResponse(`Maximaal ${MAX_TEXT_CHARS} tekens.`, 400);

  const now = Date.now();
  const existing = await env.PORTAL_DB
    .prepare('SELECT id FROM uploads WHERE upload_item_id = ? AND customer_id = ? AND file_key IS NULL')
    .bind(item.id, user.customer_id).first();
  let id;
  if (existing) {
    id = existing.id;
    await env.PORTAL_DB
      .prepare('UPDATE uploads SET text_value = ?, user_id = ?, created_at = ? WHERE id = ? AND customer_id = ?')
      .bind(value, user.id, now, id, user.customer_id).run();
  } else {
    id = randomId('upl');
    await env.PORTAL_DB
      .prepare('INSERT INTO uploads (id, upload_item_id, customer_id, user_id, text_value, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, item.id, user.customer_id, user.id, value, now).run();
  }
  await env.PORTAL_DB.prepare("UPDATE upload_items SET status = 'received' WHERE id = ? AND customer_id = ?")
    .bind(item.id, user.customer_id).run();
  await writeAudit(env.PORTAL_DB, {
    customer_id: user.customer_id, actor: user.id, action: 'upload_tekst',
    meta: { item_id: item.id, upload_id: id, chars: value.length }, ip: clientIp(request),
  });
  await notifyTelegram(env, `Nieuwe upload van ${await bedrijfNaam(env, user.customer_id)}: ${item.label} (antwoord)`);
  return jsonResponse({ ok: true, upload: publicUpload({ id, original_name: null, size_bytes: null, text_value: value, created_at: now }) });
}

// ── POST /nvt ──────────────────────────────────────────────────────────────
async function nvt(request, env, user) {
  if (!canWrite(user.role)) return readOnly();
  const body = await readJson(request);
  const item = await loadItem(env, user, str(body?.item_id));
  if (!item) return errorResponse('Onderdeel niet gevonden', 404);
  if (item.required) return errorResponse('Dit onderdeel is verplicht en kan niet als n.v.t. worden gemarkeerd.', 400);
  await env.PORTAL_DB.prepare("UPDATE upload_items SET status = 'nvt' WHERE id = ? AND customer_id = ?")
    .bind(item.id, user.customer_id).run();
  await writeAudit(env.PORTAL_DB, {
    customer_id: user.customer_id, actor: user.id, action: 'upload_nvt',
    meta: { item_id: item.id }, ip: clientIp(request),
  });
  return jsonResponse({ ok: true });
}

// ── DELETE /upload?id= ─────────────────────────────────────────────────────
async function verwijder(request, env, user, url) {
  if (!canWrite(user.role)) return readOnly();
  const id = str(url.searchParams.get('id'));
  const row = id ? await env.PORTAL_DB
    .prepare('SELECT * FROM uploads WHERE id = ? AND customer_id = ?').bind(id, user.customer_id).first() : null;
  if (!row) return errorResponse('Upload niet gevonden', 404);
  if (row.file_key && env.PORTAL_FILES) {
    try { await env.PORTAL_FILES.delete(row.file_key); } catch (err) {
      console.error('[aanleveren] KV delete mislukt:', err.message || err);
    }
  }
  await env.PORTAL_DB.prepare('DELETE FROM uploads WHERE id = ? AND customer_id = ?').bind(id, user.customer_id).run();
  const left = await env.PORTAL_DB
    .prepare('SELECT COUNT(*) AS n FROM uploads WHERE upload_item_id = ? AND customer_id = ?')
    .bind(row.upload_item_id, user.customer_id).first();
  if (Number(left?.n || 0) === 0) {
    await env.PORTAL_DB.prepare("UPDATE upload_items SET status = 'open' WHERE id = ? AND customer_id = ?")
      .bind(row.upload_item_id, user.customer_id).run();
  }
  await writeAudit(env.PORTAL_DB, {
    customer_id: user.customer_id, actor: user.id, action: 'upload_verwijderd',
    meta: { item_id: row.upload_item_id, upload_id: id, name: row.original_name || null }, ip: clientIp(request),
  });
  return jsonResponse({ ok: true });
}

// ── GET /bestand?id= ───────────────────────────────────────────────────────
async function bestand(env, user, url) {
  const id = str(url.searchParams.get('id'));
  const row = id ? await env.PORTAL_DB
    .prepare('SELECT * FROM uploads WHERE id = ? AND customer_id = ? AND file_key IS NOT NULL')
    .bind(id, user.customer_id).first() : null;
  if (!row || !env.PORTAL_FILES) return errorResponse('Bestand niet gevonden', 404);
  const buf = await env.PORTAL_FILES.get(row.file_key, 'arrayBuffer');
  if (!buf) return errorResponse('Bestand niet gevonden', 404);
  const name = sanitizeFileName(row.original_name);
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type': row.mime || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${asciiFallback(name)}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "sandbox; default-src 'none'",
    },
  });
}
