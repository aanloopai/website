"""Generate AI images for aanloop NL-MKB scenes using Google Imagen 4
via the Vertex AI / google-genai SDK.

Models supported:
  - imagen-4.0-generate-001         (Imagen 4, best quality)
  - gemini-2.0-flash-preview-image-generation  (Gemini Flash, faster/cheaper)

Outputs PNG files to:
  public/social-feed/ai-images/<scene_id>.png
  public/social-feed/reels/backgrounds/<scene_id>.png  (Ken-Burns backgrounds)

Usage:
  # Generate all NL-MKB scenes
  python scripts/gen-ai-image.py --all

  # Single scene
  python scripts/gen-ai-image.py --scene cafe-eigenaar-bezig

  # Only Ken-Burns reel backgrounds
  python scripts/gen-ai-image.py --kenburns

  # Diversity/inclusion batch
  python scripts/gen-ai-image.py --diversity

  # Use Gemini Flash instead of Imagen 4 (cheaper, faster)
  python scripts/gen-ai-image.py --all --model gemini

Setup:
  pip install google-genai pillow
  export GOOGLE_CLOUD_PROJECT=gen-lang-client-0479672868
  export GOOGLE_CLOUD_LOCATION=us-central1   # or europe-west4
  gcloud auth application-default login
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import sys
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Dirs
# ---------------------------------------------------------------------------
REPO = Path(__file__).resolve().parent.parent
AI_IMAGES_DIR = REPO / "public" / "social-feed" / "ai-images"
KENBURNS_DIR  = REPO / "public" / "social-feed" / "reels" / "backgrounds"
for _d in (AI_IMAGES_DIR, KENBURNS_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Google GenAI client
# ---------------------------------------------------------------------------
# Two backends, selected automatically:
#   - API-key mode (default): GEMINI_API_KEY from env or .env.local. No gcloud,
#     no ADC — just a billing-enabled Google AI Studio key.
#   - Vertex AI mode: set GENAI_BACKEND=vertex (needs gcloud ADC + a GCP project).
PROJECT  = os.environ.get("GOOGLE_CLOUD_PROJECT", "gen-lang-client-0479672868")
LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
BACKEND  = os.environ.get("GENAI_BACKEND", "apikey").lower()

MODEL_IMAGEN = "imagen-4.0-generate-001"
MODEL_GEMINI = "gemini-2.5-flash-image"


def _load_api_key() -> str:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if key:
        return key
    env = REPO / ".env.local"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            if line.strip().startswith("GEMINI_API_KEY="):
                return line.split("=", 1)[1].strip()
    print("ERROR: GEMINI_API_KEY not found (env or .env.local).", file=sys.stderr)
    sys.exit(1)


def _get_client():
    try:
        from google import genai
        from google.genai import types as gtypes
    except ImportError:
        print("ERROR: google-genai not installed. Run: pip install google-genai", file=sys.stderr)
        sys.exit(1)
    if BACKEND == "vertex":
        client = genai.Client(vertexai=True, project=PROJECT, location=LOCATION)
    else:
        client = genai.Client(api_key=_load_api_key())
    return client, gtypes


def generate_image(prompt: str, out_path: Path, model: str = MODEL_IMAGEN,
                   width: int = 1080, height: int = 1080,
                   negative_prompt: str = "") -> Path:
    """Generate one image and save as PNG. Returns the path."""
    if out_path.exists():
        print(f"  cache hit: {out_path.name}", file=sys.stderr)
        return out_path

    client, gtypes = _get_client()
    print(f"  generating: {out_path.name} ({model}) ...", file=sys.stderr)

    if model == MODEL_GEMINI:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=gtypes.GenerateContentConfig(response_modalities=["IMAGE"]),
        )
        for part in response.candidates[0].content.parts:
            if part.inline_data is not None:
                data = part.inline_data.data
                # SDK returns raw bytes; tolerate a base64 str too.
                img_bytes = data if isinstance(data, (bytes, bytearray)) else base64.b64decode(data)
                out_path.write_bytes(img_bytes)
                print(f"  saved: {out_path.name}", file=sys.stderr)
                return out_path
        raise RuntimeError(f"No image in Gemini response for: {out_path.name}")

    else:
        # Imagen 4 path
        aspect = "1:1"
        if width == 1080 and height == 1920:
            aspect = "9:16"
        elif width == 1920 and height == 1080:
            aspect = "16:9"

        cfg_kwargs = dict(
            number_of_images=1,
            output_mime_type="image/png",
            aspect_ratio=aspect,
        )
        # negative_prompt is Vertex-only — the Gemini Developer API rejects it.
        if negative_prompt and BACKEND == "vertex":
            cfg_kwargs["negative_prompt"] = negative_prompt

        response = client.models.generate_images(
            model=model,
            prompt=prompt,
            config=gtypes.GenerateImagesConfig(**cfg_kwargs),
        )
        if response.generated_images:
            img_bytes = response.generated_images[0].image.image_bytes
            out_path.write_bytes(img_bytes)
            print(f"  saved: {out_path.name}", file=sys.stderr)
            return out_path
        raise RuntimeError(f"No image returned for: {out_path.name}")


# ---------------------------------------------------------------------------
# Shared style suffixes
# ---------------------------------------------------------------------------
BRAND_SUFFIX = (
    "Professional photography style. Warm natural lighting. "
    "Dutch small business aesthetic — authentic, approachable, modern. "
    "No text overlays, no watermarks."
)

NEGATIVE = (
    "text, watermark, logo, blurry, low quality, distorted faces, "
    "cartoon, illustration, oversaturated"
)

# ---------------------------------------------------------------------------
# NL-MKB scene definitions
# ---------------------------------------------------------------------------
NL_MKB_SCENES: list[dict] = [

    # ── CAFE / HORECA ────────────────────────────────────────────────────────
    {
        "id": "cafe-eigenaar-bezig",
        "label": "Cafe owner busy at counter",
        "category": "horeca",
        "prompt": (
            "A Dutch cafe owner in their 40s, warm smile, standing behind a "
            "wooden bar counter preparing coffee. Cozy Amsterdam brown cafe "
            "atmosphere, soft morning light through canal-side windows, "
            "artisan cups and a La Marzocco espresso machine visible. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "cafe-avond-drukte",
        "label": "Busy cafe evening service",
        "category": "horeca",
        "prompt": (
            "Interior of a busy Dutch cafe in the evening. Warm amber lighting, "
            "tables full of guests, one staff member taking an order on a tablet. "
            "Brick walls, wooden beams, candles on tables. "
            "Bokeh background with laughter and energy. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "cafe-telefoon-gemist",
        "label": "Phone ringing unanswered on counter",
        "category": "horeca",
        "prompt": (
            "Close-up of a smartphone on a wooden cafe counter, screen lit up "
            "showing an incoming call. Blurred background of a busy restaurant "
            "kitchen through a pass-through window. Shallow depth of field. "
            + BRAND_SUFFIX
        ),
    },

    # ── RECEPTIE / KANTOOR ───────────────────────────────────────────────────
    {
        "id": "receptie-vriendelijk",
        "label": "Friendly receptionist at modern desk",
        "category": "receptie",
        "prompt": (
            "A friendly female Dutch receptionist in her 30s at a clean modern "
            "reception desk with a large monitor, headset nearby. Light, airy "
            "Dutch office interior -- white walls, plants, soft daylight. "
            "Professional but approachable. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "receptie-tablet-overzicht",
        "label": "Receptionist reviewing tablet overview",
        "category": "receptie",
        "prompt": (
            "A Dutch business receptionist looking at a tablet showing an "
            "appointment calendar or dashboard. Modern minimalist office lobby "
            "with glass partition walls, natural light. Clean and efficient feel. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "receptie-lege-balie-avond",
        "label": "Empty reception desk in evening",
        "category": "receptie",
        "prompt": (
            "An empty modern reception desk in the evening -- office lights dimmed, "
            "a ringing phone on the desk, no one present. Conveying missed calls "
            "and the need for 24/7 AI coverage. Dutch corporate office aesthetic. "
            + BRAND_SUFFIX
        ),
    },

    # ── WEBSHOP / E-COMMERCE ─────────────────────────────────────────────────
    {
        "id": "webshop-eigenaar-laptop",
        "label": "Webshop owner at laptop",
        "category": "webshop",
        "prompt": (
            "A Dutch webshop owner in their 30s working on a laptop at a tidy "
            "home-office desk with product boxes visible in the background. "
            "Natural light from a window, a cup of coffee nearby, focused yet "
            "relaxed atmosphere. Small e-commerce business feel. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "webshop-pakket-verzenden",
        "label": "Packing parcels for webshop orders",
        "category": "webshop",
        "prompt": (
            "Close-up hands of a Dutch small business owner packing a cardboard "
            "parcel with brown tape on a wooden table. Printed shipping labels, "
            "bubble wrap, and product boxes softly visible. Warm daylight. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "webshop-klant-chat-desktop",
        "label": "Customer chatting on webshop desktop",
        "category": "webshop",
        "prompt": (
            "Over-the-shoulder view of a Dutch consumer at a desktop computer "
            "browsing a clean e-commerce product page. A chat widget is open in "
            "the bottom-right corner of the screen. Cozy home setting, soft lamp "
            "light. "
            + BRAND_SUFFIX
        ),
    },

    # ── BOUW / VAKMAN ────────────────────────────────────────────────────────
    {
        "id": "vakman-offerte-aanvraag",
        "label": "Tradesman receiving phone enquiry",
        "category": "bouw",
        "prompt": (
            "A Dutch tradesman (plumber or painter) in work clothes outdoors near "
            "a white van, looking at a smartphone screen showing a new message "
            "notification. Residential Dutch street with brick houses in background. "
            + BRAND_SUFFIX
        ),
    },

    # ── DIVERSITEIT ──────────────────────────────────────────────────────────
    {
        "id": "divers-team-mkb",
        "label": "Diverse Dutch SME team",
        "category": "diversity",
        "prompt": (
            "A diverse group of four Dutch small business employees -- different "
            "ethnicities and genders, ages 25-50 -- having a casual standing "
            "meeting in a modern open-plan office. Friendly, collaborative energy. "
            "Natural light, plants, whiteboard in background. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "divers-vrouwelijke-ondernemer",
        "label": "Female entrepreneur at laptop",
        "category": "diversity",
        "prompt": (
            "A confident Dutch female entrepreneur of South-Asian descent in her "
            "30s at a standing desk with a laptop. Modern Dutch office, large "
            "windows with city view, plants, clean Scandinavian aesthetic. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "divers-oudere-eigenaar-ai",
        "label": "Older business owner using AI on tablet",
        "category": "diversity",
        "prompt": (
            "A Dutch business owner in their late 50s, silver hair, using a tablet "
            "in their small retail shop -- looking pleased and confident. "
            "Shelving with products behind, warm shop lighting, authentic Dutch "
            "retail atmosphere. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "divers-multicultureel-klantenservice",
        "label": "Multicultural customer service team",
        "category": "diversity",
        "prompt": (
            "Two Dutch customer service agents -- one woman of Moroccan background "
            "and one man of Surinamese background -- both with headsets on, "
            "smiling at their monitors. Modern open-plan office with soft natural "
            "light, potted plants, inclusive workplace feel. "
            + BRAND_SUFFIX
        ),
    },

    # ── WAVE-6 (2026-06-23+) — new-style narrative scenes ───────────────────
    {
        "id": "w6-p01-horeca-busy-20u",
        "label": "Horeca busy 20:00, phones lighting up",
        "category": "wave6",
        "prompt": (
            "Interior of a busy Dutch restaurant at 20:00 on a Friday evening. "
            "Foreground: a smartphone on the host stand with the screen glowing showing "
            "an incoming call notification. Background: blurred bokeh of full tables, "
            "candles, staff moving fast, warm amber lighting. Tension between human "
            "service moment and the unanswered phone. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "w6-p02-tandarts-spreekkamer",
        "label": "Dentist with patient, assistant on call in background",
        "category": "wave6",
        "prompt": (
            "Clean modern Dutch dental surgery room. Foreground: a friendly female "
            "dentist in white coat, calmly working on a patient. Background (soft blur): "
            "the dental assistant stepping outside the room holding a phone to her ear, "
            "looking relieved. Clinical but warm lighting, professional healthcare "
            "atmosphere. Composition emphasizes the dentist focusing on the patient. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "w6-p03-webshop-midnight",
        "label": "Webshop owner sleeping, laptop glowing with orders",
        "category": "wave6",
        "prompt": (
            "Dimly lit Dutch home office at night. A laptop open on the desk, its "
            "screen glowing softly in the dark, displaying an order-management "
            "dashboard with multiple new order notifications stacked up. In the soft "
            "background blur: a sleeping figure in bed, only a duvet outline visible. "
            "Tranquil, abstract. Cinematic low-key lighting. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "w6-p04-accountant-deadline",
        "label": "Accountant at desk during tax deadline night",
        "category": "wave6",
        "prompt": (
            "A focused Dutch accountant in their late 40s sitting at a desk in a "
            "modern accountancy office at late night (23:50 visible faintly on a wall "
            "clock or PC clock). Two large monitors glowing with spreadsheets and "
            "client-deadline lists. Stacks of folders on the desk. A coffee cup, a "
            "headset nearby. Calm, composed despite the pressure. Cool blue monitor "
            "glow contrasting with warm desk lamp. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "w6-p05-bouw-avond-truck",
        "label": "Construction foreman in truck at dusk",
        "category": "wave6",
        "prompt": (
            "A weathered Dutch construction foreman in his 50s, wearing a high-vis "
            "jacket, sitting in the driver seat of his white commercial van at dusk "
            "after a long workday. The construction site is fading in the background "
            "through the windshield. His phone is on the dashboard mount, screen "
            "showing a chat or call notification. Honest, hardworking, end-of-day "
            "exhaustion mixed with calm. Warm golden hour light. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "w6-p06-zorg-huisarts-druk",
        "label": "Busy GP practice, doctor with patient + phone on desk",
        "category": "wave6",
        "prompt": (
            "Interior of a busy modern Dutch GP practice (huisartspraktijk) at 16:45. "
            "A doctor in a white coat sits across from a patient in the consultation "
            "room — both human, focused on each other. On the doctor's desk: a "
            "professional desk phone with the line indicator showing 'on hold' or "
            "multiple calls waiting. Clean medical environment, soft daylight. "
            "Composition emphasizes the human-to-human connection. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "w6-p07-logistiek-scanner",
        "label": "Warehouse logistics driver with handheld scanner",
        "category": "wave6",
        "prompt": (
            "Interior of a small Dutch logistics warehouse during shift change. A "
            "delivery driver in a uniform with company branding (generic, no logo) "
            "holds a handheld barcode scanner with a small display screen. Stacks of "
            "labeled packages on shelves and pallets behind. Industrial overhead "
            "lighting, organized chaos. Hands and scanner in sharp focus, background "
            "soft. Documentary photography style. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "w6-p08-vastgoed-open-house",
        "label": "Real estate open-house with visitors",
        "category": "wave6",
        "prompt": (
            "Interior of a Dutch canal-side apartment during a real-estate open-house "
            "viewing. A professional female estate agent in business attire shows the "
            "living room to a couple of prospective buyers. Bright natural light "
            "through tall windows, modern Scandinavian-style interior. The agent has "
            "her smartphone in her free hand, glancing at it briefly. Authentic, "
            "high-energy real-estate moment. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "w6-p09-retail-checkout",
        "label": "Small retail owner at busy checkout",
        "category": "wave6",
        "prompt": (
            "Interior of a small Dutch boutique retail shop. The owner — a Dutch woman "
            "in her 30s — stands behind a wooden counter ringing up a customer's "
            "purchase on a modern POS tablet. Other customers visible browsing in the "
            "softly blurred background. A smartphone sits on the counter beside the "
            "POS, screen showing a WhatsApp chat notification. Bright, welcoming "
            "small-business atmosphere. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "w6-p10-team-growth-celebrate",
        "label": "Small startup team celebrating growth",
        "category": "wave6",
        "prompt": (
            "Two young Dutch tech professionals — one male, one female, mid-20s — "
            "in a small modern Rotterdam office sharing a quiet moment of "
            "celebration: a fist-bump or high-five, smiling. Behind them: a large "
            "monitor displaying a growth chart trending upward (abstract, no "
            "readable text). Plants, exposed brick wall, daylight from large windows. "
            "Authentic startup energy, NOT staged stock-photo. "
            + BRAND_SUFFIX
        ),
    },
]

# ---------------------------------------------------------------------------
# Ken-Burns reel background scenes (9:16, 1080x1920)
# ---------------------------------------------------------------------------
KENBURNS_SCENES: list[dict] = [
    {
        "id": "kb-cafe-ochtend",
        "label": "Ken-Burns: cafe morning",
        "category": "kenburns",
        "prompt": (
            "Wide cinematic shot of an empty Dutch brown cafe interior just before "
            "opening -- soft morning light filtering through tall canal-side windows, "
            "wooden tables, fresh coffee cups on counter. Warm amber tones. "
            "No people, no text. Shot on 35mm film aesthetic, 9:16 vertical. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "kb-amsterdam-straat",
        "label": "Ken-Burns: Amsterdam street",
        "category": "kenburns",
        "prompt": (
            "Cinematic vertical shot of a quiet Amsterdam canal street at golden "
            "hour -- brick houses, cobblestones, bicycles, soft bokeh. "
            "No people visible, peaceful urban Dutch atmosphere. "
            "9:16 vertical orientation, filmic color grading. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "kb-kantoor-uitzicht",
        "label": "Ken-Burns: modern office view",
        "category": "kenburns",
        "prompt": (
            "Looking through large floor-to-ceiling windows of a modern Dutch "
            "office at a city skyline in soft daylight. Clean interior edge -- "
            "a plant, a desk corner. Minimal, corporate yet human. "
            "9:16 vertical, cinematic wide angle. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "kb-webshop-warehouse",
        "label": "Ken-Burns: small warehouse",
        "category": "kenburns",
        "prompt": (
            "Interior of a tidy Dutch small e-commerce warehouse -- wooden shelves "
            "with product boxes, natural light from skylights, clean floor. "
            "Organized, optimistic small business atmosphere. No people. "
            "9:16 vertical, documentary style. "
            + BRAND_SUFFIX
        ),
    },
    {
        "id": "kb-abstract-gradient-navy",
        "label": "Ken-Burns: abstract brand gradient",
        "category": "kenburns",
        "prompt": (
            "Abstract smooth gradient background transitioning from deep navy blue "
            "to rich indigo, with subtle light-leak bokeh circles in rose and amber. "
            "Minimal, modern, brand-safe. 9:16 vertical, suitable as video background. "
            + BRAND_SUFFIX
        ),
    },
]

ALL_SCENES = NL_MKB_SCENES + KENBURNS_SCENES


# ---------------------------------------------------------------------------
# Batch runners
# ---------------------------------------------------------------------------

def run_scene(scene: dict, model_key: str = "imagen") -> Path | None:
    model = MODEL_GEMINI if model_key == "gemini" else MODEL_IMAGEN
    is_kb = scene["category"] == "kenburns"
    out_dir = KENBURNS_DIR if is_kb else AI_IMAGES_DIR
    w, h = (1080, 1920) if is_kb else (1080, 1080)
    out_path = out_dir / f"{scene['id']}.png"
    # Imagen occasionally returns a transient 503 — retry, never crash the batch.
    last_err = None
    for attempt in range(1, 5):
        try:
            return generate_image(
                prompt=scene["prompt"],
                out_path=out_path,
                model=model,
                width=w,
                height=h,
                negative_prompt=NEGATIVE,
            )
        except Exception as e:  # noqa: BLE001 — transient API errors
            last_err = e
            wait = attempt * 8
            print(f"  attempt {attempt}/4 failed ({str(e)[:90]}); retry in {wait}s", file=sys.stderr)
            time.sleep(wait)
    print(f"  SKIPPED {scene['id']} after 4 attempts: {last_err}", file=sys.stderr)
    return None


def run_all_mkb(model_key: str = "imagen") -> None:
    print(f"=== NL-MKB scenes ({len(NL_MKB_SCENES)} total) ===", file=sys.stderr)
    for scene in NL_MKB_SCENES:
        run_scene(scene, model_key)
        time.sleep(1)


def run_kenburns(model_key: str = "imagen") -> None:
    print(f"=== Ken-Burns backgrounds ({len(KENBURNS_SCENES)} total) ===", file=sys.stderr)
    for scene in KENBURNS_SCENES:
        run_scene(scene, model_key)
        time.sleep(1)


def run_diversity(model_key: str = "imagen") -> None:
    diversity = [s for s in NL_MKB_SCENES if s["category"] == "diversity"]
    print(f"=== Diversity scenes ({len(diversity)} total) ===", file=sys.stderr)
    for scene in diversity:
        run_scene(scene, model_key)
        time.sleep(1)


def print_manifest() -> None:
    manifest = {
        "nl_mkb_scenes": [
            {"id": s["id"], "label": s["label"], "category": s["category"]}
            for s in NL_MKB_SCENES
        ],
        "kenburns_scenes": [
            {"id": s["id"], "label": s["label"]}
            for s in KENBURNS_SCENES
        ],
    }
    print(json.dumps(manifest, indent=2, ensure_ascii=False))


# ---------------------------------------------------------------------------
# Ken-Burns reel schedule helper
# ---------------------------------------------------------------------------

def kenburns_slot_spec(scene_id: str, headline: str,
                       sub: str = "", cta: str = "aanloopai.nl/ig") -> dict:
    """Return a reel slot dict (ken-burns template) for wave-N-reels-schedule.json."""
    return {
        "template": "ken-burns",
        "image": f"public/social-feed/reels/backgrounds/{scene_id}.png",
        "headline": headline,
        "sub": sub,
        "cta": cta,
    }


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(
        description="Generate AI images for aanloop NL-MKB content."
    )
    ap.add_argument("--scene",     help="Generate a single scene by ID")
    ap.add_argument("--all",       action="store_true", help="All NL-MKB + Ken-Burns scenes")
    ap.add_argument("--kenburns",  action="store_true", help="Ken-Burns reel backgrounds only")
    ap.add_argument("--diversity", action="store_true", help="Diversity scenes only")
    ap.add_argument("--manifest",  action="store_true", help="Print scene manifest as JSON and exit")
    ap.add_argument(
        "--model",
        choices=["imagen", "gemini"],
        default="imagen",
        help="imagen = Imagen 4 (default, best quality) | gemini = Gemini 2.0 Flash (faster/cheaper)",
    )
    args = ap.parse_args()

    if args.manifest:
        print_manifest()
        return 0

    if args.scene:
        match = next((s for s in ALL_SCENES if s["id"] == args.scene), None)
        if not match:
            ids = [s["id"] for s in ALL_SCENES]
            print(f"Scene '{args.scene}' not found.\nAvailable:\n" + "\n".join(ids), file=sys.stderr)
            return 2
        run_scene(match, args.model)
        return 0

    if args.kenburns:
        run_kenburns(args.model)
        return 0

    if args.diversity:
        run_diversity(args.model)
        return 0

    if args.all:
        run_all_mkb(args.model)
        run_kenburns(args.model)
        return 0

    ap.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
