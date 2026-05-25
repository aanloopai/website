#!/usr/bin/env node
// IG STORY publisher — standalone for native 9:16 story backgrounds.
//
// Reads marketing/instagram/wave-N-stories-schedule.json, finds the next due
// unpublished slot, publishes 1080x1920 PNG to @aanloop.ai as a STORIES media
// type via Meta Graph. Writes media_id + posted_at back.
//
// The PNG itself is just the background — interactive stickers (poll, quiz,
// slider, question, countdown, tap-reveal) must be added by the operator in
// the IG app post-publish (Graph API does not support programmatic sticker
// overlay). The renderer (scripts/render-ig-story.py) leaves visual hints
// indicating where each sticker belongs.
//
// Env: same as ig-publish.mjs (IG_PAGE_ACCESS_TOKEN, IG_USER_ID, etc.)

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
const SCHEDULE_DIR = path.join(REPO_ROOT, "marketing", "instagram");

const TOKEN = (process.env.IG_PAGE_ACCESS_TOKEN || "").trim();
const IG_ID_OVERRIDE = (process.env.IG_USER_ID || "").trim();
const GRAPH_VERSION = (process.env.GRAPH_API_VERSION || "v23.0").trim();
const GRAPH = `https://graph.instagram.com/${GRAPH_VERSION}`;
const MAX_WAIT_SEC = Math.max(10, parseInt(process.env.PUBLISH_MAX_WAIT_SEC || "90", 10));
const DRY = process.env.DRY_RUN === "1";

function mask(s) {
  if (!s) return "(empty)";
  if (s.length <= 12) return "(short)";
  return `${s.slice(0, 6)}...${s.slice(-4)} len=${s.length}`;
}

async function resolveStoriesSchedulePath() {
  if (process.env.STORIES_SCHEDULE_PATH) return path.resolve(process.env.STORIES_SCHEDULE_PATH);
  const entries = await fs.readdir(SCHEDULE_DIR);
  const waves = entries
    .filter((f) => /^wave-\d+(-week\d+)?-stories-schedule\.json$/.test(f))
    .sort((a, b) => {
      const na = parseInt(a.match(/wave-(\d+)/)[1], 10);
      const nb = parseInt(b.match(/wave-(\d+)/)[1], 10);
      if (na !== nb) return na - nb;
      const wa = parseInt((a.match(/-week(\d+)/) || [null, "1"])[1], 10);
      const wb = parseInt((b.match(/-week(\d+)/) || [null, "1"])[1], 10);
      return wa - wb;
    });
  if (!waves.length) throw new Error(`No wave-N-stories-schedule.json in ${SCHEDULE_DIR}`);
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

function findDueStory(sched, nowMs) {
  return sched.posts.find((p) => p.posted_at === null && new Date(p.slot_iso).getTime() <= nowMs);
}

async function graphGet(urlPath, params = {}) {
  const usp = new URLSearchParams({ access_token: TOKEN, ...params });
  const res = await fetch(`${GRAPH}${urlPath}?${usp.toString()}`);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { _raw: text }; }
  if (!res.ok) throw new Error(`GET ${urlPath} HTTP ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
  return data;
}

async function graphPost(urlPath, body) {
  const params = new URLSearchParams({ access_token: TOKEN, ...body });
  const res = await fetch(`${GRAPH}${urlPath}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { _raw: text }; }
  if (!res.ok) throw new Error(`POST ${urlPath} HTTP ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
  return data;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

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

async function main() {
  if (!DRY) {
    if (!TOKEN) {
      console.error("IG_PAGE_ACCESS_TOKEN missing or empty after trim");
      process.exit(2);
    }
  }
  console.log(`Graph base: ${GRAPH}`);
  console.log(`Token: ${mask(TOKEN)}`);

  const schedulePath = await resolveStoriesSchedulePath();
  console.log(`Stories schedule: ${path.relative(REPO_ROOT, schedulePath)}`);
  const sched = await readSchedule(schedulePath);
  const igUserId = IG_ID_OVERRIDE || sched.ig_user_id;
  if (!igUserId) {
    console.error("IG_USER_ID empty and schedule.ig_user_id missing");
    process.exit(2);
  }
  console.log(`IG user: ${igUserId}`);

  const due = findDueStory(sched, Date.now());
  if (!due) {
    console.log("No due story. Schedule:");
    for (const p of sched.posts) {
      const status = p.posted_at ? `posted ${p.posted_at}` : `pending (slot ${p.slot_iso})`;
      console.log(`  - ${p.id}: ${status}`);
    }
    return;
  }

  const baseUrl = sched.image_base_url.replace(/\/+$/, "");
  const imageUrl = `${baseUrl}/stories/${due.id}.png`;
  console.log(`\nStory slot: ${due.id} (template=${due.template}, slot_iso=${due.slot_iso})`);
  console.log(`Image URL: ${imageUrl}`);

  if (DRY) {
    console.log("DRY_RUN=1 - skipping Graph API calls.");
    return;
  }

  console.log(`\nCreating STORIES container...`);
  const createResp = await graphPost(`/${igUserId}/media`, {
    media_type: "STORIES",
    image_url: imageUrl,
  });
  const containerId = createResp.id;
  if (!containerId) throw new Error(`No container id: ${JSON.stringify(createResp).slice(0, 400)}`);
  console.log(`Container: ${containerId}`);

  console.log(`Polling status...`);
  await pollContainerReady(containerId, { maxWaitSec: MAX_WAIT_SEC });

  console.log(`Publishing STORIES container...`);
  const pubResp = await graphPost(`/${igUserId}/media_publish`, { creation_id: containerId });
  const mediaId = pubResp.id;
  if (!mediaId) throw new Error(`No media id: ${JSON.stringify(pubResp).slice(0, 400)}`);
  console.log(`Story published: ${mediaId}`);

  due.posted_at = new Date().toISOString();
  due.media_id = mediaId;

  await writeSchedule(schedulePath, sched);
  console.log(`\nUpdated stories schedule for ${due.id}.`);
}

main().catch((e) => {
  console.error(`\nFATAL: ${e.stack || e.message}`);
  process.exit(1);
});
