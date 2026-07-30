"""Render aanloop Instagram photo posts with brand-perfect typography (Pillow)."""
from __future__ import annotations

import os
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

# Env-overridable zodat rendering ook op Linux/CI werkt (zoals render-ig-carousel.py).
FONT_REG = os.environ.get("POSTS_FONT_REG", r"C:\Windows\Fonts\segoeuib.ttf")
FONT_BLACK = os.environ.get("POSTS_FONT_BLACK", r"C:\Windows\Fonts\seguibl.ttf")
FONT_LIGHT = os.environ.get("POSTS_FONT_LIGHT", r"C:\Windows\Fonts\segoeui.ttf")


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
    """Wave 2.3 — Brand stance (company-voice, geen persoonlijke attribution)."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    f_label = font(FONT_REG, 26)
    draw_centered(d, "AANLOOP AI  ·  TRANSPARANT MKB-AI", 260, f_label, PEARL_DIM)

    f_quote = font(FONT_BLACK, 110)
    quote_lines = [
        "Geen vendor",
        "lock-in.",
        "Open",
        "architectuur.",
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


def post_11_eu_data() -> None:
    """Wave 3.1 — EU data sovereignty + AVG-conform."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    f_label = font(FONT_REG, 26)
    draw_centered(d, "JOUW DATA  -  EU-SERVERS  -  AVG", 260, f_label, PEARL_DIM)

    f_huge = font(FONT_BLACK, 280)
    line_thickness = 6
    gap1 = 60
    gap2 = 55

    y = 340
    y = draw_centered(d, "100%", y, f_huge, PEARL)
    y += gap1
    y = draw_line(d, y, 220, EMERALD, line_thickness)
    y += gap2

    f_sub = font(FONT_LIGHT, 44)
    lines = ["EU-data sovereignty.", "Geen export, geen lock-in."]
    _, h_line = text_size(d, lines[0], f_sub)
    line_spacing = 16
    for ln in lines:
        y = draw_centered(d, ln, y, f_sub, PEARL)
        y += line_spacing

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "post-11-eu-data.png", "PNG", optimize=True)


def post_12_cost_compare() -> None:
    """Wave 3.2 — Cost compare: human telefonist vs Marco."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    f_label = font(FONT_REG, 26)
    draw_centered(d, "KOSTENVERGELIJKING  -  PER MAAND", 260, f_label, PEARL_DIM)

    f_big = font(FONT_BLACK, 150)
    f_small = font(FONT_LIGHT, 38)

    label_y = 360
    draw_centered(d, "Telefonist", label_y, f_small, PEARL_DIM)
    y_human = label_y + 60
    draw_centered(d, "EUR 3.500", y_human, f_big, ROSE)

    mid_y = y_human + 200
    line_thickness = 6
    draw_line(d, mid_y, 200, AMBER, line_thickness)

    draw_centered(d, "Marco AI-agent", mid_y + 60, f_small, PEARL_DIM)
    y_marco = mid_y + 120
    draw_centered(d, "EUR 597", y_marco, f_big, EMERALD)

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "post-12-cost-compare.png", "PNG", optimize=True)


def post_13_seven_days() -> None:
    """Wave 3.3 — 7 dagen tot live."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    f_label = font(FONT_REG, 26)
    draw_centered(d, "VAN INTAKE TOT PRODUCTIE", 260, f_label, PEARL_DIM)

    f_huge = font(FONT_BLACK, 380)
    line_thickness = 6
    gap1 = 70
    gap2 = 60

    y = 340
    y = draw_centered(d, "7", y, f_huge, PEARL)
    y += gap1
    y = draw_line(d, y, 200, INDIGO, line_thickness)
    y += gap2

    f_sub = font(FONT_LIGHT, 46)
    lines = ["dagen tot een live", "AI-agent in jouw bedrijf"]
    _, h_line = text_size(d, lines[0], f_sub)
    line_spacing = 16
    for ln in lines:
        y = draw_centered(d, ln, y, f_sub, PEARL)
        y += line_spacing

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "post-13-seven-days.png", "PNG", optimize=True)


