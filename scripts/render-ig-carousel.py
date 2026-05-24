"""Render Aanloop Instagram CAROUSEL posts — multi-slide 1080x1080 PNG sets.

JSON-driven (marketing/instagram/wave-N-schedule.json, format=carousel) so a
single post-spec produces 2..10 slides, named slot-id-01.png .. slot-id-NN.png
into public/social-feed/carousel/<slot-id>/.

Brand-strict: Navy + Pearl + Indigo/Rose/Amber/Emerald + Segoe UI. Each template
chooses a DIFFERENT composition to break the "all posts look the same" smell.

Templates (registry):
  - before-after        — split-screen rose/emerald, 6-8 slides
  - step-framework      — numbered cards, 7-10 slides
  - data-viz            — bar/donut chart per slide, 5-7 slides
  - benchmark           — 2-column "you vs top-10%", 6 slides
  - faq                 — speech-bubble Q + answer card, 8-10 slides
  - social-proof        — quote-card + avatar circle, 7 slides
  - objection-destroyed — cross-mark + check-mark visual, 6-8 slides

Usage:
    python scripts/render-ig-carousel.py --slot w5-c01
    python scripts/render-ig-carousel.py --all
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parent.parent
SCHEDULE_DEFAULT = REPO / "marketing" / "instagram" / "wave-5-schedule.json"
OUT_DIR_BASE = REPO / "public" / "social-feed" / "carousel"
OUT_DIR_BASE.mkdir(parents=True, exist_ok=True)

SIZE = 1080
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

FONT_BLACK = os.environ.get("CAROUSEL_FONT_BLACK", r"C:\Windows\Fonts\seguibl.ttf")
FONT_BOLD = os.environ.get("CAROUSEL_FONT_BOLD", r"C:\Windows\Fonts\segoeuib.ttf")
FONT_REG = os.environ.get("CAROUSEL_FONT_REG", r"C:\Windows\Fonts\segoeui.ttf")
FONT_LIGHT = os.environ.get("CAROUSEL_FONT_LIGHT", r"C:\Windows\Fonts\segoeui.ttf")


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


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
                 max_w: int = SIZE - 160, align: str = "center", line_spacing: int = 8) -> int:
    lines = wrap_lines(d, txt, f, max_w)
    asc, desc = f.getmetrics()
    line_h = asc + desc + line_spacing
    for ln in lines:
        w = d.textlength(ln, font=f)
        if align == "center":
            x = (SIZE - w) // 2
        elif align == "right":
            x = SIZE - 80 - w
        else:
            x = 80
        d.text((x, y), ln, font=f, fill=fill)
        y += line_h
    return y


def draw_brand_strip(d: ImageDraw.ImageDraw, y: int = 70, total_w: int = 280, strip_h: int = 6) -> None:
    strip_w = total_w // 4
    x0_base = (SIZE - total_w) // 2
    for i, color in enumerate(BRAND_ACCENTS):
        x0 = x0_base + i * strip_w
        x1 = x0 + strip_w if i < 3 else x0_base + total_w
        d.rectangle([x0, y, x1, y + strip_h], fill=color)


def draw_wordmark(d: ImageDraw.ImageDraw, baseline_y: int = SIZE - 60, fill: str = PEARL_DIM,
                  text: str = "aanloop ai") -> None:
    f = font(FONT_REG, 32)
    w, h = text_size(d, text, f)
    d.text(((SIZE - w) // 2, baseline_y - h), text, fill=fill, font=f)


def draw_slide_counter(d: ImageDraw.ImageDraw, idx: int, total: int) -> None:
    f = font(FONT_BOLD, 28)
    txt = f"{idx} / {total}"
    w, h = text_size(d, txt, f)
    d.text((SIZE - 80 - w, 70), txt, fill=PEARL_DIM, font=f)


def draw_swipe_hint(d: ImageDraw.ImageDraw, y: int = SIZE - 130, text: str = "Swipe →") -> None:
    f = font(FONT_BOLD, 34)
    w, h = text_size(d, text, f)
    d.text(((SIZE - w) // 2, y), text, fill=AMBER, font=f)


def new_slide(bg: str = NAVY) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (SIZE, SIZE), bg)
    return img, ImageDraw.Draw(img)


def render_before_after(spec: dict, out_dir: Path) -> list[Path]:
    slides: list[Image.Image] = []

    img, d = new_slide(NAVY)
    draw_brand_strip(d)
    f_hook = font(FONT_BLACK, 96)
    draw_wrapped(d, spec["hook"], 360, f_hook, PEARL, max_w=SIZE - 160, line_spacing=10)
    draw_swipe_hint(d)
    draw_wordmark(d)
    slides.append(img)

    img, d = new_slide(ROSE_DEEP)
    f_label = font(FONT_BOLD, 64)
    draw_wrapped(d, "VOOR", 180, f_label, PEARL, line_spacing=10)
    f_sub = font(FONT_BLACK, 90)
    draw_wrapped(d, spec.get("before_label", "Zonder Aanloop"), 320, f_sub, PEARL, line_spacing=12)
    draw_wordmark(d)
    slides.append(img)

    img, d = new_slide(NAVY)
    f_pts = font(FONT_BOLD, 56)
    f_lbl = font(FONT_BOLD, 38)
    draw_wrapped(d, "VOOR", 140, f_lbl, ROSE, line_spacing=8)
    y = 240
    for pt in spec.get("before_points", [])[:5]:
        d.ellipse([100, y + 18, 130, y + 48], fill=ROSE)
        y_text = y
        lines = wrap_lines(d, pt, f_pts, SIZE - 220)
        asc, desc = f_pts.getmetrics()
        line_h = asc + desc + 8
        for ln in lines:
            d.text((160, y_text), ln, font=f_pts, fill=PEARL)
            y_text += line_h
        y = y_text + 30
    draw_wordmark(d)
    slides.append(img)

    img, d = new_slide(EMERALD_DEEP)
    draw_wrapped(d, "NA", 180, f_label, PEARL, line_spacing=10)
    draw_wrapped(d, spec.get("after_label", "Met Aanloop"), 320, f_sub, PEARL, line_spacing=12)
    draw_wordmark(d)
    slides.append(img)

    img, d = new_slide(NAVY)
    draw_wrapped(d, "NA", 140, f_lbl, EMERALD_BRIGHT, line_spacing=8)
    y = 240
    for pt in spec.get("after_points", [])[:5]:
        d.ellipse([100, y + 18, 130, y + 48], fill=EMERALD_BRIGHT)
        y_text = y
        lines = wrap_lines(d, pt, f_pts, SIZE - 220)
        asc, desc = f_pts.getmetrics()
        line_h = asc + desc + 8
        for ln in lines:
            d.text((160, y_text), ln, font=f_pts, fill=PEARL)
            y_text += line_h
        y = y_text + 30
    draw_wordmark(d)
    slides.append(img)

    img, d = new_slide(NAVY)
    draw_brand_strip(d)
    stat = spec.get("stat", {"value": "14", "label": "dagen tot go-live"})
    f_huge = font(FONT_BLACK, 380)
    f_sub2 = font(FONT_LIGHT, 54)
    draw_wrapped(d, stat["value"], 280, f_huge, EMERALD_BRIGHT, line_spacing=0)
    d.rectangle([(SIZE - 220) // 2, 720, (SIZE + 220) // 2, 728], fill=EMERALD_BRIGHT)
    draw_wrapped(d, stat["label"], 780, f_sub2, PEARL, line_spacing=12)
    draw_wordmark(d)
    slides.append(img)

    img, d = new_slide(INDIGO_DEEP)
    draw_brand_strip(d)
    f_cta = font(FONT_BLACK, 78)
    draw_wrapped(d, spec.get("cta", "DM ons 'MARCO'"), 380, f_cta, AMBER, line_spacing=14)
    f_cta_sub = font(FONT_BOLD, 44)
    draw_wrapped(d, "voor een gratis 15-min audit", 620, f_cta_sub, PEARL, line_spacing=10)
    draw_wordmark(d, fill=PEARL_DIM)
    slides.append(img)

    return _save_slides(slides, out_dir, spec["id"], total=len(slides))


def render_step_framework(spec: dict, out_dir: Path) -> list[Path]:
    slides: list[Image.Image] = []
    steps = spec.get("steps", [])[:8]

    img, d = new_slide(NAVY)
    draw_brand_strip(d)
    f_label = font(FONT_BOLD, 30)
    draw_wrapped(d, f"FRAMEWORK · {len(steps)} STAPPEN", 200, f_label, AMBER, line_spacing=6)
    f_hook = font(FONT_BLACK, 100)
    draw_wrapped(d, spec["hook"], 320, f_hook, PEARL, line_spacing=12)
    draw_swipe_hint(d)
    draw_wordmark(d)
    slides.append(img)

    for i, step in enumerate(steps, start=1):
        img, d = new_slide(NAVY)
        f_num = font(FONT_BLACK, 380)
        accent = BRAND_ACCENTS[(i - 1) % 4]
        d.text((SIZE - 320, 100), f"{i:02d}", font=f_num, fill=accent)
        f_title = font(FONT_BLACK, 80)
        draw_wrapped(d, step["title"], 480, f_title, PEARL, max_w=SIZE - 160, line_spacing=10)
        f_body = font(FONT_LIGHT, 48)
        draw_wrapped(d, step.get("body", ""), 700, f_body, PEARL_DIM, max_w=SIZE - 160, line_spacing=8)
        draw_wordmark(d)
        slides.append(img)

    img, d = new_slide(INDIGO_DEEP)
    draw_brand_strip(d)
    keyword = spec.get("cta_keyword", "FRAMEWORK")
    f_cta = font(FONT_BLACK, 96)
    draw_wrapped(d, f"Comment\n'{keyword}'", 320, f_cta, AMBER, line_spacing=14)
    f_cta_sub = font(FONT_BOLD, 42)
    draw_wrapped(d, "We sturen je het volledige\nframework via DM", 640, f_cta_sub, PEARL, line_spacing=10)
    draw_wordmark(d)
    slides.append(img)

    return _save_slides(slides, out_dir, spec["id"], total=len(slides))


def render_data_viz(spec: dict, out_dir: Path) -> list[Path]:
    slides: list[Image.Image] = []
    dps = spec.get("data_points", [])[:5]

    img, d = new_slide(NAVY)
    draw_brand_strip(d)
    f_label = font(FONT_BOLD, 28)
    draw_wrapped(d, f"DATA · {spec.get('source', 'CBS 2025')}", 200, f_label, PEARL_DIM, line_spacing=6)
    f_hook = font(FONT_BLACK, 110)
    draw_wrapped(d, spec["hook"], 320, f_hook, PEARL, line_spacing=12)
    draw_swipe_hint(d)
    draw_wordmark(d)
    slides.append(img)

    for i, dp in enumerate(dps, start=1):
        img, d = new_slide(NAVY)
        accent = BRAND_ACCENTS[(i - 1) % 4]
        f_lbl = font(FONT_BOLD, 44)
        draw_wrapped(d, dp["label"], 200, f_lbl, PEARL, line_spacing=8)

        f_val = font(FONT_BLACK, 220)
        val_text = f"{dp['value']}{dp.get('unit', '%')}"
        draw_wrapped(d, val_text, 360, f_val, accent, line_spacing=0)

        max_v = dp.get("max", 100)
        ratio = min(1.0, float(dp["value"]) / max_v)
        bar_w_max = SIZE - 200
        bar_w = int(bar_w_max * ratio)
        bar_y = 720
        bar_h = 50
        d.rounded_rectangle([100, bar_y, 100 + bar_w_max, bar_y + bar_h], radius=8, fill=PEARL_FAINT)
        d.rounded_rectangle([100, bar_y, 100 + bar_w, bar_y + bar_h], radius=8, fill=accent)

        f_note = font(FONT_LIGHT, 36)
        draw_wrapped(d, dp.get("note", ""), 830, f_note, PEARL_DIM, line_spacing=8)
        draw_wordmark(d)
        slides.append(img)

    img, d = new_slide(INDIGO_DEEP)
    draw_brand_strip(d)
    f_reveal = font(FONT_BLACK, 84)
    draw_wrapped(d, spec.get("reveal", "De winst is groter dan je denkt."), 280, f_reveal, PEARL, line_spacing=12)
    f_cta = font(FONT_BOLD, 56)
    draw_wrapped(d, spec.get("cta", "DM 'AUDIT' →"), 740, f_cta, AMBER, line_spacing=10)
    draw_wordmark(d)
    slides.append(img)

    return _save_slides(slides, out_dir, spec["id"], total=len(slides))


def render_benchmark(spec: dict, out_dir: Path) -> list[Path]:
    slides: list[Image.Image] = []
    metrics = spec.get("metrics", [])[:4]

    img, d = new_slide(NAVY)
    draw_brand_strip(d)
    f_label = font(FONT_BOLD, 28)
    draw_wrapped(d, "BENCHMARK · NL MKB", 200, f_label, ROSE, line_spacing=6)
    f_hook = font(FONT_BLACK, 100)
    draw_wrapped(d, spec["hook"], 320, f_hook, PEARL, line_spacing=12)
    draw_swipe_hint(d)
    draw_wordmark(d)
    slides.append(img)

    for i, m in enumerate(metrics, start=1):
        img, d = new_slide(NAVY)
        f_lbl = font(FONT_BOLD, 54)
        draw_wrapped(d, m["label"], 200, f_lbl, PEARL, line_spacing=8)

        col_y = 420
        col_h = 320
        col_w = (SIZE - 220) // 2
        d.rounded_rectangle([80, col_y, 80 + col_w, col_y + col_h], radius=20, fill=ROSE_DEEP)
        f_col_lbl = font(FONT_BOLD, 38)
        d.text((80 + 30, col_y + 30), "JIJ", font=f_col_lbl, fill=PEARL)
        f_col_val = font(FONT_BLACK, 130)
        val_y = col_y + 110
        d.text((80 + 30, val_y), f"{m['you']}{m.get('unit', '')}", font=f_col_val, fill=PEARL)

        d.rounded_rectangle([140 + col_w, col_y, 140 + 2 * col_w, col_y + col_h], radius=20, fill=EMERALD_DEEP)
        d.text((140 + col_w + 30, col_y + 30), "TOP 10%", font=f_col_lbl, fill=PEARL)
        d.text((140 + col_w + 30, val_y), f"{m['leader']}{m.get('unit', '')}", font=f_col_val, fill=PEARL)

        f_note = font(FONT_LIGHT, 36)
        draw_wrapped(d, m.get("gap_note", ""), 820, f_note, PEARL_DIM, line_spacing=8)
        draw_wordmark(d)
        slides.append(img)

    img, d = new_slide(INDIGO_DEEP)
    draw_brand_strip(d)
    f_cta = font(FONT_BLACK, 88)
    draw_wrapped(d, spec.get("cta", "Tag een ondernemer\ndie dit moet zien"), 360, f_cta, AMBER, line_spacing=14)
    draw_wordmark(d)
    slides.append(img)

    return _save_slides(slides, out_dir, spec["id"], total=len(slides))


def render_faq(spec: dict, out_dir: Path) -> list[Path]:
    slides: list[Image.Image] = []
    qa = spec.get("qa", [])[:8]

    img, d = new_slide(NAVY)
    draw_brand_strip(d)
    f_label = font(FONT_BOLD, 28)
    draw_wrapped(d, f"FAQ · {len(qa)} VRAGEN", 200, f_label, EMERALD_BRIGHT, line_spacing=6)
    f_hook = font(FONT_BLACK, 96)
    draw_wrapped(d, spec["hook"], 320, f_hook, PEARL, line_spacing=12)
    draw_swipe_hint(d)
    draw_wordmark(d)
    slides.append(img)

    for i, item in enumerate(qa, start=1):
        img, d = new_slide(NAVY)
        d.rounded_rectangle([80, 200, SIZE - 80, 480], radius=24, fill=INDIGO_DEEP)
        f_q_lbl = font(FONT_BOLD, 32)
        d.text((120, 230), f"V{i:02d}", font=f_q_lbl, fill=AMBER)
        f_q = font(FONT_BOLD, 52)
        draw_wrapped(d, item["q"], 290, f_q, PEARL, max_w=SIZE - 240, align="left", line_spacing=6)

        d.rounded_rectangle([80, 540, SIZE - 80, 940], radius=24, fill=NAVY_DEEP, outline=EMERALD_BRIGHT, width=4)
        d.text((120, 570), "ANTWOORD", font=f_q_lbl, fill=EMERALD_BRIGHT)
        f_a = font(FONT_LIGHT, 46)
        draw_wrapped(d, item["a"], 625, f_a, PEARL, max_w=SIZE - 240, align="left", line_spacing=6)
        draw_wordmark(d)
        slides.append(img)

    img, d = new_slide(INDIGO_DEEP)
    draw_brand_strip(d)
    f_cta = font(FONT_BLACK, 96)
    draw_wrapped(d, spec.get("cta", "Bewaar deze post"), 380, f_cta, AMBER, line_spacing=14)
    f_cta_sub = font(FONT_BOLD, 42)
    draw_wrapped(d, "voor je volgende\nsales-gesprek", 640, f_cta_sub, PEARL, line_spacing=10)
    draw_wordmark(d)
    slides.append(img)

    return _save_slides(slides, out_dir, spec["id"], total=len(slides))


def render_social_proof(spec: dict, out_dir: Path) -> list[Path]:
    slides: list[Image.Image] = []
    quotes = spec.get("quotes", [])[:4]

    img, d = new_slide(NAVY)
    draw_brand_strip(d)
    f_label = font(FONT_BOLD, 28)
    draw_wrapped(d, "KLANTRESULTATEN · NL MKB", 200, f_label, AMBER, line_spacing=6)
    f_hook = font(FONT_BLACK, 100)
    draw_wrapped(d, spec["hook"], 320, f_hook, PEARL, line_spacing=12)
    draw_swipe_hint(d)
    draw_wordmark(d)
    slides.append(img)

    for i, q in enumerate(quotes, start=1):
        img, d = new_slide(NAVY)
        accent = BRAND_ACCENTS[(i - 1) % 4]
        cx, cy, r = SIZE // 2, 280, 90
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=accent)
        f_init = font(FONT_BLACK, 100)
        initials = q.get("initials", "MKB")[:3]
        w, h = text_size(d, initials, f_init)
        d.text((cx - w // 2, cy - h // 2 - 8), initials, font=f_init, fill=PEARL)

        f_q = font(FONT_BOLD, 60)
        draw_wrapped(d, f'"{q["quote"]}"', 440, f_q, PEARL, max_w=SIZE - 160, line_spacing=10)

        f_auth = font(FONT_BOLD, 38)
        f_sector = font(FONT_LIGHT, 32)
        draw_wrapped(d, f"— {q['author_role']}", 820, f_auth, accent, line_spacing=6)
        draw_wrapped(d, q.get("sector", ""), 870, f_sector, PEARL_DIM, line_spacing=6)

        outcome = q.get("outcome", "")
        if outcome:
            f_out = font(FONT_BOLD, 30)
            ow, oh = text_size(d, outcome, f_out)
            chip_x = (SIZE - ow - 60) // 2
            d.rounded_rectangle([chip_x, 920, chip_x + ow + 60, 920 + oh + 24], radius=20, fill=EMERALD_BRIGHT)
            d.text((chip_x + 30, 932), outcome, font=f_out, fill=NAVY)
        draw_wordmark(d)
        slides.append(img)

    img, d = new_slide(INDIGO_DEEP)
    draw_brand_strip(d)
    keyword = spec.get("cta_keyword", "CASE")
    f_cta = font(FONT_BLACK, 92)
    draw_wrapped(d, f"Comment\n'{keyword}'", 320, f_cta, AMBER, line_spacing=14)
    f_cta_sub = font(FONT_BOLD, 42)
    draw_wrapped(d, "DM stuurt je de\nvolledige case-study", 640, f_cta_sub, PEARL, line_spacing=10)
    draw_wordmark(d)
    slides.append(img)

    return _save_slides(slides, out_dir, spec["id"], total=len(slides))


def render_objection_destroyed(spec: dict, out_dir: Path) -> list[Path]:
    slides: list[Image.Image] = []
    objs = spec.get("objections", [])[:6]

    img, d = new_slide(NAVY)
    draw_brand_strip(d)
    f_label = font(FONT_BOLD, 28)
    draw_wrapped(d, f"{len(objs)} BEZWAREN · ONTKRACHT", 200, f_label, ROSE, line_spacing=6)
    f_hook = font(FONT_BLACK, 96)
    draw_wrapped(d, spec["hook"], 320, f_hook, PEARL, line_spacing=12)
    draw_swipe_hint(d)
    draw_wordmark(d)
    slides.append(img)

    for i, o in enumerate(objs, start=1):
        img, d = new_slide(NAVY)
        d.rounded_rectangle([80, 200, SIZE - 80, 480], radius=24, fill=ROSE_DEEP)
        f_lbl = font(FONT_BOLD, 32)
        d.text((120, 230), "MYTHE", font=f_lbl, fill=PEARL)
        cx, cy, r = SIZE - 160, 245, 26
        d.line([(cx - r, cy - r), (cx + r, cy + r)], fill=PEARL, width=8)
        d.line([(cx - r, cy + r), (cx + r, cy - r)], fill=PEARL, width=8)
        f_q = font(FONT_BOLD, 52)
        draw_wrapped(d, f'"{o["claim"]}"', 290, f_q, PEARL, max_w=SIZE - 240, align="left", line_spacing=6)

        d.rounded_rectangle([80, 540, SIZE - 80, 940], radius=24, fill=EMERALD_DEEP)
        d.text((120, 570), "WERKELIJKHEID", font=f_lbl, fill=PEARL)
        cx, cy = SIZE - 160, 590
        d.line([(cx - 28, cy + 4), (cx - 8, cy + 22), (cx + 24, cy - 18)], fill=PEARL, width=10)
        f_a = font(FONT_LIGHT, 46)
        draw_wrapped(d, o["reality"], 625, f_a, PEARL, max_w=SIZE - 240, align="left", line_spacing=6)
        draw_wordmark(d)
        slides.append(img)

    img, d = new_slide(INDIGO_DEEP)
    draw_brand_strip(d)
    f_cta = font(FONT_BLACK, 92)
    draw_wrapped(d, spec.get("cta", "Bewaar voor je\nvolgende sales-call"), 360, f_cta, AMBER, line_spacing=14)
    draw_wordmark(d)
    slides.append(img)

    return _save_slides(slides, out_dir, spec["id"], total=len(slides))


def _save_slides(slides: list[Image.Image], out_dir_base: Path, slot_id: str, total: int) -> list[Path]:
    out_dir = out_dir_base / slot_id
    out_dir.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for idx, img in enumerate(slides, start=1):
        d = ImageDraw.Draw(img)
        draw_slide_counter(d, idx, total)
        out_path = out_dir / f"slide-{idx:02d}.png"
        img.save(out_path, "PNG", optimize=True)
        paths.append(out_path)
    return paths


RENDERERS = {
    "before-after": render_before_after,
    "step-framework": render_step_framework,
    "data-viz": render_data_viz,
    "benchmark": render_benchmark,
    "faq": render_faq,
    "social-proof": render_social_proof,
    "objection-destroyed": render_objection_destroyed,
}


def render_slot(slot: dict) -> list[Path]:
    template = slot["template"]
    if template not in RENDERERS:
        raise ValueError(f"Unknown carousel template: {template} (valid: {list(RENDERERS)})")
    paths = RENDERERS[template](slot, OUT_DIR_BASE)
    print(f"  rendered {slot['id']}: {len(paths)} slides → {paths[0].parent}", file=sys.stderr)
    return paths


def load_schedule(p: Path) -> dict:
    with p.open("r", encoding="utf-8") as f:
        return json.load(f)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--schedule", default=str(SCHEDULE_DEFAULT))
    ap.add_argument("--slot", help="Render a single slot by id")
    ap.add_argument("--all", action="store_true", help="Render every carousel slot")
    ap.add_argument("--dry-run", action="store_true", help="Print plan, no render")
    args = ap.parse_args()

    sched_path = Path(args.schedule)
    if not sched_path.exists():
        print(f"Schedule not found: {sched_path}", file=sys.stderr)
        return 2
    sched = load_schedule(sched_path)

    carousel_posts = [p for p in sched.get("posts", []) if p.get("format") == "carousel"]
    targets: list[dict] = []
    if args.slot:
        for p in carousel_posts:
            if p["id"] == args.slot:
                targets.append(p)
                break
        if not targets:
            print(f"slot {args.slot} not found or not format=carousel", file=sys.stderr)
            return 2
    elif args.all:
        targets = carousel_posts
    else:
        print("specify --slot <id> or --all", file=sys.stderr)
        return 2

    for slot in targets:
        print(f"render {slot['id']} (template={slot['template']})", file=sys.stderr)
        if args.dry_run:
            print(f"  DRY: template={slot['template']}", file=sys.stderr)
            continue
        render_slot(slot)

    return 0


if __name__ == "__main__":
    sys.exit(main())
