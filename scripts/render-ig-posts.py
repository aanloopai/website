"""Render aanloop Instagram photo posts with brand-perfect typography (Pillow)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "social-feed"
OUT_DIR.mkdir(parents=True, exist_ok=True)

SIZE = 1080
NAVY = "#0F172A"
PEARL = "#F1F5F9"
PEARL_DIM = "#94A3B8"
INDIGO = "#4338CA"
ROSE = "#E11D48"
AMBER = "#D97706"
EMERALD = "#047857"
BRAND_ACCENTS = (INDIGO, ROSE, AMBER, EMERALD)

FONT_REG = r"C:\Windows\Fonts\segoeuib.ttf"
FONT_BLACK = r"C:\Windows\Fonts\seguibl.ttf"
FONT_LIGHT = r"C:\Windows\Fonts\segoeui.ttf"


def font(path: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def text_size(d: ImageDraw.ImageDraw, text: str, f: ImageFont.FreeTypeFont) -> tuple[int, int]:
    """Visible width/height of rendered text (anchor='lt' bbox)."""
    bbox = d.textbbox((0, 0), text, font=f, anchor="lt")
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def draw_centered(d: ImageDraw.ImageDraw, text: str, y: int, f: ImageFont.FreeTypeFont, fill: str) -> int:
    """Draw text horizontally centered at given top-y. Returns y of next line (bottom)."""
    w, h = text_size(d, text, f)
    x = (SIZE - w) // 2
    d.text((x, y), text, fill=fill, font=f, anchor="lt")
    return y + h


def draw_line(d: ImageDraw.ImageDraw, y: int, w: int, fill: str, thickness: int = 6) -> int:
    x0 = (SIZE - w) // 2
    d.rectangle([x0, y, x0 + w, y + thickness], fill=fill)
    return y + thickness


def draw_wordmark(d: ImageDraw.ImageDraw, baseline_y: int) -> None:
    """Footer wordmark 'aanloop ai' (compact, dimmed pearl). Top signature carries huisstijl 4-strip."""
    f = font(FONT_REG, 38)
    text = "aanloop ai"
    w, h = text_size(d, text, f)
    x_text = (SIZE - w) // 2
    y_text = baseline_y - h
    d.text((x_text, y_text), text, fill=PEARL_DIM, font=f, anchor="lt")


def draw_brand_signature_top(d: ImageDraw.ImageDraw, y: int = 70) -> None:
    """Optional brand-signature 4-strip header (small, centered, ties post to huisstijl)."""
    total_w = 280
    strip_w = total_w // 4
    strip_h = 6
    x0_base = (SIZE - total_w) // 2
    for i, color in enumerate(BRAND_ACCENTS):
        x0 = x0_base + i * strip_w
        x1 = x0 + strip_w if i < 3 else x0_base + total_w
        d.rectangle([x0, y, x1, y + strip_h], fill=color)


def post_01() -> None:
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    f_big = font(FONT_BLACK, 170)
    f_sub = font(FONT_LIGHT, 40)
    _, h_big = text_size(d, "aanloop ai", f_big)
    line_thickness = 6
    gap1 = 36
    gap2 = 50
    _, h_sub = text_size(d, "AI-agents voor het Nederlands MKB", f_sub)
    block_h = h_big + gap1 + line_thickness + gap2 + h_sub
    y = (SIZE - block_h) // 2 - 30

    y = draw_centered(d, "aanloop ai", y, f_big, PEARL)
    y += gap1
    strip_total_w = 540
    strip_w = strip_total_w // 4
    x0_base = (SIZE - strip_total_w) // 2
    for i, color in enumerate(BRAND_ACCENTS):
        x0 = x0_base + i * strip_w
        x1 = x0 + strip_w if i < 3 else x0_base + strip_total_w
        d.rectangle([x0, y, x1, y + line_thickness], fill=color)
    y += line_thickness + gap2
    draw_centered(d, "AI-agents voor het Nederlands MKB", y, f_sub, PEARL)

    img.save(OUT_DIR / "post-01-brand-intro.png", "PNG", optimize=True)


def post_02() -> None:
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    f_huge = font(FONT_BLACK, 360)
    f_sub = font(FONT_LIGHT, 46)
    _, h_huge = text_size(d, "80+", f_huge)
    line_thickness = 6
    gap1 = 70
    gap2 = 60
    lines = ["Nederlandse MKB-bedrijven", "vertrouwen op aanloop"]
    line_spacing = 18
    _, h_line = text_size(d, lines[0], f_sub)
    h_sub_total = h_line * 2 + line_spacing

    block_h = h_huge + gap1 + line_thickness + gap2 + h_sub_total
    y = (SIZE - block_h) // 2 - 30

    y = draw_centered(d, "80+", y, f_huge, PEARL)
    y += gap1
    y = draw_line(d, y, 200, INDIGO, line_thickness)
    y += gap2
    for ln in lines:
        y = draw_centered(d, ln, y, f_sub, PEARL)
        y += line_spacing

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "post-02-stat-80plus.png", "PNG", optimize=True)


def _draw_waveform(d: ImageDraw.ImageDraw, cx: int, cy: int) -> None:
    heights = [60, 120, 200, 90, 260, 320, 180, 230, 110, 70]
    bar_w = 28
    gap = 22
    total_w = len(heights) * bar_w + (len(heights) - 1) * gap
    start_x = cx - total_w // 2
    for i, hgt in enumerate(heights):
        x0 = start_x + i * (bar_w + gap)
        x1 = x0 + bar_w
        y0 = cy - hgt // 2
        y1 = cy + hgt // 2
        d.rounded_rectangle([x0, y0, x1, y1], radius=6, fill=PEARL)


def _draw_subtitle_with_dot(d: ImageDraw.ImageDraw, text: str, y: int, f: ImageFont.FreeTypeFont) -> int:
    w, h = text_size(d, text, f)
    x = (SIZE - w) // 2
    dot_r = 7
    dot_cy = y + h // 2
    d.ellipse([x - 30, dot_cy - dot_r, x - 30 + dot_r * 2, dot_cy + dot_r], fill=INDIGO)
    d.text((x, y), text, fill=PEARL, font=f, anchor="lt")
    return y + h


def post_03() -> None:
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    f_label = font(FONT_REG, 26)
    label = "MARCO   —   AI-RECEPTIONISTE"
    draw_centered(d, label, 260, f_label, PEARL_DIM)

    _draw_waveform(d, SIZE // 2, SIZE // 2 + 20)

    f_sub = font(FONT_LIGHT, 38)
    _draw_subtitle_with_dot(d, "Neemt je telefoon op. 24/7. In het Nederlands.", SIZE - 280, f_sub)

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "post-03-marco-receptionist.png", "PNG", optimize=True)


def _draw_chat_bubble(d: ImageDraw.ImageDraw, cx: int, cy: int, w: int, h: int, tail_left: bool) -> None:
    x0, y0 = cx - w // 2, cy - h // 2
    x1, y1 = cx + w // 2, cy + h // 2
    d.rounded_rectangle([x0, y0, x1, y1], radius=28, outline=PEARL, width=5)
    if tail_left:
        a = (x0 + 50, y1 - 2)
        b = (x0 + 20, y1 + 36)
        c = (x0 + 95, y1 - 2)
    else:
        a = (x1 - 50, y1 - 2)
        b = (x1 - 20, y1 + 36)
        c = (x1 - 95, y1 - 2)
    d.polygon([a, b, c], fill=NAVY)
    d.line([a, b], fill=PEARL, width=5)
    d.line([b, c], fill=PEARL, width=5)
    d.line([(min(a[0], c[0]), y1), (max(a[0], c[0]), y1)], fill=NAVY, width=6)


def post_04() -> None:
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    f_label = font(FONT_REG, 26)
    label = "EMMA   —   AI-CHATBOT"
    draw_centered(d, label, 260, f_label, PEARL_DIM)

    _draw_chat_bubble(d, SIZE // 2 - 120, SIZE // 2 - 40, 360, 150, tail_left=True)
    _draw_chat_bubble(d, SIZE // 2 + 120, SIZE // 2 + 100, 360, 150, tail_left=False)

    f_sub = font(FONT_LIGHT, 38)
    _draw_subtitle_with_dot(d, "Beantwoordt klantvragen direct. Op je website.", SIZE - 240, f_sub)

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "post-04-emma-chatbot.png", "PNG", optimize=True)


def post_05() -> None:
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    f_huge = font(FONT_BLACK, 200)
    f_sub = font(FONT_LIGHT, 46)
    _, h_huge = text_size(d, "3–6 mnd", f_huge)
    line_thickness = 6
    gap1 = 70
    gap2 = 60
    lines = ["Gemiddelde terugverdientijd", "van een AI-agent"]
    line_spacing = 18
    _, h_line = text_size(d, lines[0], f_sub)
    h_sub_total = h_line * 2 + line_spacing

    block_h = h_huge + gap1 + line_thickness + gap2 + h_sub_total
    y = (SIZE - block_h) // 2 - 30

    y = draw_centered(d, "3–6 mnd", y, f_huge, PEARL)
    y += gap1
    y = draw_line(d, y, 200, EMERALD, line_thickness)
    y += gap2
    for ln in lines:
        y = draw_centered(d, ln, y, f_sub, PEARL)
        y += line_spacing

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "post-05-roi-3-6-mnd.png", "PNG", optimize=True)


def post_06_eu_ai_act() -> None:
    """Wave 2.1 — EU AI Act 5 stappen MKB."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    f_label = font(FONT_REG, 26)
    draw_centered(d, "EU AI ACT  —  MKB", 260, f_label, PEARL_DIM)

    f_huge = font(FONT_BLACK, 200)
    f_sub = font(FONT_LIGHT, 44)
    _, h_huge = text_size(d, "5 stappen", f_huge)
    line_thickness = 6
    gap1 = 60
    gap2 = 55
    lines = ["om compliant te zijn", "voor 2 augustus 2026"]
    _, h_line = text_size(d, lines[0], f_sub)
    line_spacing = 16

    y = 340
    y = draw_centered(d, "5 stappen", y, f_huge, PEARL)
    y += gap1
    y = draw_line(d, y, 200, ROSE, line_thickness)
    y += gap2
    for ln in lines:
        y = draw_centered(d, ln, y, f_sub, PEARL)
        y += line_spacing

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "post-06-eu-ai-act.png", "PNG", optimize=True)


