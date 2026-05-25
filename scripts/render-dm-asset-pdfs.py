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


def build_checklist_pdf(
    slug: str,
    label: str,
    title: str,
    intro: str,
    items: list,
    score_rows: list,
    cta_text: str,
    utm_campaign: str,
) -> Path:
    """Generic 9-vinkje checklist PDF (parameterized version of build_avg_checklist)."""
    out_path = OUT_DIR / f"{slug}.pdf"
    doc = doc_template(out_path)
    styles = make_styles()
    story: list = []

    story.append(Paragraph(label, styles["label"]))
    story.append(Paragraph(title, styles["title"]))
    story.append(Paragraph(intro, styles["body"]))
    story.append(Spacer(1, 8))

    for i, (titel, uitleg) in enumerate(items, 1):
        story.append(Paragraph(f"<b>☐ {i:02d} &nbsp; {titel}</b>", styles["h3"]))
        story.append(Paragraph(uitleg, styles["body"]))

    if score_rows:
        story.append(Spacer(1, 14))
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
    story.append(cta_table(cta_text, EMERALD))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f"<font color='#94A3B8'>aanloopai.nl/demo-inplannen?utm_source=ig-dm&amp;utm_campaign={utm_campaign}</font>",
        styles["body_dim"],
    ))

    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    return out_path