def post_14_starter_groei() -> None:
    """Wave 3.4 — Tarieven Starter / Groei transparant."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    f_label = font(FONT_REG, 26)
    draw_centered(d, "TRANSPARANTE TARIEVEN  -  PER MAAND", 260, f_label, PEARL_DIM)

    f_pkg = font(FONT_BLACK, 96)
    f_price = font(FONT_BLACK, 140)

    y = 360
    draw_centered(d, "STARTER", y, f_pkg, PEARL_DIM)
    draw_centered(d, "EUR 597", y + 110, f_price, EMERALD)

    line_thickness = 6
    draw_line(d, y + 290, 220, AMBER, line_thickness)

    y2 = y + 360
    draw_centered(d, "GROEI", y2, f_pkg, PEARL_DIM)
    draw_centered(d, "EUR 1.197", y2 + 110, f_price, INDIGO)

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "post-14-starter-groei.png", "PNG", optimize=True)


def post_15_whatsapp_67() -> None:
    """Wave 3.5 — WhatsApp 67% statistic."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    f_label = font(FONT_REG, 26)
    draw_centered(d, "WHATSAPP  -  NEDERLANDSE CONSUMENT", 260, f_label, PEARL_DIM)

    f_huge = font(FONT_BLACK, 360)
    line_thickness = 6
    gap1 = 70
    gap2 = 60

    y = 340
    y = draw_centered(d, "67%", y, f_huge, PEARL)
    y += gap1
    y = draw_line(d, y, 220, EMERALD, line_thickness)
    y += gap2

    f_sub = font(FONT_LIGHT, 42)
    lines = ["verwacht antwoord", "binnen 1 uur"]
    _, h_line = text_size(d, lines[0], f_sub)
    line_spacing = 16
    for ln in lines:
        y = draw_centered(d, ln, y, f_sub, PEARL)
        y += line_spacing

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "post-15-whatsapp-67.png", "PNG", optimize=True)


def post_geo_01() -> None:
    """GEO Wave — De verschuiving: klant zoekt nu bij AI."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    draw_centered(d, "AI-VINDBAARHEID  ·  GEO", 250, font(FONT_REG, 26), PEARL_DIM)

    f_big = font(FONT_BLACK, 130)
    lines = ["Je klant", "Googelt", "niet meer."]
    _, h_line = text_size(d, lines[0], f_big)
    line_spacing = 8
    block_h = len(lines) * h_line + (len(lines) - 1) * line_spacing
    y = (SIZE - block_h) // 2 - 40
    for ln in lines:
        y = draw_centered(d, ln, y, f_big, PEARL)
        y += line_spacing
    y += 36
    y = draw_line(d, y, 200, ROSE, 6)
    y += 46
    draw_centered(d, "Hij vraagt het nu aan AI.", y, font(FONT_LIGHT, 44), PEARL)

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "geo-01-verschuiving.png", "PNG", optimize=True)


def post_geo_02() -> None:
    """GEO Wave — De inzet: bij AI bestaat geen pagina 2."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    draw_centered(d, "AI-ZOEKEN  ·  DE INZET", 250, font(FONT_REG, 26), PEARL_DIM)

    f_top = font(FONT_BLACK, 86)
    f_bot = font(FONT_BLACK, 96)
    y = 360
    for ln in ["Bij Google had", "je pagina 2."]:
        y = draw_centered(d, ln, y, f_top, PEARL_DIM)
        y += 8
    y += 44
    y = draw_line(d, y, 200, ROSE, 6)
    y += 50
    for ln in ["Bij AI bestaat", "geen pagina 2."]:
        y = draw_centered(d, ln, y, f_bot, PEARL)
        y += 8

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "geo-02-geen-pagina-2.png", "PNG", optimize=True)


def post_geo_03() -> None:
    """GEO Wave — Het mechanisme: hoe AI kiest wie hij noemt."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    draw_centered(d, "AI-VINDBAARHEID  ·  3 FACTOREN", 250, font(FONT_REG, 26), PEARL_DIM)

    f_title = font(FONT_BLACK, 88)
    y = 360
    for ln in ["Hoe kiest AI", "wie hij noemt?"]:
        y = draw_centered(d, ln, y, f_title, PEARL)
        y += 8
    y += 30
    y = draw_line(d, y, 160, INDIGO, 6)
    y += 70

    f_item = font(FONT_LIGHT, 42)
    for it in [
        "Consistente info overal",
        "Vertrouwen: reviews & bronnen",
        "Structuur die AI kan lezen",
    ]:
        y = _draw_subtitle_with_dot(d, it, y, f_item)
        y += 56

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "geo-03-hoe-kiest-ai.png", "PNG", optimize=True)


def post_geo_05() -> None:
    """GEO Wave — De oplossing: word gevonden door AI."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    draw_centered(d, "AANLOOP AI  ·  AI-VINDBAARHEID", 250, font(FONT_REG, 26), PEARL_DIM)

    f_big = font(FONT_BLACK, 124)
    lines = ["Word gevonden", "door AI."]
    _, h_line = text_size(d, lines[0], f_big)
    block_h = len(lines) * h_line + 8
    y = (SIZE - block_h) // 2 - 60
    for ln in lines:
        y = draw_centered(d, ln, y, f_big, PEARL)
        y += 8
    y += 40
    y = draw_line(d, y, 200, EMERALD, 6)
    y += 50
    f_sub = font(FONT_LIGHT, 42)
    for ln in ["ChatGPT, Gemini en Claude", "noemen jouw bedrijf."]:
        y = draw_centered(d, ln, y, f_sub, PEARL)
        y += 14

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "geo-05-word-gevonden.png", "PNG", optimize=True)


