#!/usr/bin/env node
// LinkedIn publisher via REST /v2/ugcPosts.
// Reads marketing/linkedin/wave-N-schedule.json, finds the next due unpublished
// slot, posts via LinkedIn API as either the configured member (personal post)
// or the configured organization (company page; requires Marketing Developer
// Platform approval + w_organization_social scope). Writes post_urn + posted_at
// back to the schedule.
//
// Env:
//   LINKEDIN_ACCESS_TOKEN   — Bearer token (required for live runs)
//   LINKEDIN_MEMBER_ID      — member sub (e.g. "zJG7ukELVK") for person posts
//   LINKEDIN_ORG_ID         — organization id (e.g. "104123456") for org posts
//   AUTHOR_TYPE             — "person" (default) or "organization"
//   SCHEDULE_PATH           — default: auto-discover wave-N-schedule.json
//   DRY_RUN                 — '1' = print plan only, no API calls
//   VALIDATE_ONLY           — '1' = token + identity check via /v2/userinfo

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
const SCHEDULE_DIR = path.join(REPO_ROOT, "marketing", "linkedin");

function cleanEnv(v) {
  return (v || "").replace(/\s+/g, "");
}
const TOKEN = cleanEnv(process.env.LINKEDIN_ACCESS_TOKEN);
const MEMBER_ID = cleanEnv(process.env.LINKEDIN_MEMBER_ID);
const ORG_ID = cleanEnv(process.env.LINKEDIN_ORG_ID);
const AUTHOR_TYPE = (process.env.AUTHOR_TYPE || "person").trim();
const DRY = process.env.DRY_RUN === "1";
const VALIDATE_ONLY = process.env.VALIDATE_ONLY === "1";

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

function authorUrn() {
  if (AUTHOR_TYPE === "organization") {
    if (!ORG_ID) throw new Error("AUTHOR_TYPE=organization but LINKEDIN_ORG_ID is empty");
    return `urn:li:organization:${ORG_ID}`;
  }
  if (!MEMBER_ID) throw new Error("LINKEDIN_MEMBER_ID is empty");
  return `urn:li:person:${MEMBER_ID}`;
}

async function liFetch(method, urlPath, body, extraHeaders = {}) {
  const url = `https://api.linkedin.com${urlPath}`;
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    "X-Restli-Protocol-Version": "2.0.0",
    Accept: "application/json",
    ...extraHeaders,
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { _raw: text }; }
  if (!res.ok) {
    throw new Error(`LinkedIn ${method} ${urlPath} HTTP ${res.status}: ${JSON.stringify(data)}`);
  }
  return { data, res };
}

async function validateToken() {
  const { data } = await liFetch("GET", "/v2/userinfo");
  console.log(`/v2/userinfo: sub=${data.sub} name=${data.name || ""} email=${data.email || ""}`);
  return data;
}

async function createTextPost(author, text) {
  const body = {
    author,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "NONE",
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };
  const { data, res } = await liFetch("POST", "/v2/ugcPosts", body);
  return res.headers.get("x-restli-id") || data.id;
}

async function registerImageUpload(author) {
  const body = {
    registerUploadRequest: {
      owner: author,
      recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
      serviceRelationships: [
        { relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" },
      ],
    },
  };
  const { data } = await liFetch("POST", "/v2/assets?action=registerUpload", body);
  const value = data.value || {};
  const uploadUrl = value.uploadMechanism?.["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]?.uploadUrl;
  const assetUrn = value.asset;
  if (!uploadUrl || !assetUrn) throw new Error(`Asset register response missing fields: ${JSON.stringify(data).slice(0, 400)}`);
  return { uploadUrl, assetUrn };
}

async function uploadImageBytes(uploadUrl, imageUrl) {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Image fetch ${imageUrl} HTTP ${imgRes.status}`);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const putRes = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: buf,
  });
  if (!putRes.ok) throw new Error(`Upload POST HTTP ${putRes.status}: ${await putRes.text().catch(() => "")}`);
}

async function createImagePost(author, text, assetUrn) {
  const body = {
    author,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: "IMAGE",
        media: [
          {
            status: "READY",
            description: { text: text.slice(0, 200) },
            media: assetUrn,
            title: { text: "Aanloop AI" },
          },
        ],
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };
  const { data, res } = await liFetch("POST", "/v2/ugcPosts", body);
  return res.headers.get("x-restli-id") || data.id;
}

async function main() {
  if (!TOKEN && !DRY) {
    console.error("LINKEDIN_ACCESS_TOKEN missing");
    process.exit(2);
  }
  console.log(`LinkedIn token: ${maskToken(TOKEN)}`);
  const author = authorUrn();
  console.log(`Author URN: ${author}`);

  if (VALIDATE_ONLY) {
    console.log("VALIDATE_ONLY=1 — userinfo check, no posting.");
    if (DRY) return;
    await validateToken();
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

  console.log(`Slot: ${due.id} (slot_iso=${due.slot_iso})`);
  console.log(`Caption length: ${due.caption.length} chars`);
  const imageUrl = due.image ? `${sched.image_base_url}/${due.image}` : null;
  if (imageUrl) console.log(`Image URL: ${imageUrl}`);

  if (DRY) {
    console.log("DRY_RUN=1 — skipping API calls.");
    return;
  }

  let postUrn;
  if (imageUrl) {
    console.log("Registering image upload...");
    const { uploadUrl, assetUrn } = await registerImageUpload(author);
    console.log(`Asset: ${assetUrn}`);
    console.log("Uploading bytes...");
    await uploadImageBytes(uploadUrl, imageUrl);
    console.log("Creating image post...");
    postUrn = await createImagePost(author, due.caption, assetUrn);
  } else {
    console.log("Creating text post...");
    postUrn = await createTextPost(author, due.caption);
  }
  if (!postUrn) throw new Error("No post URN returned");
  console.log(`Posted: ${postUrn}`);

  due.posted_at = new Date().toISOString();
  due.post_urn = postUrn;
  await writeSchedule(schedulePath, sched);
  console.log(`Updated schedule for ${due.id}.`);
}

main().catch((e) => {
  console.error(`\nFATAL: ${e.stack || e.message}`);
  process.exit(1);
});
