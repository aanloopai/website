#!/usr/bin/env node
// Facebook Page publisher via Meta Graph API v19.0.
// Reads marketing/facebook/wave-N-schedule.json, finds the next due slot,
// posts photo+caption to the configured Page, writes post_id + permalink back.
//
// Env:
//   FB_PAGE_ID                 — Aanloop AI Facebook Page numeric id (required)
//   FB_PAGE_ACCESS_TOKEN       — long-lived Page token, scope pages_manage_posts + pages_read_engagement (required)
//   FB_API_VERSION             — default v19.0
//   SCHEDULE_PATH              — default: auto-discover marketing/facebook/wave-N-schedule.json
//   DRY_RUN                    — '1' = print plan only, no API calls
//   VALIDATE_ONLY              — '1' = Page identity check via /me, no posting

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
const SCHEDULE_DIR = path.join(REPO_ROOT, "marketing", "facebook");

function cleanEnv(v) {
  return (v || "").replace(/\s+/g, "");
}
const PAGE_ID = cleanEnv(process.env.FB_PAGE_ID);
const TOKEN = cleanEnv(process.env.FB_PAGE_ACCESS_TOKEN);
const API_VERSION = (process.env.FB_API_VERSION || "v19.0").trim();
const DRY = process.env.DRY_RUN === "1";
const VALIDATE_ONLY = process.env.VALIDATE_ONLY === "1";

const BASE = `https://graph.facebook.com/${API_VERSION}`;

function maskToken(t) {
  if (!t) return "(empty)";
  if (t.length <= 12) return "(short)";
  return `${t.slice(0, 6)}...${t.slice(-4)} len=${t.length}`;
}

async function resolveSchedulePath() {
  if (process.env.SCHEDULE_PATH) return path.resolve(process.env.SCHEDULE_PATH);
  let entries;
  try {
    entries = await fs.readdir(SCHEDULE_DIR);
  } catch {
    throw new Error(`Schedule dir ${SCHEDULE_DIR} does not exist`);
  }
  const waves = entries
    .filter((f) => /^wave-\d+-schedule\.json$/.test(f))
    .sort((a, b) => parseInt(a.match(/wave-(\d+)/)[1], 10) - parseInt(b.match(/wave-(\d+)/)[1], 10));
  if (!waves.length) throw new Error(`No wave-N-schedule.json in ${SCHEDULE_DIR}`);
  // Pick lowest-N wave with any pending slot.
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

async function fbFetch(method, urlPath) {
  const url = `${BASE}${urlPath}`;
  const res = await fetch(url, { method });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { _raw: text }; }
  if (!res.ok) {
    throw new Error(`FB ${method} ${urlPath} HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function validatePage() {
  const data = await fbFetch("GET", `/me?fields=id,name&access_token=${TOKEN}`);
  console.log(`/me: id=${data.id} name=${data.name || ""}`);
  if (PAGE_ID && data.id !== PAGE_ID) {
    console.warn(`WARNING: token /me id (${data.id}) != FB_PAGE_ID (${PAGE_ID}). Token belongs to a different Page/User.`);
  }
  return data;
}

async function publishPhoto(imageUrl, caption) {
  const params = new URLSearchParams({
    url: imageUrl,
    caption,
    published: "true",
    access_token: TOKEN,
  });
  const url = `${BASE}/${PAGE_ID}/photos?${params.toString()}`;
  const res = await fetch(url, { method: "POST" });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { _raw: text }; }
  if (!res.ok) {
    throw new Error(`FB POST /${PAGE_ID}/photos HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function fetchPermalink(postId) {
  try {
    const data = await fbFetch("GET", `/${postId}?fields=permalink_url&access_token=${TOKEN}`);
    return data.permalink_url || null;
  } catch (e) {
    console.warn(`Permalink fetch failed: ${e.message}`);
    return null;
  }
}

async function main() {
  if ((!TOKEN || !PAGE_ID) && !DRY) {
    console.error("FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN are required for live runs");
    process.exit(2);
  }
  console.log(`FB Page ID: ${PAGE_ID || "(empty)"}`);
  console.log(`FB Page token: ${maskToken(TOKEN)}`);
  console.log(`API base: ${BASE}`);

  if (VALIDATE_ONLY) {
    console.log("VALIDATE_ONLY=1 — Page identity check, no posting.");
    if (DRY) return;
    await validatePage();
    return;
  }

  const schedulePath = await resolveSchedulePath();
  console.log(`Schedule: ${path.relative(REPO_ROOT, schedulePath)}`);
  const sched = await readSchedule(schedulePath);

  const now = Date.now();
  const due = findDuePost(sched, now);
  if (!due) {
    console.log("No due post. Schedule:");
    for (const p of sched.posts) {
      const status = p.posted_at ? `posted ${p.posted_at}` : `pending (${p.slot_iso})`;
      console.log(`  - ${p.id}: ${status}`);
    }
    return;
  }

  const imageUrl = `${sched.image_base_url}/${due.image}`;
  console.log(`Slot: ${due.id} (slot_iso=${due.slot_iso})`);
  console.log(`Image URL: ${imageUrl}`);
  console.log(`Caption length: ${due.caption.length} chars`);

  if (DRY) {
    console.log("DRY_RUN=1 — skipping API calls.");
    return;
  }

  console.log(`\nPublishing photo to FB Page ${PAGE_ID}...`);
  const pubResp = await publishPhoto(imageUrl, due.caption);
  console.log(`Publish response: ${JSON.stringify(pubResp)}`);
  const postId = pubResp.post_id || pubResp.id;
  if (!postId) throw new Error(`No post_id in response: ${JSON.stringify(pubResp)}`);
  console.log(`Posted: ${postId}`);

  const permalink = await fetchPermalink(postId);
  console.log(`Permalink: ${permalink}`);

  due.posted_at = new Date().toISOString();
  due.post_id = postId;
  due.permalink = permalink;
  await writeSchedule(schedulePath, sched);
  console.log(`Updated schedule for ${due.id}.`);
}

main().catch((e) => {
  console.error(`\nFATAL: ${e.stack || e.message}`);
  process.exit(1);
});
