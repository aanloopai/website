#!/usr/bin/env node
// IG photo publisher via Meta Graph API (direct).
// Reads marketing/instagram/wave-N-schedule.json, finds the next due unpublished
// slot, posts via Meta Graph API v19.0 using a long-lived Page Access Token,
// writes media_id + permalink + posted_at back.
//
// Env:
//   META_PAGE_ACCESS_TOKEN  — long-lived Page Access Token with
//                             instagram_basic + instagram_content_publish
//                             + pages_show_list scopes (required for live runs)
//   IG_BUSINESS_ACCOUNT_ID  — optional override for IG business account id
//                             (default: schedule.ig_user_id)
//   GRAPH_API_VERSION       — default v19.0
//   SCHEDULE_PATH           — default: auto-discover wave-N-schedule.json
//   PUBLISH_MAX_WAIT_SEC    — default 90 (container processing wait cap)
//   DRY_RUN                 — '1' = print plan only, no API calls
//   VALIDATE_ONLY           — '1' = token + account identity check, no posting

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
const SCHEDULE_DIR = path.join(REPO_ROOT, "marketing", "instagram");

const TOKEN = (process.env.META_PAGE_ACCESS_TOKEN || "").trim();
const IG_ID_OVERRIDE = (process.env.IG_BUSINESS_ACCOUNT_ID || "").trim();
const GRAPH_VERSION = (process.env.GRAPH_API_VERSION || "v19.0").trim();
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const MAX_WAIT_SEC = Math.max(10, parseInt(process.env.PUBLISH_MAX_WAIT_SEC || "90", 10));
const DRY = process.env.DRY_RUN === "1";
const VALIDATE_ONLY = process.env.VALIDATE_ONLY === "1";

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

function maskToken(t) {
  if (!t) return "(empty)";
  if (t.length <= 12) return "(short)";
  return `${t.slice(0, 6)}...${t.slice(-4)} len=${t.length}`;
}

async function readSchedule(p) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

async function writeSchedule(p, sched) {
  await fs.writeFile(p, JSON.stringify(sched, null, 2) + "\n", "utf8");
}

function findDuePost(sched, nowMs) {
  return sched.posts.find((p) => p.posted_at === null && new Date(p.slot_iso).getTime() <= nowMs);
}

