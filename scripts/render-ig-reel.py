"""Render aanloop Instagram Reels (1080x1920, 9:16, 8-15s) via moviepy.

Reads marketing/instagram/reels/templates/<template>.json + per-slot inputs from
marketing/instagram/wave-N-reels-schedule.json, composes brand-styled video,
writes MP4 to public/social-feed/reels/<slot-id>.mp4.

Music: bot does NOT bake audio; add Meta-native audio via IG app after upload
(higher reach + no copyright risk). Reels can be silent on upload.

Usage:
    python scripts/render-ig-reel.py --slot reel-001
    python scripts/render-ig-reel.py --slot reel-001 --schedule marketing/instagram/wave-3-reels-schedule.json
    python scripts/render-ig-reel.py --all   # renders every pending slot
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import numpy as np

from moviepy import (
    ColorClip,
    CompositeVideoClip,
    ImageClip,
    TextClip,
    vfx,
)
from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parent.parent
TEMPLATES_DIR = REPO / "marketing" / "instagram" / "reels" / "templates"
ASSETS_DIR = REPO / "marketing" / "instagram" / "reels" / "assets"
OUT_DIR = REPO / "public" / "social-feed" / "reels"
OUT_DIR.mkdir(parents=True, exist_ok=True)
ASSETS_DIR.mkdir(parents=True, exist_ok=True)

W, H = 1080, 1920
FPS = 30

NAVY = "#0F172A"
PEARL = "#F1F5F9"
PEARL_DIM = "#94A3B8"
INDIGO = "#4338CA"
ROSE = "#E11D48"
AMBER = "#D97706"
EMERALD = "#047857"

import os

FONT_BLACK = os.environ.get("REEL_FONT_BLACK", r"C:\Windows\Fonts\seguibl.ttf")
FONT_BOLD = os.environ.get("REEL_FONT_BOLD", r"C:\Windows\Fonts\segoeuib.ttf")
FONT_REG = os.environ.get("REEL_FONT_REG", r"C:\Windows\Fonts\segoeui.ttf")


def hex_to_rgb(c: str) -> tuple[int, int, int]:
    c = c.lstrip("#")
    return tuple(int(c[i : i + 2], 16) for i in (0, 2, 4))


def make_gradient_bg(top: str, bottom: str, path: Path) -> Path:
    if path.exists():
        return path
    img = Image.new("RGB", (W, H))
    t = hex_to_rgb(top)
    b = hex_to_rgb(bottom)
    px = img.load()
    for y in range(H):
        r = t[0] + (b[0] - t[0]) * y // H
        g = t[1] + (b[1] - t[1]) * y // H
        bl = t[2] + (b[2] - t[2]) * y // H
        for x in range(W):
            px[x, y] = (r, g, bl)
    img.save(path)
    return path


def bg_clip(top: str, bottom: str, duration: float) -> ImageClip:
    key = f"grad_{top.lstrip('#')}_{bottom.lstrip('#')}.png"
    p = make_gradient_bg(top, bottom, ASSETS_DIR / key)
    return ImageClip(str(p)).with_duration(duration)


def _text_png(txt: str, font_path: str, size: int, color: str, max_w: int) -> Image.Image:
    """Render centered, word-wrapped text to an RGBA image with enough padding
    that heavy-font ascenders/descenders are never clipped (moviepy's TextClip
    caption/label modes clip them)."""
    f = ImageFont.truetype(font_path, size)
    probe = ImageDraw.Draw(Image.new("RGBA", (4, 4)))
    lines: list[str] = []
    for para in txt.split("\n"):
        cur = ""
        for word in para.split(" "):
            trial = f"{cur} {word}".strip()
            if probe.textlength(trial, font=f) <= max_w or not cur:
                cur = trial
            else:
                lines.append(cur)
                cur = word
        lines.append(cur)
    asc, desc = f.getmetrics()
    line_h = asc + desc
    pad = max(10, size // 4)
    w = max((probe.textlength(ln, font=f) for ln in lines), default=1.0)
    img = Image.new("RGBA", (int(w) + 2 * pad, line_h * len(lines) + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    y = pad
    for ln in lines:
        lw = d.textlength(ln, font=f)
        d.text(((img.width - lw) / 2, y), ln, font=f, fill=color)
        y += line_h
    return img


def text(
    txt: str,
    font: str,
    size: int,
    color: str,
    duration: float,
    pos: tuple,
    start: float = 0.0,
    max_width: int = W - 160,
) -> ImageClip:
    """Text layer rendered via PIL (moviepy's TextClip clips glyphs with the
    brand's heavy fonts). Same signature/return contract as before."""
    img = _text_png(txt, font, size, color, max_width)
    return (
        ImageClip(np.array(img), transparent=True)
        .with_duration(duration)
        .with_position(pos)
        .with_start(start)
    )


def brand_strip(duration: float, y: int = 70) -> list:
    strip_w = 320
    strip_h = 8
    parts = []
    for i, col in enumerate((INDIGO, ROSE, AMBER, EMERALD)):
        c = (
            ColorClip(size=(strip_w // 4, strip_h), color=hex_to_rgb(col))
            .with_duration(duration)
            .with_position(((W - strip_w) // 2 + (strip_w // 4) * i, y))
        )
        parts.append(c)
    return parts


def wordmark(duration: float, y: int = H - 120) -> TextClip:
    return text("aanloop ai", FONT_REG, 38, PEARL_DIM, duration, ("center", y))


def render_hook_card(spec: dict, out_path: Path) -> None:
    hook = spec["hook"]
    bullets = spec["bullets"][:3]
    cta = spec.get("cta", "aanloopai.nl/ig")
    duration = 12.0

    layers = [bg_clip(NAVY, "#1E1B4B", duration)]
    layers.extend(brand_strip(duration))

    layers.append(text(hook, FONT_BLACK, 110, PEARL, 3.0, ("center", 380), 0.0))

    bullet_start = 3.0
    bullet_step = 2.5
    for i, b in enumerate(bullets):
        y = 700 + i * 220
        layers.append(
            text(b, FONT_BOLD, 72, PEARL, duration - bullet_start - i * bullet_step, ("center", y), bullet_start + i * bullet_step)
        )

    layers.append(text(cta, FONT_BOLD, 64, AMBER, 2.5, ("center", 1620), duration - 2.5))
    layers.append(wordmark(duration))

    out = CompositeVideoClip(layers, size=(W, H))
    out.write_videofile(str(out_path), fps=FPS, codec="libx264", audio=False, preset="medium", threads=4, logger=None)


def render_talking_stat(spec: dict, out_path: Path) -> None:
    stat = spec["stat"]
    label = spec["label"]
    source = spec.get("source", "Bron: CBS 2025")
    cta = spec.get("cta", "Meer op aanloopai.nl/ig")
    duration = 10.0

    layers = [bg_clip("#1E1B4B", NAVY, duration)]
    layers.extend(brand_strip(duration))
    layers.append(text(stat, FONT_BLACK, 260, AMBER, duration, ("center", 600), 0.0))
    layers.append(text(label, FONT_BOLD, 64, PEARL, duration - 1.0, ("center", 1020), 1.0))
    layers.append(text(source, FONT_REG, 34, PEARL_DIM, duration - 2.0, ("center", 1480), 2.0))
    layers.append(text(cta, FONT_BOLD, 56, EMERALD, duration - 3.0, ("center", 1620), 3.0))
    layers.append(wordmark(duration))

    out = CompositeVideoClip(layers, size=(W, H))
    out.write_videofile(str(out_path), fps=FPS, codec="libx264", audio=False, preset="medium", threads=4, logger=None)


def render_quote_reveal(spec: dict, out_path: Path) -> None:
    quote = spec["quote"]
    author = spec.get("author", "Anonieme MKB-eigenaar")
    role = spec.get("role", "")
    cta = spec.get("cta", "Lees cases op aanloopai.nl/ig")
    duration = 12.0

    layers = [bg_clip(NAVY, "#0B1224", duration)]
    layers.extend(brand_strip(duration))
    layers.append(text(f'"{quote}"', FONT_BOLD, 78, PEARL, duration, ("center", 500), 0.5))
    layers.append(text(f"— {author}", FONT_BOLD, 50, AMBER, duration - 3.0, ("center", 1350), 3.0))
    if role:
        layers.append(text(role, FONT_REG, 38, PEARL_DIM, duration - 3.5, ("center", 1430), 3.5))
    layers.append(text(cta, FONT_BOLD, 54, EMERALD, duration - 4.0, ("center", 1620), 4.0))
    layers.append(wordmark(duration))

    out = CompositeVideoClip(layers, size=(W, H))
    out.write_videofile(str(out_path), fps=FPS, codec="libx264", audio=False, preset="medium", threads=4, logger=None)


def render_before_after(spec: dict, out_path: Path) -> None:
    title = spec["title"]
    before = spec["before"]
    after = spec["after"]
    cta = spec.get("cta", "aanloopai.nl/ig")
    duration = 10.0

    half_h = H // 2
    before_bg = ColorClip(size=(W, half_h), color=hex_to_rgb(ROSE)).with_duration(duration).with_position((0, 0))
    after_bg = ColorClip(size=(W, half_h), color=hex_to_rgb(EMERALD)).with_duration(duration).with_position((0, half_h))

    layers = [before_bg, after_bg]
    layers.extend(brand_strip(duration))
    layers.append(text(title, FONT_BLACK, 90, PEARL, duration, ("center", 280), 0.0))
    layers.append(text("VOOR", FONT_BOLD, 56, PEARL, duration, ("center", 420), 0.0))
    layers.append(text(before, FONT_BOLD, 66, PEARL, duration, ("center", 540), 0.5))
    layers.append(text("NA", FONT_BOLD, 56, PEARL, duration, ("center", 1080), 1.5))
    layers.append(text(after, FONT_BOLD, 66, PEARL, duration, ("center", 1200), 2.0))
    layers.append(text(cta, FONT_BOLD, 56, NAVY, duration - 3.0, ("center", 1700), 3.0))

    out = CompositeVideoClip(layers, size=(W, H))
    out.write_videofile(str(out_path), fps=FPS, codec="libx264", audio=False, preset="medium", threads=4, logger=None)


def render_ken_burns(spec: dict, out_path: Path) -> None:
    """Ken-Burns effect: slow zoom-in on AI-generated background image.

    Zoom goes from 100% → 115% over the clip duration, creating a subtle
    parallax / documentary feel. Works with both 1:1 (post) and 9:16 (reel)
    source images — the renderer always outputs W×H (1080×1920).
    """
    image_path = REPO / spec["image"]
    if not image_path.exists():
        raise FileNotFoundError(f"Ken-burns image not found: {image_path}")
    headline = spec["headline"]
    sub = spec.get("sub", "")
    cta = spec.get("cta", "aanloopai.nl/ig")
    duration = 10.0
    zoom_start = 1.0   # initial scale factor (relative to canvas)
    zoom_end   = 1.15  # final scale factor — 15% zoom-in over duration

    # --- oversized base so we have room to zoom without black bars ---
    raw = ImageClip(str(image_path))
    # Scale so that at max zoom (zoom_end) the image still fills the canvas
    scale = max(W / raw.w, H / raw.h) * zoom_end * 1.02
    raw = raw.resized(width=int(raw.w * scale), height=int(raw.h * scale))

    bw, bh = raw.w, raw.h

    def zoom_frame(t: float):
        """Return frame at time t with linear zoom applied."""
        progress = t / duration
        factor = zoom_start + (zoom_end - zoom_start) * progress
        # current visible size at this zoom level
        vis_w = int(W / factor * factor)   # == W (no scaling needed for crop)
        vis_h = int(H / factor * factor)   # == H
        # scale the raw frame
        scaled_w = int(bw * factor)
        scaled_h = int(bh * factor)
        # crop center
        x0 = (scaled_w - W) // 2
        y0 = (scaled_h - H) // 2
        frame = raw.get_frame(0)  # static image
        import cv2
        resized = cv2.resize(frame, (scaled_w, scaled_h), interpolation=cv2.INTER_LANCZOS4)
        return resized[y0:y0 + H, x0:x0 + W]

    from moviepy import VideoClip
    kb_clip = VideoClip(zoom_frame, duration=duration)

    overlay_bg = ColorClip(size=(W, H), color=(0, 0, 0)).with_opacity(0.45).with_duration(duration)

    layers = [kb_clip, overlay_bg]
    layers.extend(brand_strip(duration))
    layers.append(text(headline, FONT_BLACK, 84, PEARL, duration, ("center", 600), 0.5, max_width=1000))
    if sub:
        layers.append(text(sub, FONT_BOLD, 48, PEARL_DIM, duration - 1.0, ("center", 1180), 1.0, max_width=1000))
    layers.append(text(cta, FONT_BOLD, 58, AMBER, duration - 2.5, ("center", 1680), 2.5))
    layers.append(wordmark(duration))

    out = CompositeVideoClip(layers, size=(W, H))
    out.write_videofile(str(out_path), fps=FPS, codec="libx264", audio=False, preset="medium", threads=4, logger=None)


# --- chat-reveal: animated chat-UI mockup (product-in-action) -----------------

import numpy as np

CHAT_BG = "#EAE6DF"
EMERALD_LIVE = "#22C55E"


def _wrap_pil(d: "ImageDraw.ImageDraw", text: str, f: "ImageFont.FreeTypeFont", max_w: int) -> list[str]:
    lines: list[str] = []
    for para in text.split("\n"):
        cur = ""
        for word in para.split(" "):
            trial = f"{cur} {word}".strip()
            if d.textlength(trial, font=f) <= max_w or not cur:
                cur = trial
            else:
                lines.append(cur)
                cur = word
        lines.append(cur)
    return lines


def _bubble_png(text: str, meta: str, side: str) -> Image.Image:
    """Render a single chat bubble as an RGBA image."""
    pad_x, pad_y, radius = 34, 26, 32
    f = ImageFont.truetype(FONT_REG, 46)
    fm = ImageFont.truetype(FONT_REG, 30)
    probe = ImageDraw.Draw(Image.new("RGBA", (4, 4)))
    lines = _wrap_pil(probe, text, f, 600)
    line_h = f.getmetrics()[0] + f.getmetrics()[1] + 10
    text_w = max(probe.textlength(ln, font=f) for ln in lines)
    bw = int(text_w) + 2 * pad_x
    if meta:  # widen so the right-aligned timestamp never clips
        bw = max(bw, int(probe.textlength(meta, font=fm)) + 2 * pad_x)
    bh = line_h * len(lines) + 2 * pad_y + (16 if meta else 0)
    img = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if side == "out":
        fill, ink, corners = hex_to_rgb(INDIGO), hex_to_rgb(PEARL), (True, True, False, True)
    else:
        fill, ink, corners = (255, 255, 255), hex_to_rgb("#1E293B"), (True, True, True, False)
    d.rounded_rectangle([0, 0, bw, bh], radius=radius, fill=fill, corners=corners)
    y = pad_y
    for ln in lines:
        d.text((pad_x, y), ln, font=f, fill=ink)
        y += line_h
    if meta:
        mcol = (199, 210, 254) if side == "out" else hex_to_rgb(PEARL_DIM)
        mw = d.textlength(meta, font=fm)
        d.text((bw - pad_x - mw, bh - pad_y - 6), meta, font=fm, fill=mcol)
    return img


def _chat_header_png(agent: str, role: str) -> Image.Image:
    h = 230
    img = Image.new("RGBA", (W, h), hex_to_rgb(INDIGO))
    d = ImageDraw.Draw(img)
    for i, c in enumerate((INDIGO, ROSE, AMBER, EMERALD)):
        d.rectangle([W // 4 * i, 0, W // 4 * (i + 1), 9], fill=hex_to_rgb(c))
    # avatar
    cx, cy, r = 132, h // 2 + 8, 66
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=hex_to_rgb(NAVY))
    fa = ImageFont.truetype(FONT_BLACK, 74)
    aw = d.textlength(agent[0].upper(), font=fa)
    am = fa.getmetrics()
    d.text((cx - aw / 2, cy - (am[0] + am[1]) / 2 + 2), agent[0].upper(), font=fa, fill=hex_to_rgb(PEARL))
    d.text((232, 62), agent, font=ImageFont.truetype(FONT_BLACK, 62), fill=hex_to_rgb(PEARL))
    dy = 162
    d.ellipse([236, dy - 10, 256, dy + 10], fill=hex_to_rgb(EMERALD_LIVE))
    d.text((272, dy - 24), role, font=ImageFont.truetype(FONT_REG, 35), fill=(199, 210, 254))
    return img


def _chat_footer_png(headline: str, stat: str) -> Image.Image:
    h = 320
    img = Image.new("RGBA", (W, h), hex_to_rgb(NAVY))
    d = ImageDraw.Draw(img)
    fp = ImageFont.truetype(FONT_BLACK, 40)
    pw = d.textlength(stat, font=fp) + 60
    px0 = (W - pw) / 2
    d.rounded_rectangle([px0, 40, px0 + pw, 110], radius=35, fill=hex_to_rgb(EMERALD))
    d.text((px0 + 30, 52), stat, font=fp, fill=hex_to_rgb(PEARL))
    fh = ImageFont.truetype(FONT_BOLD, 46)
    for i, ln in enumerate(headline.split("\n")):
        lw = d.textlength(ln, font=fh)
        d.text(((W - lw) / 2, 150 + i * 58), ln, font=fh, fill=hex_to_rgb(PEARL))
    fw = ImageFont.truetype(FONT_REG, 33)
    wm = "aanloopai.nl"
    d.text(((W - d.textlength(wm, font=fw)) / 2, h - 58), wm, font=fw, fill=hex_to_rgb(PEARL_DIM))
    return img


def _img_clip(pil_img: Image.Image, duration: float) -> ImageClip:
    return ImageClip(np.array(pil_img), transparent=True).with_duration(duration)


def render_chat_reveal(spec: dict, out_path: Path) -> None:
    """Animated chat mockup — bubbles pop in sequentially with a slide-up."""
    agent = spec["agent"]
    role = spec["role"]
    turns = spec["turns"][:3]
    headline = spec["headline"]
    stat = spec["stat"]

    intro, per, outro = 1.4, 2.4, 2.8
    duration = round(intro + per * len(turns) + outro, 2)

    bg = ColorClip(size=(W, H), color=hex_to_rgb(CHAT_BG)).with_duration(duration)
    header = _img_clip(_chat_header_png(agent, role), duration).with_position((0, 0))
    footer_png = _chat_footer_png(headline, stat)
    footer = _img_clip(footer_png, duration).with_position((0, H - footer_png.height))

    layers = [bg, header]
    y = 300
    for i, turn in enumerate(turns):
        side = "out" if turn["from"] == "agent" else "in"
        bub = _bubble_png(turn["text"], turn.get("meta", ""), side)
        x = W - 60 - bub.width if side == "out" else 60
        start = intro + i * per
        clip = (
            _img_clip(bub, duration - start)
            .with_start(start)
            .with_position(lambda t, x=x, y=y: (x, y + int(40 * max(0.0, 1.0 - t / 0.4))))
            .with_effects([vfx.CrossFadeIn(0.3)])
        )
        layers.append(clip)
        y += bub.height + 30
    layers.append(footer)

    out = CompositeVideoClip(layers, size=(W, H))
    out.write_videofile(str(out_path), fps=FPS, codec="libx264", audio=False, preset="medium", threads=4, logger=None)


RENDERERS = {
    "hook-card": render_hook_card,
    "talking-stat": render_talking_stat,
    "quote-reveal": render_quote_reveal,
    "before-after": render_before_after,
    "ken-burns": render_ken_burns,
    "chat-reveal": render_chat_reveal,
}


def render_slot(slot: dict, out_dir: Path = OUT_DIR) -> Path:
    template = slot["template"]
    if template not in RENDERERS:
        raise ValueError(f"Unknown template: {template} (valid: {list(RENDERERS)})")
    out_path = out_dir / f"{slot['id']}.mp4"
    if out_path.exists() and not slot.get("force_render"):
        print(f"  cache hit: {out_path.name}", file=sys.stderr)
        return out_path
    RENDERERS[template](slot, out_path)
    print(f"  rendered: {out_path.name}", file=sys.stderr)
    return out_path


def load_schedule(p: Path) -> dict:
    with p.open("r", encoding="utf-8") as f:
        return json.load(f)


def find_due(sched: dict) -> dict | None:
    """First unpublished slot whose slot_iso is in the past — mirrors the
    publisher's findDuePost so render and publish always target the same slot."""
    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)
    for s in sched["posts"]:
        if s.get("posted_at") is not None:
            continue
        if datetime.fromisoformat(s["slot_iso"]) <= now:
            return s
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--schedule", default=str(REPO / "marketing" / "instagram" / "wave-3-reels-schedule.json"))
    ap.add_argument("--slot", help="Render a single slot by id")
    ap.add_argument("--due", action="store_true", help="Render only the next due unpublished slot")
    ap.add_argument("--all", action="store_true", help="Render every unpublished slot")
    args = ap.parse_args()

    sched_path = Path(args.schedule)
    sched = load_schedule(sched_path)

    targets: list[dict] = []
    if args.slot:
        for s in sched["posts"]:
            if s["id"] == args.slot:
                targets.append(s)
                break
        if not targets:
            print(f"slot {args.slot} not found", file=sys.stderr)
            return 2
    elif args.due:
        due = find_due(sched)
        if due is None:
            print("No due reel slot — nothing to render.", file=sys.stderr)
            return 0
        targets = [due]
    elif args.all:
        targets = [s for s in sched["posts"] if s.get("posted_at") is None]
    else:
        print("specify --slot <id>, --due or --all", file=sys.stderr)
        return 2

    for slot in targets:
        print(f"render {slot['id']} (template={slot['template']})", file=sys.stderr)
        render_slot(slot)

    return 0


if __name__ == "__main__":
    sys.exit(main())