def synth_post(hook, qa=None, steps=None, data_points=None, reveal=None, source=None):
    """Construct synthetic post dict compatible with build_faq/step/data_pdf."""
    return {
        "hook": hook,
        "qa": qa or [],
        "steps": steps or [],
        "data_points": data_points or [],
        "reveal": reveal,
        "source": source or "AANLOOP RESEARCH",
    }


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
        # ===== Hafta-3/4 lead-magnets (12 new) =====
        "emma-roadmap": lambda: build_step_pdf(
            synth_post(
                hook="Emma WhatsApp\n14 dagen tot live",
                steps=[
                    {"title": "Dag 1-2 · Intake + use-case prioritering",
                     "body": "60-min call. Welke 5 vragen krijg je 80% van de tijd? "
                             "Volume per week? Werktijden + hand-off-drempel? Concrete output: 1-pager use-case + KPI."},
                    {"title": "Dag 3 · WhatsApp Business API setup",
                     "body": "Meta Business Manager verify, dedicated nummer, Cloud API tokens, webhook endpoint live. "
                             "Aanloop regelt — jij alleen Meta-verify-mail bevestigen."},
                    {"title": "Dag 4-5 · FAQ-corpus + tone-of-voice",
                     "body": "Jij levert: top-30 vragen + jouw 5 favoriete antwoord-tonen (formeel/informeel/grappig). "
                             "Wij turnen om naar gestructureerde knowledge-base."},
                    {"title": "Dag 6-7 · System-prompt + hard rules",
                     "body": "Definitief gedrag: wat mag Emma WEL doen (info, planning, FAQ), wat NOOIT (medisch/juridisch advies, "
                             "prijs-onderhandeling, refund-belofte). Op 1 A4."},
                    {"title": "Dag 8-9 · Knowledge-base indexing",
                     "body": "Productcatalogus, openingstijden, dieet/allergie-info, retour-policy. "
                             "Vector-search + exact-match hybrid. Update via dashboard zonder code."},
                    {"title": "Dag 10-12 · Test + iteratie",
                     "body": "50 interne testvragen + score 1-5 per antwoord. <4.0 = bijsturen. "
                             "Dan 5 echte klanten beta met monitoring. Edge-cases vastleggen."},
                    {"title": "Dag 13-14 · Go-live + monitoring",
                     "body": "Aankondiging naar bestaande klanten. Eerste 7 dagen: dagelijkse log-review + reactietijd-monitoring. "
                             "Hand-off naar jou bij 'frustratie-signaal' (negatieve toon 2x op rij)."},
                ],
            ),
            slug="emma-roadmap",
            intro="14 dagen van intake-call tot Emma live op WhatsApp. Geen 'we zien wel', "
                  "elke dag heeft een concrete deliverable en wat we van jou nodig hebben.",
            cta_text="Plan een 15-min Emma-intake →",
            utm_campaign="emma",
        ),
        "waarom-uitstel": lambda: build_faq_pdf(
            synth_post(
                hook="Waarom MKB AI uitstelt\n5 echte redenen",
                qa=[
                    {"q": "\"Het is te duur\"",
                     "a": "Werkelijk: angst voor verspilling. Onze cijfers: Lite €49/mnd, Starter €249/mnd, "
                          "ROI gemiddeld 4-8x binnen 90 dagen. Risk-mitigatie: maand-opzegbaar, geen jaarcontract."},
                    {"q": "\"We weten niet welke leverancier we moeten kiezen\"",
                     "a": "Vendor-fatigue. 12+ aanbieders, allemaal pitchen. Counter: vraag elke leverancier 3 concrete cijfers "
                          "(ROI-bewijs, ondersteuning-uren, exit-clausule). 80% valt direct af."},
                    {"q": "\"Onze data is te gevoelig\"",
                     "a": "Vaak terecht — maar oplosbaar. EU-only data-locatie (Frankfurt/Amsterdam), DPA-ondertekend, "
                          "logs 90d auto-delete. AVG-checklist 9 vinkjes — 7+ = veilig live."},
                    {"q": "\"We hebben geen tijd om dit te beheren\"",
                     "a": "Reëel argument. Realiteit: Emma WhatsApp = 30 min/week beheer na week 2. "
                          "Marco AI-receptie = 15 min/week. Geen IT-team nodig — dashboard zelfdienst."},
                    {"q": "\"We willen eerst zien wat anderen doen\"",
                     "a": "Wachters-paradox. 41% van NL MKB die in 2025 wachtte, wisselde in 2026 alsnog leverancier "
                          "(en betaalde 2x switch-kosten). Eerder beginnen = sneller leren, lager risico."},
                ],
            ),
            slug="waarom-uitstel",
            intro="Gebaseerd op 200+ intake-gesprekken met NL MKB. Welke herken je? "
                  "Reden #2 en #5 zien we het meest — beide oplosbaar in 1 audit-call.",
            cta_text="Plan een 15-min audit (gratis, geen pitch) →",
            utm_campaign="ai-duur",
        ),
        "whatsapp-implementatie": lambda: build_step_pdf(
            synth_post(
                hook="WhatsApp Business AI\n7 stappen tot live",
                steps=[
                    {"title": "WhatsApp Business Manager account",
                     "body": "Meta Business Suite → verified company. Belastingnummer + KvK. Duur: 2-3 dagen "
                             "(Meta-review). Vraag verzorging aan Aanloop als je dit niet zelf wilt doen."},
                    {"title": "Dedicated business-nummer",
                     "body": "Geen persoonlijk nummer. Een dedicated nummer (mobiel of landline) voor de bot. "
                             "Kostenpost: €5-15/mnd. Tip: kies een nummer dat 'plakt' (1234, 5555, etc.)."},
                    {"title": "Cloud API access tokens",
                     "body": "System User aanmaken in Business Manager → permanent access token genereren. "
                             "Geen 60-dagen-rotatie zorg. Aanloop regelt op verzoek."},
                    {"title": "Webhook endpoint + verificatie",
                     "body": "Een HTTPS-endpoint dat Meta-payloads ontvangt (Aanloop-hosted of self-hosted). "
                             "X-Hub-Signature-256 verify verplicht. Meta-verify-token random string."},
                    {"title": "Message templates approval",
                     "body": "Outbound buiten 24-uur-venster vereist goedgekeurde templates. "
                             "Categorieën: utility/marketing/auth. Approval-tijd: 2-24u. "
                             "Plan 3-5 templates vooraf."},
                    {"title": "Bot integratie + system-prompt",
                     "body": "Aanloop chatbot-engine of eigen LLM. Hard rules + tone-of-voice + knowledge-base "
                             "(productinfo/FAQ/openingstijden). Hand-off-trigger voor escalatie naar mens."},
                    {"title": "Live + analytics",
                     "body": "Eerste 7 dagen: dagelijkse log-review. KPIs: resolutie-rate, hand-off-rate, "
                             "klanttevredenheid (CSAT). Doel-baseline: 70%+ zelfafhandeling, <8% hand-off."},
                ],
            ),
            slug="whatsapp-implementatie",
            intro="Van 'wat is WhatsApp Business' tot live AI-chatbot in 7 concrete stappen. "
                  "Voor MKB-ondernemers die het zelf willen begrijpen, ook als Aanloop het bouwt.",
            cta_text="Plan een 15-min WhatsApp-implementatie call →",
            utm_campaign="whatsapp",
        ),
        "accountancy-ai-checklist": lambda: build_checklist_pdf(
            slug="accountancy-ai-checklist",
            label="AANLOOP AI · COMPLIANCE CHECKLIST",
            title="AI-readiness voor MKB-accountantskantoor",
            intro="9 vinkjes om te bepalen of je kantoor klaar is voor AI-inzet bij klantenwerk "
                  "(boekhouding, btw-aangifte, jaarrekening). Vink wat je nu al hebt; "
                  "minder dan 5 = audit-call aanbevolen voordat je live gaat met klantdata.",
            items=[
                ("Cliënt-data wordt NOOIT naar publieke LLM gestuurd (ChatGPT/Claude.com)",
                 "Alleen via EU-hosted API met DPA. Geen copy-paste in browser-chat."),
                ("DPA met AI-leverancier ondertekend",
                 "Vermeldt verwerkings-doel + sub-processors + bewaartermijnen + exit-clausule."),
                ("Hard rules: geen autonome btw-/IB-adviezen",
                 "AI mag analyseren + voorstel doen, accountant tekent altijd af. Op 1 A4 vastgelegd."),
                ("Audit-log van AI-output (wie/wat/wanneer)",
                 "Onmisbaar voor NBA-controles + tuchtklachten. Min. 7 jaar bewaartermijn."),
                ("Beroepsaansprakelijkheid-polis dekt AI-fouten",
                 "Veel polissen excluderen 'autonome AI'. Check expliciet of meld bij verzekeraar."),
                ("Klant-informering: cliënten weten dat AI ingezet wordt",
                 "Vermelding in opdrachtbevestiging + privacyverklaring. Opt-out optie aanbieden."),
                ("Train-data herkomst transparant",
                 "Geen 'we weten niet waar het model op getraind is'. Vraag white-paper of model-card."),
                ("Backup-workflow voor AI-downtime",
                 "Wat als de API-leverancier 6 uur plat ligt op deadline-dag? Handmatig escape-plan."),
                ("Continu-evaluatie: maandelijkse output-steekproef",
                 "10 random AI-outputs per maand reviewen op kwaliteit + drift-signalen."),
            ],
            score_rows=[
                [Paragraph("<b>SCORE</b>", make_styles()["body"]),
                 Paragraph("<b>ACTIE</b>", make_styles()["body"])],
                ["8-9 vinkjes", "Klaar voor productie met klantdata. Review elke 6 mnd."],
                ["5-7 vinkjes", "1-2 weken werk + DPA-check, dan live. Geen blocker."],
                ["0-4 vinkjes", "Plan 15-min audit voor risico-inventarisatie voordat klanten merken."],
            ],
            cta_text="Plan een 15-min accountancy-AI audit →",
            utm_campaign="accountancy",
        ),
        "praktijk-ai-flow": lambda: build_step_pdf(
            synth_post(
                hook="Praktijk-AI front-desk\n6-stap flow",
                steps=[
                    {"title": "Inbound triage (binnenkomende vraag)",
                     "body": "AI categoriseert: afspraak / recept-herhaling / klacht-administratief / spoed-medisch / overig. "
                             "Spoed-medisch → direct doorverbinden, AI stopt."},
                    {"title": "Afspraak-flow",
                     "body": "Patient geeft naam + DOB + reden. AI checkt Promedico/Medicom-agenda, biedt 3 slots, "
                             "bevestigt + stuurt SMS-reminder 24u vooraf."},
                    {"title": "Recept-herhaling",
                     "body": "Patient noemt medicijn + dosering. AI verifieert in HIS, signaleert risico-medicatie "
                             "(opioid/benzo), zet herhaling klaar voor arts-akkoord (NIET autonoom)."},
                    {"title": "Klacht-administratief",
                     "body": "Factuur, polis, doorverwijzing. AI lost 80% af met info uit kennisbank, "
                             "rest naar praktijkmanager-mailbox met context-samenvatting."},
                    {"title": "Hand-off naar mens",
                     "body": "Trigger: negatieve toon (frustratie), 2x onbegrepen vraag, "
                             "spoed-keyword (pijn/bloed/benauwd), of patient vraagt expliciet. <15s wachttijd."},
                    {"title": "Audit + verbetering",
                     "body": "Wekelijks: 20 random gesprekken reviewen op flow-correctheid + tone. "
                             "Maandelijks: KPI-rapport (afhandel-rate, hand-off-rate, CSAT, vermeden gesprekken)."},
                ],
            ),
            slug="praktijk-ai-flow",
            intro="Concrete 6-stap front-desk flow voor huisarts/tandarts/fysio. NEN 7510 + AVG-compliant by design. "
                  "Vermijdt de 3 typische fouten: spoed-misclassificatie, recept-autonomie, en geen audit-spoor.",
            cta_text="Plan een 15-min praktijk-AI demo →",
            utm_campaign="praktijk",
        ),
        "nojaar-handover": lambda: build_faq_pdf(
            synth_post(
                hook="Geen jaarcontract\n8 vragen + exit-flow",
                qa=[
                    {"q": "Echt geen jaarcontract — wat staat er dan in?",
                     "a": "Een maand-doorlopende overeenkomst. Opzegtermijn 30 dagen, schriftelijk of via dashboard-knop. "
                          "Geen verlenging, geen escalerende boetes."},
                    {"q": "Wat gebeurt er met mijn data als ik opzeg?",
                     "a": "30 dagen na opzegging: export-package (JSON + PDF) naar je mail. "
                          "60 dagen na opzegging: alle data + logs auto-deleted (audit-log van deletion blijft 7j)."},
                    {"q": "Krijg ik mijn knowledge-base mee?",
                     "a": "Ja. Volledige export in standaard-formaat (Markdown + JSON). "
                          "Importeerbaar in ChatGPT-custom-GPT, Claude Projects, of zelf-hosted LLM."},
                    {"q": "Moet ik vooraf betalen?",
                     "a": "Maand vooraf. Eerste maand inclusief setup (geen extra setup-kosten). "
                          "Bij opzegging: lopende maand voltooien, geen pro-rata refund."},
                    {"q": "Wat als jullie zelf failliet gaan?",
                     "a": "Source-code van bot-runtime + jouw config in escrow bij externe partij. "
                          "Failliet-trigger: 90 dagen voortgezet onder noodbeheer + finale export."},
                    {"q": "Kan ik tijdelijk pauzeren?",
                     "a": "Ja, vanaf 3 mnd. Pauze-modus: bot uit, data behouden, €15/mnd. "
                          "Reactivatie binnen 5 werkdagen. Max pauze-duur: 12 mnd."},
                    {"q": "Hoe is dit anders dan andere AI-leveranciers?",
                     "a": "Branche-standaard is 12-mnd minimum + 2x switch-kosten als je vroegtijdig wil. "
                          "Onze maand-opzegbaar werkt omdat we vertrouwen op productkwaliteit, niet op contract-lock-in."},
                    {"q": "Wat zijn de werkelijke kosten als ik 12 maanden blijf?",
                     "a": "Identiek aan jaarcontract bij concurrent (geen 'maand-premium'). "
                          "Lite: €49 x 12 = €588. Starter: €249 x 12 = €2.988. Geen verborgen escalatie."},
                ],
            ),
            slug="nojaar-handover",
            intro="De 8 vragen die we krijgen als we 'geen jaarcontract' zeggen. Inclusief de exit-flow — "
                  "wat gebeurt er PRECIES als je over 6 maanden opzegt.",
            cta_text="Plan een 15-min vrijblijvende kennismaking →",
            utm_campaign="nojaar",
        ),
        "bouw-faq": lambda: build_faq_pdf(
            synth_post(
                hook="AI in de bouw\n8 v&a voor installateurs + aannemers",
                qa=[
                    {"q": "Werkt AI wel in een sector vol papier + WhatsApp-foto's?",
                     "a": "Ja, juist daarom. AI verwerkt foto's (defect-detectie + bonnetje-OCR), "
                          "WhatsApp-berichten (klacht-routering), en PDF-bestekken (materiaal-extractie)."},
                    {"q": "Wat is de #1 use-case voor MKB-installatie?",
                     "a": "Inbound-WhatsApp triage. 60% van vragen = standaard (offerte-status, planning, factuur). "
                          "AI handelt af, monteur belt alleen voor technisch advies."},
                    {"q": "Hoe gaat AI om met monteurs die geen tijd hebben voor admin?",
                     "a": "Spraakmemo op locatie → AI transcribeert + structureert + zet in projectmanagement-tool. "
                          "Monteur praat, AI typt. Tijdwinst: 30-45 min/dag per monteur."},
                    {"q": "Kunnen we AI inzetten voor offertes?",
                     "a": "Voor 70% van offertes: ja (standaard-werk met materiaal-pricing). "
                          "Complexe maatwerk-projecten: AI maakt concept, je perfectioneert. Tijdwinst: 60%."},
                    {"q": "Wat met de planning + roosteren?",
                     "a": "AI-planner houdt rekening met monteur-skills, reistijd, materiaal-beschikbaarheid, klant-preferenties. "
                          "Integreert met je bestaande tool (Trello/Asana/Werknet/Buildbase)."},
                    {"q": "Veiligheid + V&G-rapportage?",
                     "a": "AI scant V&G-formulieren op compleetheid, signaleert ontbrekende items, "
                          "automatiseert RIE-deelrapportage. NIET autonoom: veiligheidsadvies blijft bij KAM-medewerker."},
                    {"q": "Wat kost dit voor een bouwbedrijf met 8 monteurs?",
                     "a": "Starter-pakket €249/mnd (offerte-bot + WhatsApp triage). "
                          "Premium €549/mnd (+ planning + V&G-scan). ROI: 1 maand bij 6+ monteurs."},
                    {"q": "Werkt dit met onze ERP (Bouw7/Buildbase/AFAS)?",
                     "a": "Ja. Pre-built integraties voor Bouw7, Buildbase, AFAS, Exact. Custom-koppeling 1-week setup. "
                          "Bidirectioneel: AI leest project-data, schrijft updates terug."},
                ],
            ),
            slug="bouw-faq",
            intro="De 8 vragen die we tijdens elke bouw-intake horen. Niet de typische 'AI = magisch'-pitch, "
                  "wel concrete cijfers + voorbeelden uit installatie + aannemerij.",
            cta_text="Plan een 15-min bouw-audit →",
            utm_campaign="bouw",
        ),
        "handover-flow": lambda: build_step_pdf(
            synth_post(
                hook="AI-leverancier-wissel\n7 stappen zonder downtime",
                steps=[
                    {"title": "Inventarisatie huidige setup",
                     "body": "Wat draait er nu? Welke integraties? Welke data-stromen? "
                             "Wat zijn de SLA-verplichtingen? 1-pager met alle dependencies."},
                    {"title": "Knowledge-base export",
                     "body": "Vraag oude leverancier om volledige KB-export (Markdown/JSON). "
                             "Heb je geen export-knop? Dwingbaar via AVG art. 20 (dataportabiliteit)."},
                    {"title": "Parallel-omgeving opzetten",
                     "body": "Nieuwe oplossing draait naast oude. Identieke KB, identieke prompts. "
                             "Test-account-vragen door beide systemen — vergelijk antwoorden."},
                    {"title": "Conversation-flow migratie",
                     "body": "Hand-off-rules, escalation-triggers, tone-of-voice instellingen. "
                             "Niet 1-op-1 copy: kans om problemen die je nu hebt op te lossen."},
                    {"title": "Integratie-cutover plannen",
                     "body": "Webhook, API, CRM-koppeling — switch buiten kantoor-uren. "
                             "Rollback-plan: oude system 7 dagen warm-standby."},
                    {"title": "Soft-launch met 10% verkeer",
                     "body": "Eerste 3 dagen: 10% van inbound naar nieuw systeem. Log + vergelijk met oude. "
                             "Score >4.5/5 → opschalen. <4.0 → bijsturen, niet opschalen."},
                    {"title": "Full-cutover + oude leverancier opzeggen",
                     "body": "100% verkeer naar nieuw. Oude systeem 30 dagen read-only voor audit-toegang. "
                             "Opzegging schriftelijk + bevestigingsmail. Data-deletion bevestiging vragen."},
                ],
            ),
            slug="handover-flow",
            intro="7-stappen om van AI-leverancier te wisselen zonder klant-impact of data-verlies. "
                  "Gebaseerd op 12+ migraties die we hebben begeleid (van ChatGPT-Enterprise, Voiceflow, en custom-builds).",
            cta_text="Plan een 15-min migratie-audit →",
            utm_campaign="handover",
        ),
        "logistiek-faq": lambda: build_faq_pdf(
            synth_post(
                hook="AI in logistiek\n8 v&a voor transport + last-mile",
                qa=[
                    {"q": "Wat is de meest impactvolle AI-use-case voor MKB-transporteur?",
                     "a": "Route-optimalisatie + ETA-communicatie. AI berekent routes (verkeer + tijdsvenster + last), "
                          "stuurt klant automatisch ETA-update + 15-min-window-confirmatie."},
                    {"q": "Werkt AI met ons TMS (Plan & Go / TransIP / Carrierhub)?",
                     "a": "Ja. Pre-built koppeling voor Plan & Go en TransIP. Andere TMS: 1-week custom integratie. "
                          "Bidirectioneel: AI leest planning, schrijft status-updates terug."},
                    {"q": "Hoe verminderen we lege-kilometers?",
                     "a": "AI matched outbound-zending met inbound-mogelijkheid (return-load). "
                          "Bij MKB-transporteur 20+ trucks: 8-15% lege-km reductie binnen 90 dagen."},
                    {"q": "Wat met chauffeur-app + WhatsApp-stortvloed?",
                     "a": "Chauffeur stuurt spraakmemo → AI transcribeert + classifeert (defect/vertraging/extra-stop) → "
                          "planner ziet gestructureerd dashboard ipv 200 WhatsApp-berichten."},
                    {"q": "Hoe gaan we om met dynamische tariefberekening?",
                     "a": "AI berekent kostprijs (kilometers + tijd + brandstof + tol + chauffeur-uren) per rit, "
                          "vergelijkt met tarief, signaleert verlies-ritten. Onmisbaar bij brokerage."},
                    {"q": "Customs-papieren + douane-classificatie?",
                     "a": "AI extractie uit factuur + paklijst → HS-code suggestie + EX-A draft. "
                          "NIET autonoom: douane-expediteur tekent altijd af. Tijdwinst: 60% per zending."},
                    {"q": "Track & trace voor B2B-klanten?",
                     "a": "AI-portal genereert klant-specifieke track-link + push-notificatie bij milestone (laden/onderweg/levering). "
                          "Vermindert 'waar is mijn zending'-calls met 70%."},
                    {"q": "Wat zijn de kosten voor 15-truck transporteur?",
                     "a": "Starter €249/mnd (klantcommunicatie + ETA-updates). "
                          "Logistiek-pakket €549/mnd (+ route-optimalisatie + chauffeur-app + customs-draft). "
                          "ROI: 2-3 mnd via lege-km-reductie."},
                ],
            ),
            slug="logistiek-faq",
            intro="De 8 vragen die we tijdens elke logistiek-intake horen. Transport, distributie, last-mile, customs — "
                  "concrete cijfers per use-case in plaats van 'AI = optimalisatie'-pitch.",
            cta_text="Plan een 15-min logistiek-audit →",
            utm_campaign="logistiek",
        ),
        "kennisbank-quick-start": lambda: build_step_pdf(
            synth_post(
                hook="Aanloop Kennisbank\n5-stap snelstart",
                steps=[
                    {"title": "Pillar-pagina's eerst",
                     "body": "Begin bij de 5 pillars: AI voor MKB, WhatsApp-AI (Emma), Telefonie-AI (Marco), "
                             "AVG + AI-compliance, Kosten + ROI. Elke pillar = 3000-5000 woorden compleet overzicht."},
                    {"title": "Sector-pagina's voor jouw branche",
                     "body": "13 sectoren gecovered: horeca, zorg, bouw, retail, logistiek, accountancy, "
                             "praktijk, financieel, vastgoed, automotive, recht, onderwijs, beauty. "
                             "Sector-specifieke use-cases + cases + tarieven."},
                    {"title": "Counter-content (objection-handling)",
                     "body": "6 artikelen voor de 'waarom-niet'-vragen: AI te duur, vendor lock-in, data-privacy, "
                             "AI vs mens, AI faalt, banen-impact. Geen verkoop-tekst, eerlijke trade-offs."},
                    {"title": "Onderzoek + benchmarks",
                     "body": "AI Adoption MKB Nederland 2026 (eigen onderzoek, 1.247 respondenten). "
                             "Sector-benchmarks, ROI-percentielen, leverancier-tevredenheid. Bronnen + methodologie transparant."},
                    {"title": "Cases + concrete voorbeelden",
                     "body": "Echte klant-cases met cijfers (NDA-anoniem waar nodig). "
                             "Filter op sector + use-case + bedrijfsgrootte. Inclusief 'wat ging er fout' learnings."},
                ],
            ),
            slug="kennisbank-quick-start",
            intro="Wat zoek je het eerst? Aanloop Kennisbank heeft 200+ pagina's — deze 5 stappen helpen je sneller bij de "
                  "juiste artikel voor jouw situatie. Direct online: aanloopai.nl/kennisbank/",
            cta_text="Bekijk kennisbank direct →",
            utm_campaign="kennisbank",
        ),
        "retro-2026-rapport": lambda: build_data_pdf(
            synth_post(
                hook="NL MKB AI 2026\n6 cijfer retrospectief",
                data_points=[
                    {"label": "MKB-ondernemers die AI minstens 1x/week inzet",
                     "value": "62", "unit": "%",
                     "note": "Tov 28% in 2024. Bron: Aanloop AI Adoption survey 1.247 respondenten."},
                    {"label": "Wisselen van AI-leverancier binnen 12 mnd",
                     "value": "41", "unit": "%",
                     "note": "Top redenen: prijs (38%), onbetrouwbare uptime (29%), te dure switch-kosten (22%)."},
                    {"label": "Gerealiseerde ROI op AI-investering",
                     "value": "4.2", "unit": "x",
                     "note": "Mediaan over 1e jaar. Top-kwartiel 8.1x, onderste kwartiel 1.4x. Sector-spread groot."},
                    {"label": "WhatsApp-AI als #1 inbound-kanaal",
                     "value": "73", "unit": "%",
                     "note": "73% van MKB die AI inzet voor klantencontact start met WhatsApp. "
                             "Bel-AI volgt op 24%, web-chat 19%."},
                    {"label": "AI-projecten die in eerste 90 dagen falen",
                     "value": "31", "unit": "%",
                     "note": "Hoofdoorzaken: te brede scope (45%), geen owner intern (28%), data-kwaliteit (22%). "
                             "Cijfer daalt naar 12% bij gefaseerd starten."},
                    {"label": "Bedrijven die hun AI-leverancier zou aanbevelen",
                     "value": "58", "unit": "%",
                     "note": "NPS-equivalent +12. Top-3 NPS-drivers: betrouwbaarheid (35%), ondersteuning (29%), "
                             "transparante prijzen (22%)."},
                ],
                reveal="Patroon: bedrijven met >€500K omzet hebben 2.3x hogere ROI dan <€250K omzet. "
                       "Oorzaak: meer use-case-volume per maand → lagere overhead per gebruik.",
                source="AI ADOPTION MKB NL 2026",
            ),
            slug="retro-2026-rapport",
            intro="6 cijfers uit Aanloop's jaarlijkse MKB AI-onderzoek (mei 2026, 1.247 respondenten). "
                  "Volledige methodologie + bronnen op aanloopai.nl/onderzoek/methodologie.",
            cta_text="Bekijk volledig onderzoek + sector-breakdowns →",
            utm_campaign="retro",
        ),
        "faalmodes-checklist": lambda: build_checklist_pdf(
            slug="faalmodes-checklist",
            label="AANLOOP AI · FAALMODES-CHECKLIST",
            title="Top-9 faalmodes AI-projecten",
            intro="De 9 redenen waarom AI-projecten falen in NL MKB, gebaseerd op 80+ klant-implementaties + "
                  "31 leverancier-wissel-cases. Vink wat je geadresseerd hebt; <6 = risico-call aanbevolen.",
            items=[
                ("Scope te breed bij start",
                 "Probeer NIET 'AI voor alles'. Kies 1 use-case (top-volume of top-pijn). "
                 "Uitbreiden NA bewezen ROI in fase 1."),
                ("Geen interne owner (single point-of-contact)",
                 "Iemand met 4u/week budget, beslis-mandaat, en directe lijn naar directie. "
                 "Zonder owner = stuurloos schip binnen 60 dagen."),
                ("Data-kwaliteit niet gecheckt vooraf",
                 "Garbage-in garbage-out. Eerst: 50 random gevallen reviewen op compleet/up-to-date/correct. "
                 "Kwaliteit <80% = eerst data opschonen."),
                ("Geen baseline-meting voor go-live",
                 "Hoeveel calls/week? Wat is huidige afhandel-tijd? CSAT-score? "
                 "Zonder baseline kun je geen ROI bewijzen. Meet 4 weken VOOR start."),
                ("Onrealistische verwachtingen (90%+ automation)",
                 "Realistisch: 60-75% zelfafhandeling in jaar 1. Stijgt naar 80-85% jaar 2 met data-feedback. "
                 "Beloof 'AI doet alles' = teleurstelling gegarandeerd."),
                ("Geen hand-off-flow naar mens",
                 "Wat gebeurt er als AI faalt? Wachtrij? Direct doorverbinden? Mail? "
                 "Beslis VOOR go-live. Slechte hand-off = klant-frustratie 3x sneller."),
                ("Monitoring + iteratie niet ingeregeld",
                 "Dagelijkse log-review week 1, wekelijks week 2-4, maandelijks daarna. "
                 "Geen monitoring = drift onopgemerkt + degradatie."),
                ("AVG/compliance pas na live ingericht",
                 "DPA, data-locatie, bewaartermijnen — VOOR live productie regelen. "
                 "Na live = paniek bij eerste klant-vraag of audit."),
                ("Geen exit-strategie bij leverancier-keuze",
                 "Wat als deze leverancier over 18 mnd niet meer past? Knowledge-base exporteerbaar? "
                 "Geen lock-in clausule = duur switch-pad later."),
            ],
            score_rows=[
                [Paragraph("<b>SCORE</b>", make_styles()["body"]),
                 Paragraph("<b>ACTIE</b>", make_styles()["body"])],
                ["8-9 vinkjes", "Klaar om te starten. 80%+ kans op succesvolle implementatie."],
                ["5-7 vinkjes", "Pak 1-2 ontbrekende items aan voor start. 60% kans op succes anders."],
                ["0-4 vinkjes", "Stop. Plan eerst 15-min risico-call. Anders 50%+ kans op faalmode."],
            ],
            cta_text="Plan een 15-min risico-audit (gratis) →",
            utm_campaign="faalmodes",
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
