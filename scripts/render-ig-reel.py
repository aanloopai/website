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

from moviepy import (
    ColorClip,
    CompositeVideoClip,
    ImageClip,
    TextClip,
)
from PIL import Image

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


def text(
    txt: str,
    font: str,
    size: int,
    color: str,
    duration: float,
    pos: tuple,
    start: float = 0.0,
    max_width: int = W - 160,
) -> TextClip:
    return (
        TextClip(
            text=txt,
            font=font,
            font_size=size,
            color=color,
            method="caption",
            size=(max_width, None),
            text_align="center",
        )
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
    image_path = REPO / spec["image"]
    if not image_path.exists():
        raise FileNotFoundError(f"Ken-burns image not found: {image_path}")
    headline = spec["headline"]
    sub = spec.get("sub", "")
    cta = spec.get("cta", "aanloopai.nl/ig")
    duration = 10.0

    base = ImageClip(str(image_path)).with_duration(duration).resized(height=int(H * 1.2))
    if base.w < W:
        base = base.resized(width=int(W * 1.2))
    base = base.with_position(("center", "center"))

    overlay_bg = ColorClip(size=(W, H), color=(0, 0, 0)).with_opacity(0.45).with_duration(duration)

    layers = [base, overlay_bg]
    layers.extend(brand_strip(duration))
    layers.append(text(headline, FONT_BLACK, 100, PEARL, duration, ("center", 700), 0.5))
    if sub:
        layers.append(text(sub, FONT_BOLD, 56, PEARL_DIM, duration - 1.0, ("center", 1050), 1.0))
    layers.append(text(cta, FONT_BOLD, 58, AMBER, duration - 2.5, ("center", 1680), 2.5))
    layers.append(wordmark(duration))

    out = CompositeVideoClip(layers, size=(W, H))
    out.write_videofile(str(out_path), fps=FPS, codec="libx264", audio=False, preset="medium", threads=4, logger=None)


RENDERERS = {
    "hook-card": render_hook_card,
    "talking-stat": render_talking_stat,
    "quote-reveal": render_quote_reveal,
    "before-after": render_before_after,
    "ken-burns": render_ken_burns,
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
