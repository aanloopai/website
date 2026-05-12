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
EMERALD = "#047857"

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
    f = font(FONT_REG, 38)
    w, h = text_size(d, "aanloop", f)
    d.text(((SIZE - w) // 2, baseline_y - h), "aanloop", fill=PEARL_DIM, font=f, anchor="lt")


def post_01() -> None:
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)

    f_big = font(FONT_BLACK, 200)
    f_sub = font(FONT_LIGHT, 40)
    _, h_big = text_size(d, "aanloop", f_big)
    _, h_sub = text_size(d, "AI-agents voor Nederlands MKB", f_sub)
    line_thickness = 6
    gap1 = 48
    gap2 = 50
    block_h = h_big + gap1 + line_thickness + gap2 + h_sub
    y = (SIZE - block_h) // 2

    y = draw_centered(d, "aanloop", y, f_big, PEARL)
    y += gap1
    y = draw_line(d, y, 160, INDIGO, line_thickness)
    y += gap2
    draw_centered(d, "AI-agents voor Nederlands MKB", y, f_sub, PEARL)

    img.save(OUT_DIR / "post-01-brand-intro.png", "PNG", optimize=True)


def post_02() -> None:
    img = Image.new("RGB", (SIZE, SIZE), NAVY)
    d = ImageDraw.Draw(img)

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


def main() -> None:
    post_01()
    post_02()
    post_03()
    post_04()
    post_05()
    for p in sorted(OUT_DIR.glob("post-*.png")):
        print(f"{p.name}\t{p.stat().st_size} bytes")


if __name__ == "__main__":
    main()
