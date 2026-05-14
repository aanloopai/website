#!/usr/bin/env node
// IG photo publisher via Meta Graph API v19.0 (direct, no Composio).
// Reads marketing/instagram/wave-N-schedule.json, finds the next due unpublished
// slot, posts via Meta Graph using a long-lived Page Access Token, writes
// media_id + permalink + posted_at back.
//
// After a successful feed post the publisher ALSO attempts to publish the same
// image as a Story to @aanloop.ai. Story step is best-effort: if Graph rejects
// media_type=STORIES the feed post is still considered successful and the
// story failure is logged but does not fail the workflow. Per-slot opt-out via
// `"story_enabled": false` in the schedule entry.
//
// Env:
//   IG_PAGE_ACCESS_TOKEN   — Page token with instagram_basic
//                            + instagram_content_publish (required for live)
//   IG_USER_ID             — IG Business User ID (default: schedule.ig_user_id)
//   GRAPH_API_VERSION      — default v19.0
//   SCHEDULE_PATH          — default: auto-discover wave-N-schedule.json
//   PUBLISH_MAX_WAIT_SEC   — container processing wait cap, default 90
//   STORY_DISABLE          — '1' = globally skip the story step
//   DRY_RUN                — '1' = skip API calls, print plan only
//   VALIDATE_ONLY          — '1' = token + account identity check, no posting

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
const SCHEDULE_DIR = path.join(REPO_ROOT, "marketing", "instagram");

const TOKEN = (process.env.IG_PAGE_ACCESS_TOKEN || "").trim();
const IG_ID_OVERRIDE = (process.env.IG_USER_ID || "").trim();
const GRAPH_VERSION = (process.env.GRAPH_API_VERSION || "v19.0").trim();
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const MAX_WAIT_SEC = Math.max(10, parseInt(process.env.PUBLISH_MAX_WAIT_SEC || "90", 10));
const DRY = process.env.DRY_RUN === "1";
const VALIDATE_ONLY = process.env.VALIDATE_ONLY === "1";
const STORY_DISABLE = process.env.STORY_DISABLE === "1";

function mask(s) {
  if (!s) return "(empty)";
  if (s.length <= 12) return "(short)";
  return `${s.slice(0, 6)}...${s.slice(-4)} len=${s.length}`;
}

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
  // Pick lowest-N wave with any pending slot, so earlier waves finish before later ones.
  for (const f of waves) {
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

async function pollContainerReady(containerId, { maxWaitSec, intervalSec = 4 } = {}) {
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

async function publishStory(igUserId, imageUrl) {
  console.log(`\nCreating STORIES container (media_type=STORIES)...`);
  const createResp = await graphPost(`/${igUserId}/media`, {
    media_type: "STORIES",
    image_url: imageUrl,
  });
  const containerId = createResp.id;
  if (!containerId) throw new Error(`No container id in STORIES response: ${JSON.stringify(createResp).slice(0, 400)}`);
  console.log(`Story container: ${containerId}`);

  console.log(`Polling story container status...`);
  await pollContainerReady(containerId, { maxWaitSec: MAX_WAIT_SEC });

  console.log(`Publishing STORIES container...`);
  const pubResp = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: containerId,
  });
  const storyId = pubResp.id;
  if (!storyId) throw new Error(`No story media id: ${JSON.stringify(pubResp).slice(0, 400)}`);
  console.log(`Story published: ${storyId}`);
  return storyId;
}

async function main() {
  if (!DRY && !VALIDATE_ONLY) {
    if (!TOKEN) {
      console.error("IG_PAGE_ACCESS_TOKEN missing or empty after trim");
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
    if (!TOKEN) {
      console.error("IG_PAGE_ACCESS_TOKEN required for VALIDATE_ONLY");
      process.exit(2);
    }
    const me = await graphGet(`/${igUserId}`, { fields: "id,username,name,profile_picture_url" });
    console.log(`Account: ${JSON.stringify(me)}`);
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

  const imageUrl = `${sched.image_base_url.replace(/\/+$/, "")}/${due.image}`;
  console.log(`\nSlot: ${due.id} (slot_iso=${due.slot_iso})`);
  console.log(`Image URL: ${imageUrl}`);
  console.log(`Caption first line: ${due.caption.split("\n")[0].slice(0, 80)}`);
  console.log(`Caption length: ${due.caption.length} chars`);

  if (DRY) {
    console.log("DRY_RUN=1 - skipping Graph API calls.");
    return;
  }

  console.log(`\nCreating feed container (image_url + caption)...`);
  const createResp = await graphPost(`/${igUserId}/media`, {
    image_url: imageUrl,
    caption: due.caption,
  });
  const containerId = createResp.id;
  if (!containerId) throw new Error(`No container id: ${JSON.stringify(createResp).slice(0, 400)}`);
  console.log(`Container: ${containerId}`);

  console.log(`\nPolling container status...`);
  await pollContainerReady(containerId, { maxWaitSec: MAX_WAIT_SEC });

  console.log(`\nPublishing feed container...`);
  const pubResp = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: containerId,
  });
  const mediaId = pubResp.id;
  if (!mediaId) throw new Error(`No media id: ${JSON.stringify(pubResp).slice(0, 400)}`);
  console.log(`Published: ${mediaId}`);

  let permalink = null;
  let timestamp = null;
  try {
    const detail = await graphGet(`/${mediaId}`, { fields: "permalink,timestamp" });
    permalink = detail.permalink || null;
    timestamp = detail.timestamp || null;
    console.log(`Permalink: ${permalink}`);
  } catch (e) {
    console.warn(`Permalink fetch failed: ${e.message}`);
  }

  due.posted_at = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();
  due.media_id = mediaId;
  due.permalink = permalink;

  const storyEnabled = due.story_enabled !== false;
  if (STORY_DISABLE) {
    console.log("\nStory step disabled via STORY_DISABLE=1.");
  } else if (!storyEnabled) {
    console.log(`\nStory step skipped for ${due.id} (story_enabled=false).`);
  } else {
    try {
      const storyId = await publishStory(igUserId, imageUrl);
      due.story_media_id = storyId;
      due.story_posted_at = new Date().toISOString();
      delete due.story_error;
    } catch (e) {
      console.warn(`\nStory publish failed (non-fatal): ${e.message}`);
      due.story_media_id = null;
      due.story_posted_at = null;
      due.story_error = String(e.message || e).slice(0, 300);
    }
  }

  await writeSchedule(schedulePath, sched);
  console.log(`\nUpdated schedule for ${due.id}.`);
}

main().catch((e) => {
  console.error(`\nFATAL: ${e.stack || e.message}`);
  process.exit(1);
});