def post_wave8_01_tijd_tekort() -> None:
    """Wave 8.1 — Hook: tijd verloren aan repetitief werk."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    draw_centered(d, "AANLOOP AI  ·  TIJD TERUGWINNEN", 250, font(FONT_REG, 26), PEARL_DIM)

    f_big = font(FONT_BLACK, 110)
    lines = ["Hoeveel uur", "verlies jij", "deze week?"]
    _, h_line = text_size(d, lines[0], f_big)
    line_spacing = 8
    block_h = len(lines) * h_line + (len(lines) - 1) * line_spacing
    y = (SIZE - block_h) // 2 - 40
    for ln in lines:
        y = draw_centered(d, ln, y, f_big, PEARL)
        y += line_spacing
    y += 36
    y = draw_line(d, y, 200, ROSE, 6)
    y += 46
    draw_centered(d, "Aan bellen, agenda's en WhatsApp.", y, font(FONT_LIGHT, 38), PEARL)

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "wave8-01-tijd-tekort.png", "PNG", optimize=True)


def post_wave8_02_agenda_assistent() -> None:
    """Wave 8.2 — Feature: AI agenda-assistent."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    draw_centered(d, "AI-AGENDA-ASSISTENT", 250, font(FONT_REG, 26), PEARL_DIM)

    f_big = font(FONT_BLACK, 120)
    lines = ["Agenda vol.", "Zonder gedoe."]
    _, h_line = text_size(d, lines[0], f_big)
    line_spacing = 10
    block_h = len(lines) * h_line + (len(lines) - 1) * line_spacing
    y = (SIZE - block_h) // 2 - 40
    for ln in lines:
        y = draw_centered(d, ln, y, f_big, PEARL)
        y += line_spacing
    y += 40
    y = draw_line(d, y, 200, INDIGO, 6)
    y += 50
    f_sub = font(FONT_LIGHT, 40)
    for ln in ["Plant, bevestigt en herinnert", "automatisch — geen heen-en-weer mail."]:
        y = draw_centered(d, ln, y, f_sub, PEARL)
        y += 14

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "wave8-02-agenda-assistent.png", "PNG", optimize=True)