async function graphFetch(method, urlPath, { query, form } = {}) {
  const params = new URLSearchParams();
  if (query) for (const [k, v] of Object.entries(query)) if (v != null) params.append(k, String(v));
  if (method === "GET" && !params.has("access_token")) params.append("access_token", TOKEN);
  const qs = params.toString();
  const url = `${GRAPH_BASE}${urlPath}${qs ? `?${qs}` : ""}`;

  let body;
  const headers = { Accept: "application/json" };
  if (method !== "GET") {
    const fp = new URLSearchParams();
    if (form) for (const [k, v] of Object.entries(form)) if (v != null) fp.append(k, String(v));
    if (!fp.has("access_token")) fp.append("access_token", TOKEN);
    body = fp.toString();
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }

  const res = await fetch(url, { method, headers, body });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { _raw: text }; }
  if (!res.ok) {
    const safeUrl = TOKEN ? url.split(TOKEN).join("***") : url;
    throw new Error(`Graph ${method} ${safeUrl} HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  if (data && data.error) {
    throw new Error(`Graph ${method} ${urlPath} error: ${JSON.stringify(data.error)}`);
  }
  return data;
}

async function fetchWithRetry(method, urlPath, opts, { tries = 3, delayMs = 1500 } = {}) {
  let lastErr;
  for (let i = 1; i <= tries; i++) {
    try {
      return await graphFetch(method, urlPath, opts);
    } catch (e) {
      lastErr = e;
      const msg = (e.message || "").toLowerCase();
      const transient = /http 5\d\d|timeout|econnreset|fetch failed|enotfound/.test(msg);
      if (!transient || i === tries) throw e;
      console.warn(`Attempt ${i}/${tries} failed (transient): ${e.message.slice(0, 200)} — retry in ${delayMs * i}ms`);
      await new Promise((r) => setTimeout(r, delayMs * i));
    }
  }
  throw lastErr;
}

async function validateToken(igUserId) {
  const me = await graphFetch("GET", `/me`, { query: { fields: "id,name" } });
  console.log(`Token /me: id=${me.id} name=${me.name || "(no name)"}`);
  const acct = await graphFetch("GET", `/${igUserId}`, { query: { fields: "id,username" } });
  console.log(`IG account: id=${acct.id} username=${acct.username || "(no username)"}`);
  return { me, acct };
}

async function createMediaContainer(igUserId, imageUrl, caption) {
  return graphFetch("POST", `/${igUserId}/media`, {
    form: { image_url: imageUrl, caption },
  });
}

async function waitForContainerReady(creationId, maxWaitSec) {
  const deadlineMs = Date.now() + maxWaitSec * 1000;
  let lastStatus = null;
  while (Date.now() < deadlineMs) {
    const det = await graphFetch("GET", `/${creationId}`, { query: { fields: "status_code,status" } });
    lastStatus = det.status_code || det.status || null;
    if (lastStatus === "FINISHED") return lastStatus;
    if (lastStatus === "ERROR" || lastStatus === "EXPIRED") {
      throw new Error(`Container ${creationId} status=${lastStatus}: ${JSON.stringify(det)}`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  console.warn(`Container ${creationId} not FINISHED after ${maxWaitSec}s (last=${lastStatus}); attempting publish anyway`);
  return lastStatus;
}

async function publishContainer(igUserId, creationId) {
  return fetchWithRetry("POST", `/${igUserId}/media_publish`, {
    form: { creation_id: creationId },
  });
}

async function fetchPermalink(mediaId) {
  return graphFetch("GET", `/${mediaId}`, {
    query: { fields: "permalink,timestamp,id" },
  });
}

async function main() {
  if (!TOKEN && !DRY) {
    console.error("META_PAGE_ACCESS_TOKEN missing or empty after trim");
    process.exit(2);
  }
  console.log(`Meta token: ${maskToken(TOKEN)}`);
  console.log(`Graph base: ${GRAPH_BASE}`);

  const schedulePath = await resolveSchedulePath();
  console.log(`Schedule: ${path.relative(REPO_ROOT, schedulePath)}`);
  const sched = await readSchedule(schedulePath);
  const igUserId = IG_ID_OVERRIDE || sched.ig_user_id;
  if (!igUserId) throw new Error("No IG business account id (schedule.ig_user_id or IG_BUSINESS_ACCOUNT_ID env)");
  console.log(`IG business account: ${igUserId}`);

  if (VALIDATE_ONLY) {
    console.log("VALIDATE_ONLY=1 — token + account identity check, no posting.");
    if (DRY) {
      console.log("DRY_RUN also set; skipping live Graph calls.");
      return;
    }
    await validateToken(igUserId);
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
    console.log("DRY_RUN=1 - skipping Graph API calls.");
    return;
  }

  console.log(`\nCreating media container (POST /${igUserId}/media)...`);
  const createResp = await createMediaContainer(igUserId, imageUrl, due.caption);
  const creationId = createResp.id;
  if (!creationId) throw new Error(`No container id in response: ${JSON.stringify(createResp).slice(0, 500)}`);
  console.log(`Container created: ${creationId}`);

  console.log(`\nWaiting for container to be ready (max ${MAX_WAIT_SEC}s)...`);
  const finalStatus = await waitForContainerReady(creationId, MAX_WAIT_SEC);
  console.log(`Container status: ${finalStatus}`);

  console.log(`\nPublishing container (POST /${igUserId}/media_publish)...`);
  const pubResp = await publishContainer(igUserId, creationId);
  const mediaId = pubResp.id;
  if (!mediaId) throw new Error(`No media id in publish response: ${JSON.stringify(pubResp).slice(0, 500)}`);
  console.log(`Published media: ${mediaId}`);

  let permalink = null;
  let timestamp = null;
  try {
    const det = await fetchPermalink(mediaId);
    permalink = det.permalink || null;
    timestamp = det.timestamp || null;
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
