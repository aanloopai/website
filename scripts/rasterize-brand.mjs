#!/usr/bin/env node
// Brand SVG → PNG rasterizer for LinkedIn (and any other binary-PNG channels).
// Reads public/brand/*.svg, writes public/brand/png/*.png at LinkedIn target
// dimensions, compositing horizontal-mark variants on the Aanloop dark brand
// background (#0B1120) with horizontal padding.
//
// Outputs:
//   logo-mark-300.png           300x300   transparent  — LinkedIn profile/page logo
//   logo-mark-1080.png         1080x1080  transparent  — high-res fallback
//   logo-horizontal-1128x191.png  1128x191  dark bg     — LinkedIn personal banner
//   logo-horizontal-1584x396.png  1584x396  dark bg     — LinkedIn company banner

import { Resvg } from "@resvg/resvg-js";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
const SRC = path.join(REPO_ROOT, "public", "brand");
const OUT = path.join(REPO_ROOT, "public", "brand", "png");

const BG_DARK = "#0B1120";

async function renderSvgToPng(svgPath, fitTo) {
  const svg = await fs.readFile(svgPath, "utf8");
  const resvg = new Resvg(svg, {
    background: "rgba(0,0,0,0)",
    fitTo,
    font: { loadSystemFonts: true, defaultFontFamily: "Arial" },
  });
  return resvg.render().asPng();
}

async function logoMarkSquare(size) {
  const src = path.join(SRC, "logo-mark-dark.svg");
  return renderSvgToPng(src, { mode: "width", value: size });
}

async function horizontalBanner(width, height) {
  const src = path.join(SRC, "logo-horizontal-dark.svg");
  // Scale mark by height — banner aspect is wider than SVG aspect, so
  // height is the binding constraint. Target ~70% of banner height.
  const markHeight = Math.round(height * 0.7);
  const markBuf = await renderSvgToPng(src, { mode: "height", value: markHeight });
  const markMeta = await sharp(markBuf).metadata();

  const bg = sharp({
    create: { width, height, channels: 4, background: BG_DARK },
  });

  const left = Math.round((width - markMeta.width) / 2);
  const top = Math.round((height - markMeta.height) / 2);
  return bg.composite([{ input: markBuf, left, top }]).png().toBuffer();
}

async function writePng(name, buf) {
  const outPath = path.join(OUT, name);
  await fs.writeFile(outPath, buf);
  const meta = await sharp(buf).metadata();
  console.log(`  ${name}  ${meta.width}x${meta.height}  ${(buf.length / 1024).toFixed(1)} KB`);
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  console.log(`Writing PNGs to ${path.relative(REPO_ROOT, OUT)}/`);

  await writePng("logo-mark-300.png", await logoMarkSquare(300));
  await writePng("logo-mark-1080.png", await logoMarkSquare(1080));
  await writePng("logo-horizontal-1128x191.png", await horizontalBanner(1128, 191));
  await writePng("logo-horizontal-1584x396.png", await horizontalBanner(1584, 396));

  console.log("Done.");
}

main().catch((e) => {
  console.error(`FATAL: ${e.stack || e.message}`);
  process.exit(1);
});