def post_wave8_03_voice_agent() -> None:
    """Wave 8.3 — Feature: AI voice-agent / telefonie."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    draw_centered(d, "AI-TELEFONIE  ·  VOICE-AGENT", 250, font(FONT_REG, 26), PEARL_DIM)

    _draw_waveform(d, SIZE // 2, 470)

    f_big = font(FONT_BLACK, 100)
    y = 620
    for ln in ["Elke oproep", "opgenomen. 24/7."]:
        y = draw_centered(d, ln, y, f_big, PEARL)
        y += 8
    y += 30
    y = draw_line(d, y, 200, EMERALD, 6)
    y += 46
    draw_centered(d, "In het Nederlands. Ook na sluitingstijd.", y, font(FONT_LIGHT, 38), PEARL)

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "wave8-03-voice-agent.png", "PNG", optimize=True)


def post_wave8_04_whatsapp_bot() -> None:
    """Wave 8.4 — Feature: AI WhatsApp-bot."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    draw_centered(d, "AI-WHATSAPP-BOT", 250, font(FONT_REG, 26), PEARL_DIM)

    _draw_chat_bubble(d, SIZE // 2 - 120, 460, 360, 150, tail_left=True)
    _draw_chat_bubble(d, SIZE // 2 + 120, 600, 360, 150, tail_left=False)

    f_big = font(FONT_BLACK, 92)
    y = 780
    for ln in ["Direct antwoord.", "Ook om 23:00."]:
        y = draw_centered(d, ln, y, f_big, PEARL)
        y += 8

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "wave8-04-whatsapp-bot.png", "PNG", optimize=True)


def post_wave8_05_ai_scan() -> None:
    """Wave 8.5 — Proof: gratis AI-scan (vindbaarheid + gemiste omzet)."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    draw_centered(d, "GRATIS AI-SCAN  ·  AANLOOPAI.NL", 250, font(FONT_REG, 26), PEARL_DIM)

    f_big = font(FONT_BLACK, 110)
    lines = ["Waar loop jij", "omzet mis?"]
    _, h_line = text_size(d, lines[0], f_big)
    line_spacing = 10
    block_h = len(lines) * h_line + (len(lines) - 1) * line_spacing
    y = (SIZE - block_h) // 2 - 40
    for ln in lines:
        y = draw_centered(d, ln, y, f_big, PEARL)
        y += line_spacing
    y += 40
    y = draw_line(d, y, 200, AMBER, 6)
    y += 50
    f_sub = font(FONT_LIGHT, 40)
    for ln in ["60 seconden. Gratis.", "Zie precies wat een AI-agent oplevert."]:
        y = draw_centered(d, ln, y, f_sub, PEARL)
        y += 14

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "wave8-05-ai-scan.png", "PNG", optimize=True)


def post_wave8_06_cta() -> None:
    """Wave 8.6 — CTA: vraag je gratis AI-scan aan."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    draw_centered(d, "AANLOOP AI  ·  AAN DE SLAG", 250, font(FONT_REG, 26), PEARL_DIM)

    f_big = font(FONT_BLACK, 108)
    lines = ["Vraag je", "gratis AI-scan", "aan."]
    _, h_line = text_size(d, lines[0], f_big)
    line_spacing = 8
    block_h = len(lines) * h_line + (len(lines) - 1) * line_spacing
    y = (SIZE - block_h) // 2 - 40
    for ln in lines:
        y = draw_centered(d, ln, y, f_big, PEARL)
        y += line_spacing
    y += 36
    y = draw_line(d, y, 200, INDIGO, 6)
    y += 46
    draw_centered(d, "DM 'AI' of aanloopai.nl/gratis-ai-scan", y, font(FONT_LIGHT, 34), PEARL)

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "wave8-06-cta-gratis-scan.png", "PNG", optimize=True)


def post_wave9_02_gemiste_oproepen() -> None:
    """Wave 9.2 — Hook: ochtendpiek, drie gemiste oproepen voor 9 uur."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    draw_centered(d, "AI-TELEFONIE  ·  OCHTENDPIEK", 250, font(FONT_REG, 26), PEARL_DIM)

    f_big = font(FONT_BLACK, 112)
    lines = ["3 gemiste", "oproepen.", "Voor 9 uur."]
    _, h_line = text_size(d, lines[0], f_big)
    line_spacing = 8
    block_h = len(lines) * h_line + (len(lines) - 1) * line_spacing
    y = (SIZE - block_h) // 2 - 40
    for ln in lines:
        y = draw_centered(d, ln, y, f_big, PEARL)
        y += line_spacing
    y += 36
    y = draw_line(d, y, 200, ROSE, 6)
    y += 46
    draw_centered(d, "Marco neemt ze alle drie tegelijk aan.", y, font(FONT_LIGHT, 36), PEARL)

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "wave9-02-gemiste-oproepen.png", "PNG", optimize=True)


def post_wave9_04_avond_piek() -> None:
    """Wave 9.4 — Hook: avonduren zijn piekmoment voor klantvragen."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    draw_centered(d, "AI-KLANTENSERVICE  ·  AVONDUREN", 250, font(FONT_REG, 26), PEARL_DIM)

    f_big = font(FONT_BLACK, 100)
    lines = ["17:03.", "Jij sluit af.", "Klant begint net."]
    _, h_line = text_size(d, lines[0], f_big)
    line_spacing = 8
    block_h = len(lines) * h_line + (len(lines) - 1) * line_spacing
    y = (SIZE - block_h) // 2 - 40
    for ln in lines:
        y = draw_centered(d, ln, y, f_big, PEARL)
        y += line_spacing
    y += 36
    y = draw_line(d, y, 200, AMBER, 6)
    y += 46
    draw_centered(d, "Emma blijft online. Ook nu.", y, font(FONT_LIGHT, 38), PEARL)

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "wave9-04-avond-piek.png", "PNG", optimize=True)


