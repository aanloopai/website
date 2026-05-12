#!/usr/bin/env node
// IG photo publisher via Composio Platform API.
// Reads marketing/instagram/wave-2-schedule.json, finds the next due unpublished
// slot, posts via Composio (which holds the working Meta auth chain), writes
// media_id + permalink + posted_at back.
//
// Env:
//   COMPOSIO_API_KEY        — Composio Platform API key (required for live runs)
//   COMPOSIO_CONNECTION_ID  — optional override for IG connection (e.g. ca_xxx)
//   COMPOSIO_API_BASE       — default https://backend.composio.dev
//   SCHEDULE_PATH           — default marketing/instagram/wave-2-schedule.json
//   DRY_RUN                 — '1' = skip API calls, print plan only
//   VALIDATE_ONLY           — '1' = list IG connection only, no posting

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
const SCHEDULE_DIR = path.join(REPO_ROOT, "marketing", "instagram");

async function resolveSchedulePath() {
  if (process.env.SCHEDULE_PATH) return path.resolve(process.env.SCHEDULE_PATH);
  const entries = await fs.readdir(SCHEDULE_DIR);
  const waves = entries
    .filter((f) => /^wave-\d+-schedule\.json$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/wave-(\d+)/)[1], 10);
      const nb = parseInt(b.match(/wave-(\d+)/)[1], 10);
      return na - nb;
    });
  if (!waves.length) throw new Error(`No wave-N-schedule.json in ${SCHEDULE_DIR}`);
  for (const f of [...waves].reverse()) {
    const sched = JSON.parse(await fs.readFile(path.join(SCHEDULE_DIR, f), "utf8"));
    if ((sched.posts || []).some((p) => p.posted_at === null)) {
      return path.join(SCHEDULE_DIR, f);
    }
  }
  return path.join(SCHEDULE_DIR, waves[waves.length - 1]);
}

const API_KEY = (process.env.COMPOSIO_API_KEY || "").trim();
const BASE = (process.env.COMPOSIO_API_BASE || "https://backend.composio.dev").replace(/\/+$/, "");
const CONNECTION_OVERRIDE = (process.env.COMPOSIO_CONNECTION_ID || "").trim();
const DRY = process.env.DRY_RUN === "1";
const VALIDATE_ONLY = process.env.VALIDATE_ONLY === "1";

function maskKey(k) {
  if (!k) return "(empty)";
  if (k.length <= 12) return "(short)";
  return `${k.slice(0, 6)}...${k.slice(-4)} len=${k.length}`;
}

async function readSchedule(p) {
  const raw = await fs.readFile(p, "utf8");
  return JSON.parse(raw);
}

async function writeSchedule(p, sched) {
  await fs.writeFile(p, JSON.stringify(sched, null, 2) + "\n", "utf8");
}

function findDuePost(sched, nowMs) {
  return sched.posts.find((p) => p.posted_at === null && new Date(p.slot_iso).getTime() <= nowMs);
}

