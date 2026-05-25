"""Generate Aanloop DM-asset lead-magnet PDFs (reportlab).

Reads carousel content from marketing/instagram/wave-5-schedule.json (qa[],
steps[], data_points[]) and produces brand-strict PDFs to public/dl/<slug>.pdf.

Brand strict: Navy + Pearl + Indigo/Rose/Amber/Emerald + Helvetica (reportlab
default). A4 portrait, 595x842 pt.

PDFs (5):
  - horeca-faq.pdf                 (from w5-c01 qa[])
  - zorg-compliance-checklist.pdf  (from w5-c04 qa[])
  - prompt-framework.pdf           (from w5-c02 steps[])
  - avg-ai-checklist.pdf           (synthetic 9-vinkje checklist)
  - mkb-ai-cijfers-2026.pdf        (from w5-c07 data_points[])

Usage:
    python scripts/render-dm-asset-pdfs.py --all
    python scripts/render-dm-asset-pdfs.py --slug horeca-faq
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER

REPO = Path(__file__).resolve().parent.parent
SCHEDULE_PATH = REPO / "marketing" / "instagram" / "wave-5-schedule.json"
OUT_DIR = REPO / "public" / "dl"
OUT_DIR.mkdir(parents=True, exist_ok=True)

NAVY = colors.HexColor("#0F172A")
PEARL = colors.HexColor("#F1F5F9")
PEARL_DIM = colors.HexColor("#94A3B8")
INDIGO = colors.HexColor("#4338CA")
ROSE = colors.HexColor("#E11D48")
AMBER = colors.HexColor("#D97706")
EMERALD = colors.HexColor("#047857")
BRAND_ACCENTS = [INDIGO, ROSE, AMBER, EMERALD]


def load_schedule() -> dict:
    with SCHEDULE_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def find_post(sched: dict, post_id: str) -> dict:
    for p in sched.get("posts", []):
        if p["id"] == post_id:
            return p
    raise KeyError(f"Post {post_id} not found")


def header_footer(canvas, doc):
    w, h = A4
    strip_y = h - 18 * mm
    strip_total_w = 60 * mm
    strip_w = strip_total_w / 4
    strip_h = 2.5 * mm
    x0 = (w - strip_total_w) / 2
    for i, color in enumerate(BRAND_ACCENTS):
        canvas.setFillColor(color)
        canvas.rect(x0 + i * strip_w, strip_y, strip_w, strip_h, stroke=0, fill=1)

    canvas.setFillColor(PEARL_DIM)
    canvas.setFont("Helvetica", 9)
    canvas.drawCentredString(w / 2, 12 * mm, "aanloop ai · aanloopai.nl")

    canvas.setFillColor(PEARL_DIM)
    canvas.setFont("Helvetica-Bold", 9)
    canvas.drawRightString(w - 20 * mm, h - 12 * mm, f"{doc.page}")


def make_styles() -> dict:
    base = getSampleStyleSheet()
    return {
        "label": ParagraphStyle(
            "label", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=9, textColor=AMBER, spaceAfter=4, leading=11,
        ),
        "title": ParagraphStyle(
            "title", parent=base["Title"], fontName="Helvetica-Bold",
            fontSize=24, textColor=NAVY, alignment=TA_LEFT, spaceAfter=12, leading=28,
        ),
        "h2": ParagraphStyle(
            "h2", parent=base["Heading2"], fontName="Helvetica-Bold",
            fontSize=14, textColor=NAVY, spaceBefore=14, spaceAfter=6, leading=18,
        ),
        "h3": ParagraphStyle(
            "h3", parent=base["Heading3"], fontName="Helvetica-Bold",
            fontSize=11, textColor=INDIGO, spaceBefore=8, spaceAfter=3, leading=14,
        ),
        "body": ParagraphStyle(
            "body", parent=base["Normal"], fontName="Helvetica",
            fontSize=10.5, textColor=NAVY, leading=15, spaceAfter=6,
        ),
        "body_dim": ParagraphStyle(
            "body_dim", parent=base["Normal"], fontName="Helvetica",
            fontSize=10, textColor=colors.HexColor("#475569"), leading=14, spaceAfter=6,
        ),
        "cta_box": ParagraphStyle(
            "cta_box", parent=base["Normal"], fontName="Helvetica-Bold",
            fontSize=12, textColor=colors.white, alignment=TA_CENTER,
            leading=16, spaceAfter=4,
        ),
    }


def doc_template(out_path: Path) -> SimpleDocTemplate:
    return SimpleDocTemplate(
        str(out_path),
        pagesize=A4,
        leftMargin=22 * mm,
        rightMargin=22 * mm,
        topMargin=28 * mm,
        bottomMargin=22 * mm,
        title="Aanloop AI",
        author="Aanloop AI",
    )


def cta_table(text: str, fill_color) -> Table:
    styles = make_styles()
    p = Paragraph(text, styles["cta_box"])
    tbl = Table([[p]], colWidths=[150 * mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), fill_color),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.white),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
    ]))
    return tbl


def build_faq_pdf(post: dict, slug: str, intro: str, cta_text: str, utm_campaign: str) -> Path:
    out_path = OUT_DIR / f"{slug}.pdf"
    doc = doc_template(out_path)
    styles = make_styles()
    story: list = []

    story.append(Paragraph("AANLOOP AI · FAQ", styles["label"]))
    story.append(Paragraph(post["hook"].replace("\n", " — "), styles["title"]))
    story.append(Paragraph(intro, styles["body"]))
    story.append(Spacer(1, 8))

    for i, item in enumerate(post["qa"], 1):
        story.append(Paragraph(f"V{i:02d} &nbsp; {item['q']}", styles["h3"]))
        story.append(Paragraph(item["a"], styles["body"]))

    story.append(Spacer(1, 20))
    story.append(cta_table(cta_text, EMERALD))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f"<font color='#94A3B8'>aanloopai.nl/demo-inplannen?utm_source=ig-dm&amp;utm_campaign={utm_campaign}</font>",
        styles["body_dim"],
    ))

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    return out_path


def build_step_pdf(post: dict, slug: str, intro: str, cta_text: str, utm_campaign: str) -> Path:
    out_path = OUT_DIR / f"{slug}.pdf"
    doc = doc_template(out_path)
    styles = make_styles()
    story: list = []

    story.append(Paragraph("AANLOOP AI · FRAMEWORK", styles["label"]))
    story.append(Paragraph(post["hook"].replace("\n", " "), styles["title"]))
    story.append(Paragraph(intro, styles["body"]))
    story.append(Spacer(1, 8))

    accent_hexes = ["#4338CA", "#E11D48", "#D97706", "#047857"]
    for i, step in enumerate(post["steps"], 1):
        accent = accent_hexes[(i - 1) % 4]
        story.append(Paragraph(
            f"<font color='{accent}' size='14'><b>{i:02d}</b></font> &nbsp; <b>{step['title']}</b>",
            styles["h3"],
        ))
        story.append(Paragraph(step.get("body", ""), styles["body"]))

    story.append(Spacer(1, 20))
    story.append(cta_table(cta_text, EMERALD))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f"<font color='#94A3B8'>aanloopai.nl/demo-inplannen?utm_source=ig-dm&amp;utm_campaign={utm_campaign}</font>",
        styles["body_dim"],
    ))

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    return out_path


def build_data_pdf(post: dict, slug: str, intro: str, cta_text: str, utm_campaign: str) -> Path:
    out_path = OUT_DIR / f"{slug}.pdf"
    doc = doc_template(out_path)
    styles = make_styles()
    story: list = []

    story.append(Paragraph(f"AANLOOP AI · DATA · {post.get('source', '')}", styles["label"]))
    story.append(Paragraph(post["hook"].replace("\n", " "), styles["title"]))
    story.append(Paragraph(intro, styles["body"]))
    story.append(Spacer(1, 8))

    rows = [["#", "Metric", "Waarde", "Bron / Toelichting"]]
    for i, dp in enumerate(post["data_points"], 1):
        rows.append([
            str(i),
            Paragraph(dp["label"], styles["body"]),
            f"{dp['value']}{dp.get('unit', '%')}",
            Paragraph(dp.get("note", ""), styles["body_dim"]),
        ])
    tbl = Table(rows, colWidths=[8 * mm, 55 * mm, 22 * mm, 65 * mm], repeatRows=1)
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(tbl)

    if post.get("reveal"):
        story.append(Spacer(1, 14))
        reveal_box = Table(
            [[Paragraph(f"<b>{post['reveal'].replace(chr(10), ' ')}</b>", styles["body"])]],
            colWidths=[150 * mm],
        )
        reveal_box.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF3C7")),
            ("TEXTCOLOR", (0, 0), (-1, -1), NAVY),
            ("TOPPADDING", (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ]))
        story.append(reveal_box)

    story.append(Spacer(1, 20))
    story.append(cta_table(cta_text, EMERALD))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f"<font color='#94A3B8'>aanloopai.nl/demo-inplannen?utm_source=ig-dm&amp;utm_campaign={utm_campaign}</font>",
        styles["body_dim"],
    ))

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    return out_path


def build_avg_checklist(slug: str) -> Path:
    out_path = OUT_DIR / f"{slug}.pdf"
    doc = doc_template(out_path)
    styles = make_styles()
    story: list = []

    story.append(Paragraph("AANLOOP AI · COMPLIANCE CHECKLIST", styles["label"]))
    story.append(Paragraph("AVG-checklist voor AI in het MKB", styles["title"]))
    story.append(Paragraph(
        "9 vinkjes om te bepalen of je AI-inzet AVG-compliance-houdbaar is. Vink wat je nu al hebt; "
        "alles met meer dan 3 missende vinkjes verdient een 15-min audit voordat je live gaat.",
        styles["body"],
    ))
    story.append(Spacer(1, 8))

    items = [
        ("Verwerkersovereenkomst (DPA) met je AI-leverancier",
         "Ondertekend, met duidelijke verwerkings-doeleinden + bewaartermijnen."),
        ("Data-locatie binnen EU (Frankfurt, Amsterdam, Parijs)",
         "Geen US Cloud Act-risico, geen Schrems II-gat. Vraag explicit naar datacenter-stad."),
        ("Privacyverklaring vermeldt AI-verwerking",
         "Klanten/medewerkers weten dat AI hun gegevens verwerkt. Eenvoudige paragraaf is genoeg."),
        ("Logs + transcripten worden binnen redelijke termijn verwijderd",
         "90 dagen is industry-standard. Langer = expliciet juridisch belang aantonen."),
        ("Betrokkenrechten geregeld (inzage, verwijderen, dataportabiliteit)",
         "Concrete procedure: hoe vraagt een klant inzage? Hoe los je het binnen 30 dagen op?"),
        ("Hard rules / guardrails op de AI-output",
         "AI mag NIET medische / juridische / financiële beslissingen autonoom nemen. Op 1 A4 vastgelegd."),
        ("DPIA (Data Protection Impact Assessment) bij hoog-risico verwerking",
         "Verplicht bij grootschalige automatische beslissingen, gevoelige data, of monitoring."),
        ("Incident-procedure (data-lek meldplicht 72u)",
         "Wie krijgt notificatie, hoe wordt AP geïnformeerd, hoe worden betrokkenen geïnformeerd."),
        ("EU AI Act-classificatie van je AI-systeem (vanaf 2 aug 2026)",
         "Minimaal-risico / beperkt / hoog / verboden. Voor MKB-chatbots meestal 'beperkt risico'."),
    ]
    for i, (titel, uitleg) in enumerate(items, 1):
        story.append(Paragraph(f"<b>☐ {i:02d} &nbsp; {titel}</b>", styles["h3"]))
        story.append(Paragraph(uitleg, styles["body"]))

    story.append(Spacer(1, 14))
    score_rows = [
        [Paragraph("<b>SCORE</b>", styles["body"]),
         Paragraph("<b>ACTIE</b>", styles["body"])],
        ["8-9 vinkjes", "Klaar voor productie. Reviewen elke 6 mnd."],
        ["5-7 vinkjes", "1-2 weken werk, vervolgens live. Geen blocker."],
        ["0-4 vinkjes", "Plan een 15-min audit voor risico-inventarisatie."],
    ]
    score_box = Table(score_rows, colWidths=[35 * mm, 115 * mm])
    score_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(score_box)

    story.append(Spacer(1, 20))
    story.append(cta_table("Plan een gratis 15-min AVG-AI audit →", EMERALD))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "<font color='#94A3B8'>aanloopai.nl/demo-inplannen?utm_source=ig-dm&amp;utm_campaign=avg</font>",
        styles["body_dim"],
    ))

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    return out_path


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--slug", help="Render single PDF by slug")
    args = ap.parse_args()

    sched = load_schedule()

    targets = {
        "horeca-faq": lambda: build_faq_pdf(
            find_post(sched, "w5-c01-faq-horeca-no-show"),
            slug="horeca-faq",
            intro="De 8 vragen die we tijdens elke horeca-intake horen — eerlijk beantwoord. "
                  "Geen verkoop-PDF, gewoon wat werkt op de vloer.",
            cta_text="Plan een 15-min horeca-audit met Marco-demo →",
            utm_campaign="horeca",
        ),
        "zorg-compliance-checklist": lambda: build_faq_pdf(
            find_post(sched, "w5-c04-faq-zorg-nen7510"),
            slug="zorg-compliance-checklist",
            intro="AI in de zorg vraagt 3 lagen compliance: AVG, NEN 7510, en verwerkersovereenkomst. "
                  "Onderstaande 8 vragen + antwoorden geven je Functionaris Gegevensbescherming een "
                  "concreet beslis-document.",
            cta_text="Plan een 15-min zorg-audit (NEN 7510 + AVG) →",
            utm_campaign="zorg",
        ),
        "prompt-framework": lambda: build_step_pdf(
            find_post(sched, "w5-c02-step-prompt-rules"),
            slug="prompt-framework",
            intro="7 regels die je AI-output direct 2x scherper maken. Geen prompt-engineering goeroe, "
                  "gewoon wat werkt voor MKB-use-cases.",
            cta_text="Plan een 15-min AI-readiness audit →",
            utm_campaign="prompt",
        ),
        "avg-ai-checklist": lambda: build_avg_checklist("avg-ai-checklist"),
        "mkb-ai-cijfers-2026": lambda: build_data_pdf(
            find_post(sched, "w5-c07-data-viz-mkb-stats"),
            slug="mkb-ai-cijfers-2026",
            intro="5 cijfers over NL MKB + AI in 2026, gevalideerd op CBS, KvK en Salesforce data. "
                  "Bronnen achter elke regel zodat je accountant of MT-team het na kan lezen.",
            cta_text="Plan een gratis ROI-berekening voor jouw situatie →",
            utm_campaign="cijfers",
        ),
    }

    slugs = [args.slug] if args.slug else list(targets) if args.all else []
    if not slugs:
        print("specify --all or --slug <name>", file=sys.stderr)
        print(f"Available: {', '.join(targets)}", file=sys.stderr)
        return 2

    for slug in slugs:
        if slug not in targets:
            print(f"Unknown slug: {slug}", file=sys.stderr)
            continue
        out_path = targets[slug]()
        size_kb = out_path.stat().st_size / 1024
        print(f"  rendered {slug}.pdf ({size_kb:.1f} KB) -> {out_path}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