def post_07_horeca_case() -> None:
    """Wave 2.2 — Horeca case (geanonimiseerd)."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    f_label = font(FONT_REG, 26)
    draw_centered(d, "KLANT  —  HORECA, AMSTERDAM", 260, f_label, PEARL_DIM)

    f_huge = font(FONT_BLACK, 360)
    _, h_huge = text_size(d, "0", f_huge)
    line_thickness = 6
    gap1 = 60
    gap2 = 50

    y = 360
    y = draw_centered(d, "0", y, f_huge, PEARL)
    y += gap1
    y = draw_line(d, y, 200, AMBER, line_thickness)
    y += gap2
    f_sub = font(FONT_LIGHT, 44)
    lines = ["gemiste oproepen", "tijdens de avondservice"]
    _, h_line = text_size(d, lines[0], f_sub)
    line_spacing = 16
    for ln in lines:
        y = draw_centered(d, ln, y, f_sub, PEARL)
        y += line_spacing

    f_after = font(FONT_REG, 28)
    draw_centered(d, "na 60 dagen met Marco", y + 30, f_after, PEARL_DIM)

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "post-07-horeca-case.png", "PNG", optimize=True)


def post_08_founder_pov() -> None:
    """Wave 2.3 — Founder POV (Mustafa stelling, no portrait yet)."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    f_label = font(FONT_REG, 26)
    draw_centered(d, "MUSTAFA  —  FOUNDER · AANLOOP AI", 260, f_label, PEARL_DIM)

    f_quote = font(FONT_BLACK, 110)
    quote_lines = [
        "“Ik accepteer",
        "geen vendor",
        "lock-in.",
        "Jij ook niet.”",
    ]
    _, h_line = text_size(d, quote_lines[0], f_quote)
    line_spacing = 10
    block_h = len(quote_lines) * h_line + (len(quote_lines) - 1) * line_spacing
    y = (SIZE - block_h) // 2 - 30
    for ln in quote_lines:
        y = draw_centered(d, ln, y, f_quote, PEARL)
        y += line_spacing

    y += 30
    line_thickness = 6
    y = draw_line(d, y, 160, INDIGO, line_thickness)

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "post-08-founder-pov.png", "PNG", optimize=True)


