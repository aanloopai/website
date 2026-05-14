#!/usr/bin/env node
// IG Reels publisher via Meta Graph API v19.0 (direct, no Composio).
// Reads marketing/instagram/wave-N-reels-schedule.json, finds next due slot,
// uploads MP4 to IG (media_type=REELS), polls container status, publishes,
// writes media_id + permalink + posted_at back.
//
// MP4 must be pre-rendered by scripts/render-ig-reel.py and reachable at
// `${schedule.video_base_url}/${slot.id}.mp4` (we use public/social-feed/reels/
// served from the Astro site).
//
// Env:
//   IG_PAGE_ACCESS_TOKEN   — Page token with instagram_content_publish + instagram_basic
//   IG_USER_ID             — IG Business User ID
//   SCHEDULE_PATH          — default marketing/instagram/wave-3-reels-schedule.json
//   DRY_RUN                — '1' = log + skip API
//   VALIDATE_ONLY          — '1' = userinfo check only

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
const SCHEDULE_DIR = path.join(REPO_ROOT, "marketing", "instagram");

const TOKEN = (process.env.IG_PAGE_ACCESS_TOKEN || "").trim();
const IG_ID_OVERRIDE = (process.env.IG_USER_ID || "").trim();
const DRY = process.env.DRY_RUN === "1";
const VALIDATE_ONLY = process.env.VALIDATE_ONLY === "1";
const GRAPH = "https://graph.instagram.com/v23.0";

function mask(s) {
  if (!s) return "(empty)";
  if (s.length <= 8) return "(short)";
  return `${s.slice(0, 6)}...${s.slice(-4)} len=${s.length}`;
}

async function resolveSchedulePath() {
  if (process.env.SCHEDULE_PATH) return path.resolve(process.env.SCHEDULE_PATH);
  const entries = await fs.readdir(SCHEDULE_DIR);
  const waves = entries
    .filter((f) => /^wave-\d+-reels-schedule\.json$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/wave-(\d+)/)[1], 10);
      const nb = parseInt(b.match(/wave-(\d+)/)[1], 10);
      return na - nb;
    });
  if (!waves.length) throw new Error(`No wave-N-reels-schedule.json in ${SCHEDULE_DIR}`);
  for (const f of [...waves].reverse()) {
    const sched = JSON.parse(await fs.readFile(path.join(SCHEDULE_DIR, f), "utf8"));
    if ((sched.posts || []).some((p) => p.posted_at === null)) {
      return path.join(SCHEDULE_DIR, f);
    }
  }
  return path.join(SCHEDULE_DIR, waves[waves.length - 1]);
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

async function graphGet(urlPath, params = {}) {
  const usp = new URLSearchParams({ access_token: TOKEN, ...params });
  const url = `${GRAPH}${urlPath}?${usp.toString()}`;
  const res = await fetch(url);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _raw: text };
  }
  if (!res.ok) throw new Error(`GET ${urlPath} HTTP ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
  return data;
}

async function graphPost(urlPath, body) {
  const url = `${GRAPH}${urlPath}`;
  const params = new URLSearchParams({ access_token: TOKEN, ...body });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _raw: text };
  }
  if (!res.ok) throw new Error(`POST ${urlPath} HTTP ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
  return data;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function pollContainerReady(containerId, { maxWaitSec = 180, intervalSec = 6 } = {}) {
  const deadline = Date.now() + maxWaitSec * 1000;
  let last;
  while (Date.now() < deadline) {
    const data = await graphGet(`/${containerId}`, { fields: "status_code,status" });
    last = data;
    console.log(`  container ${containerId} status=${data.status_code} (${data.status || ""})`);
    if (data.status_code === "FINISHED") return data;
    if (data.status_code === "ERROR" || data.status_code === "EXPIRED") {
      throw new Error(`Container failed: ${JSON.stringify(data)}`);
    }
    await sleep(intervalSec * 1000);
  }
  throw new Error(`Container ${containerId} not ready within ${maxWaitSec}s. Last=${JSON.stringify(last)}`);
}

async function main() {
  if (!DRY) {
    if (!TOKEN) {
      console.error("IG_PAGE_ACCESS_TOKEN required (or DRY_RUN=1)");
      process.exit(2);
    }
  }
  console.log(`Graph base: ${GRAPH}`);
  console.log(`Token: ${mask(TOKEN)}`);

  const schedulePath = await resolveSchedulePath();
  console.log(`Schedule: ${path.relative(REPO_ROOT, schedulePath)}`);
  const sched = await readSchedule(schedulePath);
  const igUserId = IG_ID_OVERRIDE || sched.ig_user_id;
  if (!igUserId) {
    console.error("IG_USER_ID empty and schedule.ig_user_id missing");
    process.exit(2);
  }
  console.log(`IG user: ${igUserId}`);

  if (VALIDATE_ONLY) {
    console.log("VALIDATE_ONLY=1 — fetch account info, no posting");
    const me = await graphGet(`/${igUserId}`, { fields: "id,username,name,profile_picture_url" });
    console.log(`Account: ${JSON.stringify(me)}`);
    return;
  }

  const due = findDuePost(sched, Date.now());
  if (!due) {
    console.log("No due Reel slot. Schedule:");
    for (const p of sched.posts) {
      const status = p.posted_at ? `posted ${p.posted_at}` : `pending (${p.slot_iso})`;
      console.log(`  - ${p.id} [${p.template}]: ${status}`);
    }
    return;
  }

  const videoUrl = `${sched.video_base_url.replace(/\/+$/, "")}/${due.id}.mp4`;
  console.log(`\nSlot: ${due.id} template=${due.template} slot_iso=${due.slot_iso}`);
  console.log(`Video URL: ${videoUrl}`);
  console.log(`Caption first line: ${due.caption.split("\n")[0].slice(0, 80)}`);

  if (DRY) {
    console.log("DRY_RUN=1 — skipping Graph API calls.");
    return;
  }

  console.log(`\nCreating REELS container...`);
  const createResp = await graphPost(`/${igUserId}/media`, {
    media_type: "REELS",
    video_url: videoUrl,
    caption: due.caption,
    share_to_feed: due.share_to_feed === false ? "false" : "true",
  });
  const containerId = createResp.id;
  if (!containerId) throw new Error(`No container id: ${JSON.stringify(createResp)}`);
  console.log(`Container: ${containerId}`);

  console.log(`\nPolling container status...`);
  await pollContainerReady(containerId, { maxWaitSec: 180, intervalSec: 6 });

  console.log(`\nPublishing...`);
  const pubResp = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: containerId,
  });
  const mediaId = pubResp.id;
  if (!mediaId) throw new Error(`No media id: ${JSON.stringify(pubResp)}`);
  console.log(`Published: ${mediaId}`);

  let permalink = null;
  try {
    const detail = await graphGet(`/${mediaId}`, { fields: "permalink,timestamp" });
    permalink = detail.permalink || null;
    console.log(`Permalink: ${permalink}`);
    if (detail.timestamp) due.posted_at = new Date(detail.timestamp).toISOString();
  } catch (e) {
    console.warn(`Permalink fetch failed: ${e.message}`);
  }

  due.posted_at = due.posted_at || new Date().toISOString();
  due.media_id = mediaId;
  due.permalink = permalink;
  await writeSchedule(schedulePath, sched);
  console.log(`\nUpdated schedule for ${due.id}.`);
}

main().catch((e) => {
  console.error(`\nFATAL: ${e.stack || e.message}`);
  process.exit(1);
});