async function composioFetch(method, urlPath, body) {
  const url = `${BASE}${urlPath}`;
  const res = await fetch(url, {
    method,
    headers: {
      "x-api-key": API_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _raw: text };
  }
  if (!res.ok) {
    throw new Error(`Composio ${method} ${urlPath} HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  if (data && data.successful === false) {
    throw new Error(`Composio ${method} ${urlPath} successful=false: ${JSON.stringify(data)}`);
  }
  return data;
}

async function findIgConnection() {
  if (CONNECTION_OVERRIDE) {
    console.log(`Using connection override: ${CONNECTION_OVERRIDE}`);
    return { id: CONNECTION_OVERRIDE, uuid: CONNECTION_OVERRIDE };
  }
  let d;
  try {
    d = await composioFetch("GET", "/api/v3/connected_accounts?toolkit_slugs=instagram&status=ACTIVE");
  } catch (e) {
    console.warn(`v3 connected_accounts failed: ${e.message}`);
    try {
      d = await composioFetch("GET", "/api/v1/connectedAccounts?appNames=instagram&status=ACTIVE");
    } catch (e2) {
      throw new Error(`Both v3 and v1 connection list failed. v3: ${e.message} | v1: ${e2.message}`);
    }
  }
  const items = d.items || d.data || d.connectedAccounts || [];
  const ig = items.find((it) => {
    const slug = (it.toolkit?.slug || it.appName || it.appUniqueName || "").toLowerCase();
    return slug === "instagram";
  });
  if (!ig) {
    throw new Error(`No active Instagram connection. Raw: ${JSON.stringify(d).slice(0, 500)}`);
  }
  const publicId = ig.id || ig.connectedAccountId;
  const uuid = ig.uuid || ig.connection_uuid || ig.connectedAccountUuid || null;
  console.log(`Found IG connection: id=${publicId} uuid=${uuid} status=${ig.status}`);
  console.log(`Connection raw fields: ${JSON.stringify(Object.keys(ig))}`);
  // If uuid missing, fetch detail
  let resolvedUuid = uuid;
  if (!resolvedUuid && publicId) {
    try {
      const det = await composioFetch("GET", `/api/v3/connected_accounts/${publicId}`);
      resolvedUuid = det.uuid || det.id || publicId;
      console.log(`Fetched detail; uuid resolved to: ${resolvedUuid}`);
    } catch (e) {
      console.warn(`Detail fetch failed, falling back to public id: ${e.message}`);
      resolvedUuid = publicId;
    }
  }
  return { id: publicId, uuid: resolvedUuid || publicId };
}

async function executeAction(actionSlug, connection, input) {
  const slugVariants = [actionSlug, actionSlug.toLowerCase(), actionSlug.toUpperCase()];
  const errors = [];

  // Try v3 with each slug variant + public id
  for (const slug of slugVariants) {
    try {
      return await composioFetch("POST", `/api/v3/tools/execute/${slug}`, {
        connected_account_id: connection.id,
        arguments: input,
      });
    } catch (e) {
      errors.push(`v3/${slug}/id: ${e.message.slice(0, 200)}`);
    }
    try {
      return await composioFetch("POST", `/api/v3/tools/execute/${slug}`, {
        connected_account_id: connection.uuid,
        arguments: input,
      });
    } catch (e) {
      errors.push(`v3/${slug}/uuid: ${e.message.slice(0, 200)}`);
    }
  }

  // Try v2 with both ids
  for (const cid of [connection.uuid, connection.id]) {
    try {
      return await composioFetch("POST", `/api/v2/actions/${actionSlug}/execute`, {
        connectedAccountId: cid,
        input,
      });
    } catch (e) {
      errors.push(`v2/${actionSlug}/${cid}: ${e.message.slice(0, 200)}`);
    }
  }

  throw new Error(`All execute attempts failed for ${actionSlug}:\n  ${errors.join("\n  ")}`);
}

function pickId(resp) {
  // Result envelope variations
  if (!resp) return null;
  if (resp.data && resp.data.id) return resp.data.id;
  if (resp.data && resp.data.data && resp.data.data.id) return resp.data.data.id;
  if (resp.response_data && resp.response_data.id) return resp.response_data.id;
  if (resp.id) return resp.id;
  return null;
}

function pickField(resp, key) {
  if (!resp) return null;
  if (resp.data && resp.data[key] != null) return resp.data[key];
  if (resp.data && resp.data.data && resp.data.data[key] != null) return resp.data.data[key];
  if (resp.response_data && resp.response_data[key] != null) return resp.response_data[key];
  return resp[key] ?? null;
}

async function main() {
  if (!API_KEY && !DRY) {
    console.error("COMPOSIO_API_KEY missing or empty after trim");
    process.exit(2);
  }
  console.log(`Composio API key: ${maskKey(API_KEY)}`);
  console.log(`Composio base: ${BASE}`);

  const schedulePath = await resolveSchedulePath();
  console.log(`Schedule: ${path.relative(REPO_ROOT, schedulePath)}`);
  const sched = await readSchedule(schedulePath);

  if (VALIDATE_ONLY) {
    console.log("VALIDATE_ONLY=1 — list IG connection + available tools, no post.");
    const conn = await findIgConnection();
    console.log(`Validated connection: id=${conn.id} uuid=${conn.uuid}`);
    try {
      const tools = await composioFetch(
        "GET",
        "/api/v3/tools?toolkit_slug=instagram&limit=200",
      );
      const items = tools.items || tools.data || [];
      console.log(`\nAvailable Instagram tools (${items.length}):`);
      for (const t of items) {
        const slug = t.slug || t.name || t.action;
        const desc = (t.description || t.name || "").toString().slice(0, 90);
        console.log(`  - ${slug}: ${desc}`);
      }
    } catch (e) {
      console.warn(`Tool list failed: ${e.message}`);
    }
    return;
  }

  const now = Date.now();
  const due = findDuePost(sched, now);

  if (!due) {
    console.log("No due post. Schedule:");
    for (const p of sched.posts) {
      const status = p.posted_at ? `posted ${p.posted_at}` : `pending (slot ${p.slot_iso})`;
      console.log(`  - ${p.id}: ${status}`);
    }
    return;
  }

  const imageUrl = `${sched.image_base_url}/${due.image}`;
  console.log(`Slot: ${due.id} (slot_iso=${due.slot_iso})`);
  console.log(`Image URL: ${imageUrl}`);
  console.log(`Caption first line: ${due.caption.split("\n")[0].slice(0, 80)}`);
  console.log(`Caption length: ${due.caption.length} chars`);

  if (DRY) {
    console.log("DRY_RUN=1 - skipping Composio API calls.");
    return;
  }

  const connectionId = await findIgConnection();

  console.log(`\nCreating media container via Composio (INSTAGRAM_CREATE_MEDIA_CONTAINER)...`);
  const createResp = await executeAction("INSTAGRAM_CREATE_MEDIA_CONTAINER", connectionId, {
    ig_user_id: sched.ig_user_id,
    image_url: imageUrl,
    caption: due.caption,
  });
  console.log(`Create response keys: ${JSON.stringify(Object.keys(createResp || {}))}`);
  const creationId = pickId(createResp);
  if (!creationId) throw new Error(`No creation id in response: ${JSON.stringify(createResp).slice(0, 500)}`);
  console.log(`Container created: ${creationId}`);

  console.log(`\nPublishing container via Composio (INSTAGRAM_CREATE_POST)...`);
  const pubResp = await executeAction("INSTAGRAM_CREATE_POST", connectionId, {
    ig_user_id: sched.ig_user_id,
    creation_id: creationId,
    max_wait_seconds: 90,
  });
  console.log(`Publish response keys: ${JSON.stringify(Object.keys(pubResp || {}))}`);
  const mediaId = pickId(pubResp);
  if (!mediaId) throw new Error(`No media id in publish response: ${JSON.stringify(pubResp).slice(0, 500)}`);
  console.log(`Published media: ${mediaId}`);

  let permalink = null;
  let timestamp = null;
  try {
    const detail = await executeAction("INSTAGRAM_GET_USER_MEDIA", connectionId, {
      ig_user_id: sched.ig_user_id,
      limit: 1,
    });
    const first = (detail?.data?.data?.[0]) || (detail?.data?.[0]) || null;
    if (first) {
      permalink = first.permalink || null;
      timestamp = first.timestamp || null;
    }
    console.log(`Permalink: ${permalink}`);
  } catch (e) {
    console.warn(`Permalink fetch failed: ${e.message}`);
  }

  due.posted_at = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
  due.media_id = mediaId;
  due.permalink = permalink;
  await writeSchedule(schedulePath, sched);
  console.log(`\nUpdated schedule for ${due.id}.`);
}

main().catch((e) => {
  console.error(`\nFATAL: ${e.stack || e.message}`);
  process.exit(1);
});