def post_09_roi_tool() -> None:
    """Wave 2.4 — ROI-rekentool teaser."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    f_label = font(FONT_REG, 26)
    draw_centered(d, "GRATIS TOOL  —  AANLOOPAI.NL", 260, f_label, PEARL_DIM)

    f_huge = font(FONT_BLACK, 220)
    _, h_huge = text_size(d, "60 sec.", f_huge)
    line_thickness = 6
    gap1 = 60
    gap2 = 50

    y = 380
    y = draw_centered(d, "60 sec.", y, f_huge, PEARL)
    y += gap1
    y = draw_line(d, y, 200, EMERALD, line_thickness)
    y += gap2
    f_sub = font(FONT_LIGHT, 44)
    lines = ["Bereken de ROI", "van een AI-agent"]
    _, h_line = text_size(d, lines[0], f_sub)
    line_spacing = 16
    for ln in lines:
        y = draw_centered(d, ln, y, f_sub, PEARL)
        y += line_spacing

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "post-09-roi-tool.png", "PNG", optimize=True)


def post_10_counter_objection() -> None:
    """Wave 2.5 — Counter-objection 'AI is onbetrouwbaar'."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    f_label = font(FONT_REG, 26)
    draw_centered(d, "BEZWAAR  —  ONTKRACHT", 260, f_label, PEARL_DIM)

    f_obj = font(FONT_BLACK, 70)
    obj_lines = [
        "“Maar AI is",
        "toch onbetrouwbaar?”",
    ]
    _, h_obj = text_size(d, obj_lines[0], f_obj)
    line_spacing_obj = 10
    block_h_obj = len(obj_lines) * h_obj + (len(obj_lines) - 1) * line_spacing_obj
    y = 360
    for ln in obj_lines:
        y = draw_centered(d, ln, y, f_obj, PEARL_DIM)
        y += line_spacing_obj

    y += 50
    line_thickness = 6
    y = draw_line(d, y, 200, ROSE, line_thickness)
    y += 50

    f_answer = font(FONT_BLACK, 64)
    answer_lines = ["Met juiste guardrails", "haalbaar in 14 dagen"]
    _, h_ans = text_size(d, answer_lines[0], f_answer)
    line_spacing_ans = 10
    for ln in answer_lines:
        y = draw_centered(d, ln, y, f_answer, PEARL)
        y += line_spacing_ans

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "post-10-counter-objection.png", "PNG", optimize=True)


def main() -> None:
    post_01()
    post_02()
    post_03()
    post_04()
    post_05()
    post_06_eu_ai_act()
    post_07_horeca_case()
    post_08_founder_pov()
    post_09_roi_tool()
    post_10_counter_objection()
    for p in sorted(OUT_DIR.glob("post-*.png")):
        print(f"{p.name}\t{p.stat().st_size} bytes")


if __name__ == "__main__":
    main()
