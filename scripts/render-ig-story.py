"""Render Aanloop Instagram STORY backgrounds — 1080x1920 9:16 PNG.

Stories require interactive stickers (poll, quiz, slider, question, countdown,
tap-reveal) that the Meta Graph API does NOT let bots overlay programmatically.
This script renders BACKGROUND IMAGES designed with placeholder zones where the
human operator (or IG-app auto-flow) drops the live sticker after publish.

JSON-driven (marketing/instagram/wave-N-stories-schedule.json). One spec → one
1080x1920 PNG in public/social-feed/stories/<slot-id>.png.

Templates:
  - poll-prompt        — 2-option zone for poll sticker
  - quiz-prompt        — 4-option zone for quiz sticker
  - question-box       — zone for question sticker
  - slider-countdown   — slider + countdown sticker zone
  - tap-reveal         — teaser + reveal hint

Brand-strict (Navy + Pearl + 4-accent + Segoe). Safe zones: top 280px + bottom 280px.

Usage:
    python scripts/render-ig-story.py --slot w5-s01
    python scripts/render-ig-story.py --all
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parent.parent
SCHEDULE_DEFAULT = REPO / "marketing" / "instagram" / "wave-5-stories-schedule.json"
OUT_DIR = REPO / "public" / "social-feed" / "stories"
OUT_DIR.mkdir(parents=True, exist_ok=True)

W, H = 1080, 1920
SAFE_TOP = 280
SAFE_BOTTOM = 280

NAVY = "#0F172A"
NAVY_DEEP = "#0B1224"
INDIGO_DEEP = "#1E1B4B"
PEARL = "#F1F5F9"
PEARL_DIM = "#94A3B8"
PEARL_FAINT = "#475569"
INDIGO = "#4338CA"
ROSE = "#E11D48"
AMBER = "#D97706"
EMERALD = "#047857"
EMERALD_BRIGHT = "#22C55E"
ROSE_DEEP = "#9F1239"
EMERALD_DEEP = "#064E3B"
BRAND_ACCENTS = (INDIGO, ROSE, AMBER, EMERALD)

FONT_BLACK = os.environ.get("STORY_FONT_BLACK", r"C:\Windows\Fonts\seguibl.ttf")
FONT_BOLD = os.environ.get("STORY_FONT_BOLD", r"C:\Windows\Fonts\segoeuib.ttf")
FONT_REG = os.environ.get("STORY_FONT_REG", r"C:\Windows\Fonts\segoeui.ttf")


def font(p: str, s: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(p, s)


def text_size(d: ImageDraw.ImageDraw, txt: str, f: ImageFont.FreeTypeFont) -> tuple[int, int]:
    bbox = d.textbbox((0, 0), txt, font=f, anchor="lt")
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def wrap_lines(d: ImageDraw.ImageDraw, txt: str, f: ImageFont.FreeTypeFont, max_w: int) -> list[str]:
    lines: list[str] = []
    for para in txt.split("\n"):
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


def draw_wrapped(d: ImageDraw.ImageDraw, txt: str, y: int, f: ImageFont.FreeTypeFont, fill: str,
                 max_w: int = W - 160, align: str = "center", line_spacing: int = 8) -> int:
    lines = wrap_lines(d, txt, f, max_w)
    asc, desc = f.getmetrics()
    line_h = asc + desc + line_spacing
    for ln in lines:
        w = d.textlength(ln, font=f)
        if align == "center":
            x = (W - w) // 2
        else:
            x = 80
        d.text((x, y), ln, font=f, fill=fill)
        y += line_h
    return y


def draw_brand_strip(d: ImageDraw.ImageDraw, y: int = 100, total_w: int = 320) -> None:
    strip_w = total_w // 4
    strip_h = 8
    x0_base = (W - total_w) // 2
    for i, color in enumerate(BRAND_ACCENTS):
        x0 = x0_base + i * strip_w
        x1 = x0 + strip_w if i < 3 else x0_base + total_w
        d.rectangle([x0, y, x1, y + strip_h], fill=color)


def draw_wordmark(d: ImageDraw.ImageDraw, baseline_y: int = H - 160) -> None:
    f = font(FONT_REG, 36)
    text = "aanloop ai"
    w, h = text_size(d, text, f)
    d.text(((W - w) // 2, baseline_y - h), text, fill=PEARL_DIM, font=f)


def draw_sticker_zone_hint(d: ImageDraw.ImageDraw, y: int, label: str, fill: str = AMBER) -> None:
    f = font(FONT_BOLD, 36)
    w, h = text_size(d, f"[ {label} ]", f)
    d.text(((W - w) // 2, y), f"[ {label} ]", font=f, fill=fill)


def new_story(bg: str = NAVY) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (W, H), bg)
    return img, ImageDraw.Draw(img)


def render_poll_prompt(spec: dict, out_path: Path) -> Path:
    img, d = new_story(NAVY)
    draw_brand_strip(d)

    f_hook = font(FONT_BLACK, 110)
    draw_wrapped(d, spec["hook"], SAFE_TOP + 100, f_hook, PEARL, max_w=W - 160, line_spacing=14)

    card_y = 1080
    card_h = 220
    card_pad = 70
    card_w = W - 2 * card_pad
    d.rounded_rectangle([card_pad, card_y, card_pad + card_w, card_y + card_h], radius=32, fill=INDIGO_DEEP)
    f_opt = font(FONT_BLACK, 64)
    draw_wrapped(d, spec.get("option_a", "A"), card_y + 70, f_opt, PEARL, max_w=card_w - 80, line_spacing=8)

    card_y2 = card_y + card_h + 40
    d.rounded_rectangle([card_pad, card_y2, card_pad + card_w, card_y2 + card_h], radius=32, fill=ROSE_DEEP)
    draw_wrapped(d, spec.get("option_b", "B"), card_y2 + 70, f_opt, PEARL, max_w=card_w - 80, line_spacing=8)

    draw_sticker_zone_hint(d, H - SAFE_BOTTOM - 60, "POLL STICKER HIER")
    draw_wordmark(d)
    img.save(out_path, "PNG", optimize=True)
    return out_path


def render_quiz_prompt(spec: dict, out_path: Path) -> Path:
    img, d = new_story(NAVY)
    draw_brand_strip(d)

    f_label = font(FONT_BOLD, 36)
    draw_wrapped(d, "QUIZ", SAFE_TOP + 50, f_label, AMBER, line_spacing=6)
    f_hook = font(FONT_BLACK, 88)
    draw_wrapped(d, spec["hook"], SAFE_TOP + 150, f_hook, PEARL, max_w=W - 160, line_spacing=12)

    f_q = font(FONT_BOLD, 56)
    draw_wrapped(d, spec.get("question", ""), 720, f_q, PEARL_DIM, max_w=W - 160, line_spacing=10)

    f_opt = font(FONT_BOLD, 44)
    opt_y = 1000
    opt_pad = 80
    opt_h = 150
    text_x = opt_pad + 140  # leave room for letter circle on the left
    for i, opt in enumerate(spec.get("options", [])[:4]):
        accent = BRAND_ACCENTS[i % 4]
        d.rounded_rectangle([opt_pad, opt_y, W - opt_pad, opt_y + opt_h], radius=24,
                            fill=NAVY_DEEP, outline=accent, width=4)
        letter = chr(ord("A") + i)
        f_letter = font(FONT_BLACK, 56)
        d.text((opt_pad + 30, opt_y + 42), letter, font=f_letter, fill=accent)
        # Render option text manually, anchored after the letter
        lines = wrap_lines(d, opt, f_opt, W - text_x - opt_pad - 30)
        asc, desc = f_opt.getmetrics()
        line_h = asc + desc + 4
        block_h = line_h * len(lines)
        cur_y = opt_y + (opt_h - block_h) // 2
        for ln in lines:
            d.text((text_x, cur_y), ln, font=f_opt, fill=PEARL)
            cur_y += line_h
        opt_y += opt_h + 20

    draw_sticker_zone_hint(d, H - SAFE_BOTTOM - 40, "QUIZ STICKER HIER")
    draw_wordmark(d)
    img.save(out_path, "PNG", optimize=True)
    return out_path


def render_question_box(spec: dict, out_path: Path) -> Path:
    img, d = new_story(INDIGO_DEEP)
    draw_brand_strip(d)

    f_hook = font(FONT_BLACK, 110)
    draw_wrapped(d, spec["hook"], SAFE_TOP + 80, f_hook, PEARL, max_w=W - 160, line_spacing=14)

    bub_x, bub_y = 80, 900
    bub_w, bub_h = W - 160, 360
    d.rounded_rectangle([bub_x, bub_y, bub_x + bub_w, bub_y + bub_h], radius=40,
                        fill=NAVY, outline=AMBER, width=6)
    f_prompt = font(FONT_BOLD, 56)
    draw_wrapped(d, spec.get("prompt", "Drop je vraag hieronder"), bub_y + 80, f_prompt, PEARL,
                 max_w=bub_w - 80, line_spacing=10)

    draw_sticker_zone_hint(d, H - SAFE_BOTTOM - 50, "QUESTION STICKER HIER")
    draw_wordmark(d)
    img.save(out_path, "PNG", optimize=True)
    return out_path


def render_slider_countdown(spec: dict, out_path: Path) -> Path:
    img, d = new_story(NAVY)
    draw_brand_strip(d)

    f_hook = font(FONT_BLACK, 96)
    draw_wrapped(d, spec["hook"], SAFE_TOP + 80, f_hook, PEARL, max_w=W - 160, line_spacing=12)

    slider_y = 800
    f_slider_q = font(FONT_BOLD, 50)
    draw_wrapped(d, spec.get("slider_question", "Hoe zeker ben jij?"), slider_y, f_slider_q, PEARL_DIM,
                 max_w=W - 160, line_spacing=10)
    bar_y = slider_y + 180
    bar_x = 100
    bar_w = W - 200
    d.rounded_rectangle([bar_x, bar_y, bar_x + bar_w, bar_y + 24], radius=12, fill=PEARL_FAINT)
    d.rounded_rectangle([bar_x, bar_y, bar_x + int(bar_w * 0.6), bar_y + 24], radius=12, fill=AMBER)
    f_scale = font(FONT_BOLD, 36)
    for i in range(1, 11):
        x = bar_x + (bar_w - 1) * (i - 1) // 9
        d.text((x - 12, bar_y + 50), str(i), font=f_scale, fill=PEARL_DIM)

    cd_y = 1200
    f_cd_lbl = font(FONT_BOLD, 42)
    draw_wrapped(d, "COUNTDOWN", cd_y, f_cd_lbl, EMERALD_BRIGHT, line_spacing=6)
    f_cd = font(FONT_BLACK, 80)
    draw_wrapped(d, spec.get("countdown_event", "Webinar"), cd_y + 80, f_cd, PEARL,
                 max_w=W - 160, line_spacing=10)
    f_cd_when = font(FONT_REG, 38)
    draw_wrapped(d, spec.get("countdown_when", "Vrijdag 20:00"), cd_y + 220, f_cd_when, PEARL_DIM,
                 max_w=W - 160, line_spacing=8)

    draw_sticker_zone_hint(d, H - SAFE_BOTTOM - 60, "SLIDER + COUNTDOWN HIER")
    draw_wordmark(d)
    img.save(out_path, "PNG", optimize=True)
    return out_path


def render_tap_reveal(spec: dict, out_path: Path) -> Path:
    img, d = new_story(NAVY_DEEP)
    draw_brand_strip(d)

    f_teaser_lbl = font(FONT_BOLD, 38)
    draw_wrapped(d, "TAP OM TE ONTHULLEN", SAFE_TOP + 60, f_teaser_lbl, AMBER, line_spacing=6)

    f_teaser = font(FONT_BLACK, 108)
    draw_wrapped(d, spec["teaser"], SAFE_TOP + 180, f_teaser, PEARL, max_w=W - 160, line_spacing=14)

    cx, cy = W // 2, 1100
    for r in (140, 90):
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=AMBER, width=6)
    f_tap = font(FONT_BLACK, 72)
    d.text((cx - 60, cy - 50), "TAP", font=f_tap, fill=AMBER)

    f_reveal_hint = font(FONT_BOLD, 44)
    draw_wrapped(d, spec.get("reveal_hint", "Antwoord verschijnt hier"), 1400, f_reveal_hint, PEARL_DIM,
                 max_w=W - 160, line_spacing=8)

    f_link = font(FONT_BOLD, 38)
    draw_wrapped(d, spec.get("link_label", "Link in bio"), H - SAFE_BOTTOM - 80, f_link, EMERALD_BRIGHT, line_spacing=6)

    draw_wordmark(d)
    img.save(out_path, "PNG", optimize=True)
    return out_path


RENDERERS = {
    "poll-prompt": render_poll_prompt,
    "quiz-prompt": render_quiz_prompt,
    "question-box": render_question_box,
    "slider-countdown": render_slider_countdown,
    "tap-reveal": render_tap_reveal,
}


def render_slot(slot: dict) -> Path:
    template = slot["template"]
    if template not in RENDERERS:
        raise ValueError(f"Unknown story template: {template} (valid: {list(RENDERERS)})")
    out_path = OUT_DIR / f"{slot['id']}.png"
    RENDERERS[template](slot, out_path)
    print(f"  rendered {slot['id']} (template={template}) → {out_path.name}", file=sys.stderr)
    return out_path


def load_schedule(p: Path) -> dict:
    with p.open("r", encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--schedule", default=str(SCHEDULE_DEFAULT))
    ap.add_argument("--slot", help="Render a single slot by id")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    sched_path = Path(args.schedule)
    if not sched_path.exists():
        print(f"Schedule not found: {sched_path}", file=sys.stderr)
        return 2
    sched = load_schedule(sched_path)

    targets: list[dict] = []
    if args.slot:
        for p in sched.get("posts", []):
            if p["id"] == args.slot:
                targets.append(p)
                break
        if not targets:
            print(f"slot {args.slot} not found", file=sys.stderr)
            return 2
    elif args.all:
        targets = sched.get("posts", [])
    else:
        print("specify --slot <id> or --all", file=sys.stderr)
        return 2

    for slot in targets:
        if args.dry_run:
            print(f"  DRY {slot['id']} (template={slot['template']})", file=sys.stderr)
            continue
        render_slot(slot)

    return 0


if __name__ == "__main__":
    sys.exit(main())
