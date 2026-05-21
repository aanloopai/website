"""Render aanloop social mockups — realistic chat-UI screens that show the
product in action (Emma answering a customer, Marco summarising a call).

Far more scroll-stopping than text-on-colour cards: the viewer sees an actual
conversation, the speed of the reply, and the brand — all at a glance.

Reads marketing/instagram/mockups/scenarios.json. For each scenario renders:
  - 1080x1080 feed post  -> public/social-feed/<id>.png
  - 1080x1920 story/reel -> public/social-feed/<id>-story.png  (--story / --all)

Usage:
    python scripts/render-social-mockup.py --id emma-webshop-retour
    python scripts/render-social-mockup.py --all
    python scripts/render-social-mockup.py --all --story
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parent.parent
SCENARIOS = REPO / "marketing" / "instagram" / "mockups" / "scenarios.json"
OUT_DIR = REPO / "public" / "social-feed"
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Brand palette
NAVY = "#0F172A"
PEARL = "#F1F5F9"
PEARL_DIM = "#94A3B8"
INDIGO = "#4338CA"
ROSE = "#E11D48"
AMBER = "#D97706"
EMERALD = "#047857"
EMERALD_LIVE = "#22C55E"
CHAT_BG = "#EAE6DF"          # warm off-white chat canvas
BUBBLE_IN = "#FFFFFF"        # customer bubble
BUBBLE_INK = "#1E293B"       # customer text
BUBBLE_OUT = INDIGO          # agent bubble
ACCENTS = (INDIGO, ROSE, AMBER, EMERALD)

# Fonts — env override for CI (Liberation on ubuntu), Windows Segoe fallback.
FONT_BLACK = os.environ.get("MOCKUP_FONT_BLACK", r"C:\Windows\Fonts\seguibl.ttf")
FONT_BOLD = os.environ.get("MOCKUP_FONT_BOLD", r"C:\Windows\Fonts\segoeuib.ttf")
FONT_REG = os.environ.get("MOCKUP_FONT_REG", r"C:\Windows\Fonts\segoeui.ttf")

SIZE_W = 1080
SIZE_H = 1350
FOOTER_H = 300


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def wrap(d: ImageDraw.ImageDraw, text: str, f: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    """Greedy word-wrap to a pixel width."""
    lines: list[str] = []
    for paragraph in text.split("\n"):
        words = paragraph.split(" ")
        cur = ""
        for w in words:
            trial = f"{cur} {w}".strip()
            if d.textlength(trial, font=f) <= max_w or not cur:
                cur = trial
            else:
                lines.append(cur)
                cur = w
        lines.append(cur)
    return lines


def avatar(d: ImageDraw.ImageDraw, cx: int, cy: int, r: int, initial: str, bg: str) -> None:
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=bg)
    f = font(FONT_BLACK, int(r * 1.1))
    tw = d.textlength(initial, font=f)
    asc, desc = f.getmetrics()
    d.text((cx - tw / 2, cy - (asc + desc) / 2 + 2), initial, font=f, fill=PEARL)


def bubble(
    d: ImageDraw.ImageDraw,
    text: str,
    top: int,
    side: str,
    width: int,
    f: ImageFont.FreeTypeFont,
    meta: str = "",
) -> int:
    """Draw a chat bubble; returns the y just below it."""
    pad_x, pad_y = 36, 26
    line_h = f.getmetrics()[0] + f.getmetrics()[1] + 10
    inner_w = width - 2 * pad_x
    lines = wrap(d, text, f, inner_w)
    text_w = max((d.textlength(ln, font=f) for ln in lines), default=0)
    box_w = int(text_w) + 2 * pad_x
    box_h = line_h * len(lines) + 2 * pad_y + (16 if meta else 0)
    margin = 70
    if side == "out":
        x1 = SIZE_W - margin
        x0 = x1 - box_w
        fill, ink, r = BUBBLE_OUT, PEARL, 34
        corners = (True, True, False, True)
    else:
        x0 = margin
        x1 = x0 + box_w
        fill, ink, r = BUBBLE_IN, BUBBLE_INK, 34
        corners = (True, True, True, False)
    d.rounded_rectangle([x0, top, x1, top + box_h], radius=r, fill=fill, corners=corners)
    ty = top + pad_y
    for ln in lines:
        d.text((x0 + pad_x, ty), ln, font=f, fill=ink)
        ty += line_h
    if meta:
        fm = font(FONT_REG, 28)
        mw = d.textlength(meta, font=fm)
        mcol = "#C7D2FE" if side == "out" else PEARL_DIM
        d.text((x1 - pad_x - mw, top + box_h - pad_y - 8), meta, font=fm, fill=mcol)
    return top + box_h


def header(d: ImageDraw.ImageDraw, agent: str, role: str) -> int:
    """Indigo app-style header bar. Returns y below it."""
    h = 200
    d.rectangle([0, 0, SIZE_W, h], fill=INDIGO)
    for i, c in enumerate(ACCENTS):  # brand 4-strip, top edge
        d.rectangle([SIZE_W // 4 * i, 0, SIZE_W // 4 * (i + 1), 8], fill=c)
    avatar(d, 128, h // 2 + 6, 60, agent[0].upper(), NAVY)
    d.text((220, 54), agent, font=font(FONT_BLACK, 56), fill=PEARL)
    dot_y = 146
    d.ellipse([222, dot_y - 9, 240, dot_y + 9], fill=EMERALD_LIVE)
    d.text((256, dot_y - 23), role, font=font(FONT_REG, 33), fill="#C7D2FE")
    return h


def footer(d: ImageDraw.ImageDraw, headline: str, stat: str) -> None:
    """Navy CTA band at the bottom: stat pill + headline + wordmark."""
    top = SIZE_H - FOOTER_H
    d.rectangle([0, top, SIZE_W, SIZE_H], fill=NAVY)
    fp = font(FONT_BLACK, 36)
    pw = d.textlength(stat, font=fp) + 56
    px0 = (SIZE_W - pw) / 2
    pill_y = top + 34
    d.rounded_rectangle([px0, pill_y, px0 + pw, pill_y + 62], radius=31, fill=EMERALD)
    d.text((px0 + 28, pill_y + 11), stat, font=fp, fill=PEARL)
    fh = font(FONT_BOLD, 41)
    for i, ln in enumerate(headline.split("\n")):
        lw = d.textlength(ln, font=fh)
        d.text(((SIZE_W - lw) / 2, pill_y + 96 + i * 52), ln, font=fh, fill=PEARL)
    fw = font(FONT_REG, 30)
    wm = "aanloopai.nl"
    ww = d.textlength(wm, font=fw)
    d.text(((SIZE_W - ww) / 2, SIZE_H - 52), wm, font=fw, fill=PEARL_DIM)


def render(scenario: dict, story: bool) -> Path:
    global SIZE_W, SIZE_H
    SIZE_W = 1080
    SIZE_H = 1920 if story else 1350
    img = Image.new("RGB", (SIZE_W, SIZE_H), CHAT_BG)
    d = ImageDraw.Draw(img)

    y = header(d, scenario["agent"], scenario["role"])
    y += 56

    f_msg = font(FONT_REG, 41)
    chat_w = 770
    for turn in scenario["turns"]:
        side = "out" if turn["from"] == "agent" else "in"
        y = bubble(d, turn["text"], y, side, chat_w, f_msg, turn.get("meta", ""))
        y += 32

    footer(d, scenario["headline"], scenario["stat"])

    suffix = "-story" if story else ""
    out = OUT_DIR / f"{scenario['id']}{suffix}.png"
    img.save(out, "PNG", optimize=True)
    print(f"  rendered: {out.name} ({SIZE_W}x{SIZE_H})", file=sys.stderr)
    return out


def load() -> dict:
    with SCENARIOS.open("r", encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--id", help="Render a single scenario by id")
    ap.add_argument("--all", action="store_true", help="Render every scenario")
    ap.add_argument("--story", action="store_true", help="Also render 9:16 story variant")
    args = ap.parse_args()

    data = load()
    scenarios = data["scenarios"]
    if args.id:
        scenarios = [s for s in scenarios if s["id"] == args.id]
        if not scenarios:
            print(f"scenario {args.id} not found", file=sys.stderr)
            return 2
    elif not args.all:
        print("specify --id <id> or --all", file=sys.stderr)
        return 2

    for s in scenarios:
        print(f"render {s['id']}", file=sys.stderr)
        render(s, story=False)
        if args.story:
            render(s, story=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