def post_wave9_06_founder_pov() -> None:
    """Wave 9.6 — Founder-POV: transparantie, geen magie."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    draw_centered(d, "AANLOOP AI  ·  EERLIJK VERHAAL", 250, font(FONT_REG, 26), PEARL_DIM)

    f_big = font(FONT_BLACK, 104)
    lines = ["Geen magie.", "Wel minder", "repetitief werk."]
    _, h_line = text_size(d, lines[0], f_big)
    line_spacing = 8
    block_h = len(lines) * h_line + (len(lines) - 1) * line_spacing
    y = (SIZE - block_h) // 2 - 40
    for ln in lines:
        y = draw_centered(d, ln, y, f_big, PEARL)
        y += line_spacing
    y += 36
    y = draw_line(d, y, 200, INDIGO, 6)
    y += 46
    draw_centered(d, "Transparante tarieven. Geen kleine lettertjes.", y, font(FONT_LIGHT, 34), PEARL)

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "wave9-06-founder-pov.png", "PNG", optimize=True)


def post_wave9_08_horeca_vrijdag() -> None:
    """Wave 9.8 — Sector deep: horeca vrijdagavond, Marco neemt reservering aan."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    draw_centered(d, "MARCO  ·  HORECA VRIJDAGAVOND", 250, font(FONT_REG, 26), PEARL_DIM)

    f_big = font(FONT_BLACK, 100)
    lines = ["Vrijdag 19:30.", "Volle zaak.", "Telefoon weer."]
    _, h_line = text_size(d, lines[0], f_big)
    line_spacing = 8
    block_h = len(lines) * h_line + (len(lines) - 1) * line_spacing
    y = (SIZE - block_h) // 2 - 40
    for ln in lines:
        y = draw_centered(d, ln, y, f_big, PEARL)
        y += line_spacing
    y += 36
    y = draw_line(d, y, 200, EMERALD, 6)
    y += 46
    draw_centered(d, "Marco neemt de reservering aan.", y, font(FONT_LIGHT, 38), PEARL)

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "wave9-08-horeca-vrijdag.png", "PNG", optimize=True)


def post_wave9_10_wrap_cta() -> None:
    """Wave 9.10 — Wrap + CTA: twee weken lieten we het zien, nu jij."""
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)
    draw_brand_signature_top(d)

    draw_centered(d, "AANLOOP AI  ·  JOUW BEURT", 250, font(FONT_REG, 26), PEARL_DIM)

    f_big = font(FONT_BLACK, 100)
    lines = ["Twee weken", "lieten we het", "zien. Nu jij."]
    _, h_line = text_size(d, lines[0], f_big)
    line_spacing = 8
    block_h = len(lines) * h_line + (len(lines) - 1) * line_spacing
    y = (SIZE - block_h) // 2 - 40
    for ln in lines:
        y = draw_centered(d, ln, y, f_big, PEARL)
        y += line_spacing
    y += 36
    y = draw_line(d, y, 200, ROSE, 6)
    y += 46
    draw_centered(d, "DM 'AI' voor je gratis AI-scan", y, font(FONT_LIGHT, 34), PEARL)

    draw_wordmark(d, SIZE - 60)
    img.save(OUT_DIR / "wave9-10-wrap-cta.png", "PNG", optimize=True)


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
    post_11_eu_data()
    post_12_cost_compare()
    post_13_seven_days()
    post_14_starter_groei()
    post_15_whatsapp_67()
    post_geo_01()
    post_geo_02()
    post_geo_03()
    post_geo_05()
    post_wave8_01_tijd_tekort()
    post_wave8_02_agenda_assistent()
    post_wave8_03_voice_agent()
    post_wave8_04_whatsapp_bot()
    post_wave8_05_ai_scan()
    post_wave8_06_cta()
    post_wave9_02_gemiste_oproepen()
    post_wave9_04_avond_piek()
    post_wave9_06_founder_pov()
    post_wave9_08_horeca_vrijdag()
    post_wave9_10_wrap_cta()
    for p in sorted(OUT_DIR.glob("post-*.png")):
        print(f"{p.name}\t{p.stat().st_size} bytes")
    for p in sorted(OUT_DIR.glob("wave8-*.png")):
        print(f"{p.name}\t{p.stat().st_size} bytes")
    for p in sorted(OUT_DIR.glob("wave9-*.png")):
        print(f"{p.name}\t{p.stat().st_size} bytes")


if __name__ == "__main__":
    main()
