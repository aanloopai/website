#!/usr/bin/env node
// IG DM auto-reply bot via Meta Graph API.
// Webhook receiver: handles message-events, comment-events, story-mentions.
// Replies with NL welcome-template + aanloopai.nl/ig CTA.
//
// Env (required):
//   IG_PAGE_ACCESS_TOKEN     — long-lived Page token with instagram_manage_messages
//   IG_USER_ID               — IG business account id (numeric)
//   IG_WEBHOOK_VERIFY_TOKEN  — random string, must match Meta-app webhook config
//   IG_APP_SECRET            — Meta App secret for X-Hub-Signature-256 verification
//
// Env (optional):
//   PORT                     — default 3030
//   TEMPLATES_PATH           — default marketing/instagram/dm-templates.json
//   REPLIED_DB               — default data/ig-dm-replied.json
//   COMMENT_KEYWORDS         — default "BILGI,INFO,AUDIT,DEMO"
//   REPLY_DELAY_MS           — default 7000 (anti-spam)
//   DRY_RUN                  — '1' = log events only, no API calls

import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");

const PORT = parseInt(process.env.PORT || "3030", 10);
const TOKEN = (process.env.IG_PAGE_ACCESS_TOKEN || "").trim();
const IG_USER_ID = (process.env.IG_USER_ID || "").trim();
const VERIFY_TOKEN = (process.env.IG_WEBHOOK_VERIFY_TOKEN || "").trim();
const APP_SECRET = (process.env.IG_APP_SECRET || "").trim();
const TEMPLATES_PATH = path.resolve(
  process.env.TEMPLATES_PATH ||
    path.join(REPO_ROOT, "marketing", "instagram", "dm-templates.json"),
);
const REPLIED_DB = path.resolve(
  process.env.REPLIED_DB || path.join(REPO_ROOT, "data", "ig-dm-replied.json"),
);
const KEYWORDS = (process.env.COMMENT_KEYWORDS || "BILGI,INFO,AUDIT,DEMO,HORECA,ZORG,PROMPT,AVG,EMMA,FOUNDER,CIJFERS,AIDUUR,MARCO,WHATSAPP,ACCOUNTANCY,PRAKTIJK,NOJAAR,BOUW,HANDOVER,LOGISTIEK,KENNISBANK,RETRO,FAALMODES")
  .split(",")
  .map((k) => k.trim().toUpperCase())
  .filter(Boolean);
const REPLY_DELAY_MS = parseInt(process.env.REPLY_DELAY_MS || "7000", 10);
const DRY = process.env.DRY_RUN === "1";
const GRAPH = "https://graph.facebook.com/v19.0";

let templates = { welcome: [], comment: [], mention: [] };
let replied = { senders: {} };

async function loadTemplates() {
  const raw = await fs.readFile(TEMPLATES_PATH, "utf8");
  templates = JSON.parse(raw);
  for (const key of ["welcome", "comment", "mention"]) {
    if (!Array.isArray(templates[key]) || templates[key].length === 0) {
      throw new Error(`Templates: '${key}' must be non-empty array`);
    }
  }
  console.log(
    `Templates loaded: welcome=${templates.welcome.length} comment=${templates.comment.length} mention=${templates.mention.length}`,
  );
}

async function loadReplied() {
  try {
    const raw = await fs.readFile(REPLIED_DB, "utf8");
    replied = JSON.parse(raw);
    if (!replied.senders) replied.senders = {};
  } catch {
    replied = { senders: {} };
    await fs.mkdir(path.dirname(REPLIED_DB), { recursive: true });
    await persistReplied();
  }
  pruneReplied();
  console.log(`Replied-DB loaded: ${Object.keys(replied.senders).length} entries`);
}

function pruneReplied() {
  const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
  for (const [id, ts] of Object.entries(replied.senders)) {
    if (ts < cutoff) delete replied.senders[id];
  }
}

async function persistReplied() {
  await fs.writeFile(REPLIED_DB, JSON.stringify(replied, null, 2) + "\n", "utf8");
}

function alreadyRepliedRecent(senderId, windowMs) {
  const ts = replied.senders[senderId];
  if (!ts) return false;
  return Date.now() - ts < windowMs;
}

function pickTemplate(kind, keyword) {
  // Wave 5+: prefer keyword-specific dm_assets[KEYWORD] when comment matched a
  // known keyword. Falls back to generic kind ('welcome'/'comment'/'mention').
  if (keyword && templates.dm_assets && Array.isArray(templates.dm_assets[keyword]) && templates.dm_assets[keyword].length > 0) {
    const arr = templates.dm_assets[keyword];
    return arr[Math.floor(Math.random() * arr.length)];
  }
  const arr = templates[kind];
  return arr[Math.floor(Math.random() * arr.length)];
}

function verifySignature(rawBody, signatureHeader) {
  if (!APP_SECRET) {
    console.warn("IG_APP_SECRET unset; signature verification skipped (NOT for prod)");
    return true;
  }
  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) return false;
  const expected = crypto
    .createHmac("sha256", APP_SECRET)
    .update(rawBody)
    .digest("hex");
  const provided = signatureHeader.slice("sha256=".length);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

async function graphPost(urlPath, body) {
  if (DRY) {
    console.log(`[DRY] POST ${urlPath} body=${JSON.stringify(body).slice(0, 200)}`);
    return { dry: true };
  }
  const res = await fetch(`${GRAPH}${urlPath}?access_token=${encodeURIComponent(TOKEN)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { _raw: text };
  }
  if (!res.ok) {
    throw new Error(`Graph POST ${urlPath} HTTP ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
  }
  return data;
}

