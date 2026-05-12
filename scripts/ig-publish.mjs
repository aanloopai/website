#!/usr/bin/env node
// IG photo publisher. Reads marketing/instagram/wave-2-schedule.json,
// publishes one due-and-unposted slot to @aanloop.ai via Meta Graph API,
// writes media_id + permalink + posted_at back.
//
// Env:
//   META_LL_TOKEN      — long-lived Page access token (required)
//   GRAPH_API_VERSION  — default v21.0
//   SCHEDULE_PATH      — default marketing/instagram/wave-2-schedule.json
//   DRY_RUN            — '1' = skip Graph API, print only

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
const SCHEDULE_PATH = process.env.SCHEDULE_PATH
  ? path.resolve(process.env.SCHEDULE_PATH)
  : path.join(REPO_ROOT, "marketing", "instagram", "wave-2-schedule.json");
const GRAPH_VERSION = process.env.GRAPH_API_VERSION || "v21.0";
const TOKEN = process.env.META_LL_TOKEN || "";
const DRY = process.env.DRY_RUN === "1";

const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

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

async function graph(method, pathSuffix, body) {
  const url = `${GRAPH_BASE}${pathSuffix}`;
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Graph ${method} ${pathSuffix} failed: HTTP ${res.status} ${JSON.stringify(data)}`,
    );
  }
  return data;
}

async function createContainer(igUserId, imageUrl, caption) {
  const params = new URLSearchParams({ image_url: imageUrl, caption, access_token: TOKEN });
  return graph("POST", `/${igUserId}/media?${params.toString()}`);
}

async function publishContainer(igUserId, creationId) {
  const params = new URLSearchParams({ creation_id: creationId, access_token: TOKEN });
  return graph("POST", `/${igUserId}/media_publish?${params.toString()}`);
}

async function fetchPermalink(mediaId) {
  const params = new URLSearchParams({ fields: "permalink,timestamp", access_token: TOKEN });
  return graph("GET", `/${mediaId}?${params.toString()}`);
}

async function waitContainerReady(creationId, maxSeconds = 60) {
  const deadline = Date.now() + maxSeconds * 1000;
  let last = "";
  while (Date.now() < deadline) {
    const params = new URLSearchParams({ fields: "status_code,status", access_token: TOKEN });
    const d = await graph("GET", `/${creationId}?${params.toString()}`);
    last = d.status_code || d.status || "";
    if (last === "FINISHED") return;
    if (last === "ERROR" || last === "EXPIRED") throw new Error(`Container failed: ${last}`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`Container not ready within ${maxSeconds}s (last status=${last})`);
}

async function main() {
  if (!TOKEN && !DRY) {
    console.error("META_LL_TOKEN missing");
    process.exit(2);
  }

  const sched = await readSchedule();
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
  console.log(`Publishing ${due.id} (slot ${due.slot_iso}) -> ${imageUrl}`);
  console.log(`Caption first line: ${due.caption.split("\n")[0].slice(0, 80)}`);

  if (DRY) {
    console.log("DRY_RUN=1 - skipping Graph API calls.");
    return;
  }

  const created = await createContainer(sched.ig_user_id, imageUrl, due.caption);
  const creationId = created.id;
  console.log(`Container: ${creationId}`);

  await waitContainerReady(creationId, 60);
  const pub = await publishContainer(sched.ig_user_id, creationId);
  const mediaId = pub.id;
  console.log(`Published media: ${mediaId}`);

  let permalink = null;
  try {
    const det = await fetchPermalink(mediaId);
    permalink = det.permalink || null;
  } catch (e) {
    console.warn(`Permalink fetch failed: ${e.message}`);
  }

  due.posted_at = new Date().toISOString();
  due.media_id = mediaId;
  due.permalink = permalink;
  await writeSchedule(sched);
  console.log(`Updated schedule for ${due.id}.`);
}

main().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
