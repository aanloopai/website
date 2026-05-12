#!/usr/bin/env node
// IG photo publisher. Reads marketing/instagram/wave-2-schedule.json,
// publishes one due-and-unposted slot to @aanloop.ai via Meta Graph API,
// writes media_id + permalink + posted_at back.
//
// Env:
//   META_LL_TOKEN      — long-lived Page access token (required for live runs)
//   GRAPH_API_VERSION  — default v21.0
//   SCHEDULE_PATH      — default marketing/instagram/wave-2-schedule.json
//   DRY_RUN            — '1' = skip Graph API writes, print plan only

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
const SCHEDULE_PATH = process.env.SCHEDULE_PATH
  ? path.resolve(process.env.SCHEDULE_PATH)
  : path.join(REPO_ROOT, "marketing", "instagram", "wave-2-schedule.json");
const GRAPH_VERSION = process.env.GRAPH_API_VERSION || "v21.0";
const TOKEN = (process.env.META_LL_TOKEN || "").trim();
const DRY = process.env.DRY_RUN === "1";
const VALIDATE_ONLY = process.env.VALIDATE_ONLY === "1";

const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function maskToken(t) {
  if (!t) return "(empty)";
  if (t.length <= 12) return "(short)";
  return `${t.slice(0, 6)}...${t.slice(-4)} len=${t.length}`;
}

async function readSchedule() {
  const raw = await fs.readFile(SCHEDULE_PATH, "utf8");
  return JSON.parse(raw);
}

async function writeSchedule(sched) {
  await fs.writeFile(SCHEDULE_PATH, JSON.stringify(sched, null, 2) + "\n", "utf8");
}

function findDuePost(sched, nowMs) {
  return sched.posts.find((p) => p.posted_at === null && new Date(p.slot_iso).getTime() <= nowMs);
}

async function graphCall(method, pathSuffix, params) {
  const url = `${GRAPH_BASE}${pathSuffix}`;
  const opts = { method, headers: {} };
  let finalUrl = url;
  if (method === "GET") {
    const qs = new URLSearchParams(params || {}).toString();
    finalUrl = qs ? `${url}?${qs}` : url;
  } else {
    opts.headers["Content-Type"] = "application/x-www-form-urlencoded";
    opts.body = new URLSearchParams(params || {}).toString();
  }
  const res = await fetch(finalUrl, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _raw: text };
  }
  if (!res.ok) {
    const msg = JSON.stringify(data);
    throw new Error(`Graph ${method} ${pathSuffix} HTTP ${res.status}: ${msg}`);
  }
  return data;
}

async function validateToken(igUserId) {
  console.log(`Token: ${maskToken(TOKEN)}`);
  // Use IG-specific endpoint that only requires instagram_content_publish (the scope we have).
  // /me requires pages_read_engagement which is not in our scope set.
  const d = await graphCall("GET", `/${igUserId}/content_publishing_limit`, {
    access_token: TOKEN,
  });
  const usage = d.data && d.data[0];
  if (usage) {
    console.log(
      `IG quota: ${usage.quota_usage || 0}/${usage.config?.quota_total || 25} posts in last 24h (config period ${usage.config?.quota_duration || 86400}s)`,
    );
  } else {
    console.log(`Quota check OK (raw: ${JSON.stringify(d)})`);
  }
  return d;
}

async function createContainer(igUserId, imageUrl, caption) {
  return graphCall("POST", `/${igUserId}/media`, {
    image_url: imageUrl,
    caption,
    access_token: TOKEN,
  });
}

async function publishContainer(igUserId, creationId) {
  return graphCall("POST", `/${igUserId}/media_publish`, {
    creation_id: creationId,
    access_token: TOKEN,
  });
}

async function fetchPermalink(mediaId) {
  return graphCall("GET", `/${mediaId}`, {
    fields: "permalink,timestamp",
    access_token: TOKEN,
  });
}

async function waitContainerReady(creationId, maxSeconds = 90) {
  const deadline = Date.now() + maxSeconds * 1000;
  let last = "";
  while (Date.now() < deadline) {
    const d = await graphCall("GET", `/${creationId}`, {
      fields: "status_code,status",
      access_token: TOKEN,
    });
    last = d.status_code || d.status || "";
    console.log(`  container ${creationId} status=${last}`);
    if (last === "FINISHED") return;
    if (last === "ERROR" || last === "EXPIRED") throw new Error(`Container failed: ${last}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`Container not ready within ${maxSeconds}s (last status=${last})`);
}

async function main() {
  if (!TOKEN && !DRY) {
    console.error("META_LL_TOKEN missing or empty after trim");
    process.exit(2);
  }

  const sched = await readSchedule();

  if (VALIDATE_ONLY) {
    console.log("VALIDATE_ONLY=1 — IG quota + token check, no post.");
    await validateToken(sched.ig_user_id);
    console.log("Token OK. Exiting.");
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

  await validateToken(sched.ig_user_id);

  console.log(`\nCreating media container...`);
  const created = await createContainer(sched.ig_user_id, imageUrl, due.caption);
  const creationId = created.id;
  console.log(`Container created: ${creationId}`);

  console.log(`\nWaiting for container FINISHED...`);
  await waitContainerReady(creationId, 90);

  console.log(`\nPublishing container...`);
  const pub = await publishContainer(sched.ig_user_id, creationId);
  const mediaId = pub.id;
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

  due.posted_at = timestamp
    ? new Date(timestamp).toISOString()
    : new Date().toISOString();
  due.media_id = mediaId;
  due.permalink = permalink;
  await writeSchedule(sched);
  console.log(`\nUpdated schedule for ${due.id}.`);
}

main().catch((e) => {
  console.error(`\nFATAL: ${e.stack || e.message}`);
  process.exit(1);
});
