#!/usr/bin/env node
// Bewaakt de contentvoorraad van de IG-pijplijn.
//
// Waarom: op 21 juli 2026 raakte wave-8 stilletjes op; pas na dagen rode runs
// (issue-spam) werd duidelijk dat er geen wave-9 bestond. Deze check waarschuwt
// VOORDAT de voorraad leeg is, per kanaal (feed + reels).
//
// Output (stdout, één regel JSON) voor de workflow:
//   { "feed": {"pending": N, "lastSlot": iso|null, "runwayDays": N|null}, "reels": {...}, "low": bool }
// Exit 0 altijd — waarschuwen is de taak van de workflow, niet falen.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCHEDULE_DIR = path.join(REPO_ROOT, "marketing", "instagram");
const THRESHOLD_DAYS = Number(process.env.SUPPLY_THRESHOLD_DAYS || 10);

async function channelStats(filePattern) {
  const entries = await fs.readdir(SCHEDULE_DIR);
  const files = entries.filter((f) => filePattern.test(f));
  let pending = 0;
  let lastSlot = null;
  for (const f of files) {
    let sched;
    try {
      sched = JSON.parse(await fs.readFile(path.join(SCHEDULE_DIR, f), "utf8"));
    } catch {
      continue; // kapotte file is een ander probleem; validator vangt dat
    }
    for (const p of sched.posts || []) {
      if (p.posted_at !== null && p.posted_at !== undefined) continue;
      pending += 1;
      const t = Date.parse(p.slot_iso);
      if (!Number.isNaN(t) && (lastSlot === null || t > lastSlot)) lastSlot = t;
    }
  }
  const runwayDays = lastSlot === null ? null : Math.floor((lastSlot - Date.now()) / 86400000);
  return {
    pending,
    lastSlot: lastSlot === null ? null : new Date(lastSlot).toISOString(),
    runwayDays,
  };
}

const feed = await channelStats(/^wave-\d+(?:-week\d+)?-schedule\.json$/);
const reels = await channelStats(/^wave-\d+(?:-week\d+)?-reels-schedule\.json$/);

const lowChannel = (c) => c.pending === 0 || (c.runwayDays !== null && c.runwayDays < THRESHOLD_DAYS);
const low = lowChannel(feed) || lowChannel(reels);

console.log(JSON.stringify({ feed, reels, low, thresholdDays: THRESHOLD_DAYS }));