async function sendDM(recipientIgsid, text) {
  return graphPost(`/${IG_USER_ID}/messages`, {
    recipient: { id: recipientIgsid },
    message: { text },
  });
}

async function replyComment(commentId, text) {
  return graphPost(`/${commentId}/replies`, { message: text });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function handleMessage(event) {
  const senderId = event.sender?.id;
  if (!senderId) return;
  if (senderId === IG_USER_ID) return;
  if (event.message?.is_echo) return;
  if (alreadyRepliedRecent(senderId, 7 * 24 * 3600 * 1000)) {
    console.log(`Skip ${senderId}: replied within 7d`);
    return;
  }
  const body = pickTemplate("welcome");
  await sleep(REPLY_DELAY_MS);
  await sendDM(senderId, body);
  replied.senders[senderId] = Date.now();
  await persistReplied();
  console.log(`DM sent to ${senderId} (welcome)`);
}

async function handleComment(value) {
  const commentId = value.id;
  const fromId = value.from?.id;
  const text = (value.text || "").toUpperCase();
  if (!commentId || !fromId) return;
  if (fromId === IG_USER_ID) return;
  const hit = KEYWORDS.find((k) => text.includes(k));
  if (!hit) return;
  if (alreadyRepliedRecent(`c:${commentId}`, 24 * 3600 * 1000)) return;
  const dmText = pickTemplate("comment", hit);
  await sleep(REPLY_DELAY_MS);
  try {
    await sendDM(fromId, dmText);
    await replyComment(commentId, "Stuurde je net een DM 📩");
    replied.senders[`c:${commentId}`] = Date.now();
    replied.senders[fromId] = Date.now();
    await persistReplied();
    console.log(`Comment ${commentId} keyword '${hit}' → DM + reply`);
  } catch (e) {
    console.error(`Comment-handler failed: ${e.message}`);
  }
}

async function handleMention(value) {
  const fromId = value.from?.id || value.sender_id;
  if (!fromId || fromId === IG_USER_ID) return;
  if (alreadyRepliedRecent(fromId, 7 * 24 * 3600 * 1000)) return;
  const body = pickTemplate("mention");
  await sleep(REPLY_DELAY_MS);
  try {
    await sendDM(fromId, body);
    replied.senders[fromId] = Date.now();
    await persistReplied();
    console.log(`Story-mention from ${fromId} → DM`);
  } catch (e) {
    console.error(`Mention-handler failed: ${e.message}`);
  }
}

async function processEntry(entry) {
  if (Array.isArray(entry.messaging)) {
    for (const event of entry.messaging) {
      try {
        await handleMessage(event);
      } catch (e) {
        console.error(`Message-handler error: ${e.message}`);
      }
    }
  }
  if (Array.isArray(entry.changes)) {
    for (const change of entry.changes) {
      try {
        if (change.field === "comments") await handleComment(change.value || {});
        else if (change.field === "mentions") await handleMention(change.value || {});
        else if (change.field === "story_mention") await handleMention(change.value || {});
      } catch (e) {
        console.error(`Change-handler error: ${e.message}`);
      }
    }
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url.startsWith("/webhook")) {
      const url = new URL(req.url, "http://localhost");
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("Webhook verified");
        res.writeHead(200, { "Content-Type": "text/plain" });
        res.end(challenge || "");
        return;
      }
      res.writeHead(403);
      res.end("forbidden");
      return;
    }

    if (req.method === "POST" && req.url.startsWith("/webhook")) {
      const raw = await readBody(req);
      const sig = req.headers["x-hub-signature-256"];
      if (!verifySignature(raw, sig)) {
        res.writeHead(401);
        res.end("bad signature");
        return;
      }
      res.writeHead(200);
      res.end("EVENT_RECEIVED");
      let payload;
      try {
        payload = JSON.parse(raw.toString("utf8"));
      } catch (e) {
        console.error(`Bad JSON: ${e.message}`);
        return;
      }
      if (payload.object !== "instagram") {
        console.log(`Skip non-instagram object: ${payload.object}`);
        return;
      }
      for (const entry of payload.entry || []) {
        processEntry(entry).catch((e) =>
          console.error(`processEntry error: ${e.stack || e.message}`),
        );
      }
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, replied: Object.keys(replied.senders).length }));
      return;
    }

    res.writeHead(404);
    res.end("not found");
  } catch (e) {
    console.error(`Server error: ${e.stack || e.message}`);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end("server error");
    }
  }
});

async function main() {
  if (!DRY) {
    for (const [k, v] of Object.entries({
      IG_PAGE_ACCESS_TOKEN: TOKEN,
      IG_USER_ID,
      IG_WEBHOOK_VERIFY_TOKEN: VERIFY_TOKEN,
    })) {
      if (!v) {
        console.error(`${k} is empty; set it before starting (or use DRY_RUN=1)`);
        process.exit(2);
      }
    }
  }
  await loadTemplates();
  await loadReplied();
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`IG-DM bot listening on :${PORT} (dry=${DRY}, keywords=${KEYWORDS.join(",")})`);
  });
}

main().catch((e) => {
  console.error(`FATAL: ${e.stack || e.message}`);
  process.exit(1);
});
