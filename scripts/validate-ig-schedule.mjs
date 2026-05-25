#!/usr/bin/env node
// IG schedule validator. Lints marketing/instagram/wave-*-schedule.json files.
// Exit 0 valid, exit 1 invalid (with error list).
//
// Checks per post:
//   - id non-empty
//   - slot_iso parses + has TZ offset
//   - image file exists at public/social-feed/{image}
//   - caption length 1..2200 chars (IG limit)
//   - hashtag count <= 30 (IG limit, soft warn at 20)
//   - posted_at is null OR (ISO-8601 AND media_id AND permalink all set)
//
// Usage:
//   node scripts/validate-ig-schedule.mjs                 # validates wave-2 by default
//   node scripts/validate-ig-schedule.mjs path/to/file.json  # validates given file

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
const SCHEDULE_DIR = path.join(REPO_ROOT, "marketing", "instagram");
const IMAGE_DIR = path.join(REPO_ROOT, "public", "social-feed");

function findSchedules() {
  if (process.argv[2]) return [path.resolve(process.argv[2])];
  return fs
    .readdirSync(SCHEDULE_DIR)
    .filter((f) => /^wave-\d+-schedule\.json$/.test(f))
    .sort()
    .map((f) => path.join(SCHEDULE_DIR, f));
}

const errors = [];
const warnings = [];

function err(slotId, msg) {
  errors.push(`[${slotId}] ${msg}`);
}
function warn(slotId, msg) {
  warnings.push(`[${slotId}] ${msg}`);
}

function validatePost(post, idx) {
  const id = post.id || `posts[${idx}]`;
  if (!post.id) err(id, "missing id");

  if (!post.slot_iso) {
    err(id, "missing slot_iso");
  } else {
    const d = new Date(post.slot_iso);
    if (isNaN(d.getTime())) err(id, `slot_iso unparseable: ${post.slot_iso}`);
    if (!/[+-]\d{2}:?\d{2}|Z$/.test(post.slot_iso)) {
      err(id, `slot_iso missing TZ offset: ${post.slot_iso}`);
    }
  }

  const isCarousel = post.format === "carousel";
  if (isCarousel) {
    if (!Array.isArray(post.slides) || post.slides.length < 2 || post.slides.length > 10) {
      err(id, `carousel requires slides[] of length 2-10, got ${post.slides?.length || 0}`);
    } else {
      for (const slide of post.slides) {
        const slidePath = path.join(IMAGE_DIR, slide);
        if (!fs.existsSync(slidePath)) err(id, `slide file missing: public/social-feed/${slide}`);
      }
    }
  } else if (!post.image) {
    err(id, "missing image");
  } else {
    const imagePath = path.join(IMAGE_DIR, post.image);
    if (!fs.existsSync(imagePath)) err(id, `image file missing: public/social-feed/${post.image}`);
  }

  if (typeof post.caption !== "string") {
    err(id, "caption missing or not a string");
  } else {
    const len = post.caption.length;
    if (len === 0) err(id, "caption empty");
    if (len > 2200) err(id, `caption length ${len} exceeds IG limit 2200`);
    if (len > 1800) warn(id, `caption length ${len} > 1800 chars (approaching IG limit)`);
    const hashtags = (post.caption.match(/#[\w]+/g) || []).length;
    if (hashtags > 30) err(id, `hashtags ${hashtags} exceeds IG limit 30`);
    if (hashtags > 20) warn(id, `hashtags ${hashtags} > 20 (IG may rate-limit)`);
    if (hashtags === 0) warn(id, "no hashtags in caption");
  }

  const stateFields = [post.posted_at, post.media_id, post.permalink];
  const stateNullCount = stateFields.filter((f) => f === null || f === undefined).length;
  if (stateNullCount !== 0 && stateNullCount !== 3) {
    err(
      id,
      `inconsistent state: posted_at=${post.posted_at} media_id=${post.media_id} permalink=${post.permalink} (all-three null OR all-three set)`,
    );
  }
}

function validateOne(schedulePath) {
  console.log(`Validating: ${path.relative(REPO_ROOT, schedulePath)}`);
  let sched;
  try {
    sched = JSON.parse(fs.readFileSync(schedulePath, "utf8"));
  } catch (e) {
    errors.push(`[${path.basename(schedulePath)}] JSON parse failed: ${e.message}`);
    return 0;
  }
  if (!sched.ig_user_id) errors.push(`[${path.basename(schedulePath)}] missing ig_user_id`);
  if (!sched.image_base_url) errors.push(`[${path.basename(schedulePath)}] missing image_base_url`);
  if (!Array.isArray(sched.posts)) {
    errors.push(`[${path.basename(schedulePath)}] posts is not an array`);
    return 0;
  }
  sched.posts.forEach(validatePost);
  const ids = new Set();
  for (const p of sched.posts) {
    if (p.id && ids.has(p.id)) errors.push(`[${p.id}] duplicate id`);
    if (p.id) ids.add(p.id);
  }
  return sched.posts.length;
}

function main() {
  const schedules = findSchedules();
  if (!schedules.length) {
    console.error("No schedule files found.");
    process.exit(2);
  }
  let totalSlots = 0;
  for (const s of schedules) {
    if (!fs.existsSync(s)) {
      console.error(`Schedule not found: ${s}`);
      process.exit(2);
    }
    totalSlots += validateOne(s);
  }

  if (warnings.length > 0) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  WARN: ${w}`);
  }
  if (errors.length > 0) {
    console.error(`\n${errors.length} error(s):`);
    for (const e of errors) console.error(`  ERROR: ${e}`);
    process.exit(1);
  }
  console.log(`\nOK: ${totalSlots} slots validated across ${schedules.length} schedule file(s).`);
}

main();
