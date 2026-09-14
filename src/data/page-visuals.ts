/**
 * Eén visuele taal voor de hele site: fotorealistische, cinematische stills in
 * blue-hour / navy / indigo — dezelfde look als de homepage-hero-video.
 * Gegenereerd met Higgsfield Cinema Studio 2.5 (3:2, 2k); stijl-suffix:
 * "Photorealistic cinematic still, deep navy shadows with soft indigo and teal
 *  light accents, warm tungsten highlights, 35mm lens, shallow depth of field,
 *  premium editorial look, no text, no logos, no readable screens, no people in focus."
 *
 * Twee toepassingen:
 *  1. `src/assets/images/pages/*.jpg` en `sectoren/*.jpg` — pagina's met een eigen
 *     hero-<Image>. Die bestanden zijn 1-op-1 vervangen (zelfde naam), en staan
 *     hieronder op NONE zodat er geen tweede beeld achter komt.
 *  2. `public/visuals/*.jpg` — achtergrond in de `.hero-gradient`-sectie via
 *     BaseLayout (`--page-visual`), voor alle overige pagina's.
 */

export type PageVisual = {
  /** bestandsnaam zonder extensie in public/visuals/; leeg = geen achtergrond */
  file: string;
  /** onderwerp van de foto (alleen bij het eerste voorkomen van een bestand) */
  subject: string;
};

/** Pagina heeft een eigen hero-beeld: geen CSS-achtergrond. */
const NONE: PageVisual = { file: '', subject: '' };

/**
 * Route → visual. Sleutels die op '/' eindigen zijn exact; andere zijn prefixen.
 * Langste match wint, dus een exacte route overschrijft een prefix.
 */
export const PAGE_VISUALS: Record<string, PageVisual> = {
  // ── Eigen hero-<Image> (src/assets/images vervangen) ─────────────────────
  '/diensten': NONE,
  '/sectoren': NONE,
  '/cases/': NONE,
  '/contact/': NONE,
  '/enterprise/': NONE,
  '/werkwijze/': NONE,
  '/ai-receptionist-nederland/': NONE,
  '/ai-telefonie-compleet-gids-nederland-2026/': NONE,

  // ── Diensten zonder eigen hero-beeld ─────────────────────────────────────
  '/diensten/telefoon-assistent/': { file: 'telefoon', subject: 'Reception desk of a modern Dutch small business at blue hour, a sleek desk phone and headset beside a laptop; a soft indigo holographic sound-wave hovers above the phone. Rotterdam skyline out of focus through the window' },
  '/diensten/website-laten-maken-mkb-nederland-2026/': { file: 'website', subject: "A designer's workspace at blue hour with a large monitor showing a clean abstract website wireframe in soft indigo light, sketches and a coffee cup beside it, Rotterdam architecture through the window" },
  '/diensten/webshop-laten-maken-shopify-woocommerce-nederland-2026/': { file: 'webshop', subject: 'A small Dutch webshop studio at blue hour: neatly stacked shipping boxes, a laptop glowing with an abstract order dashboard in indigo, a barcode scanner on the table' },
  '/diensten/ai-website-bundel-mkb-nederland/': { file: 'bundel', subject: 'One elegant desk at blue hour with a laptop, a desk phone and a smartphone side by side, all connected by a thin glowing indigo light line' },
  '/diensten/ai-social-media-agent/': { file: 'social', subject: "A content creator's desk at blue hour with a ring light switched off, a smartphone on a small tripod and a laptop showing abstract social post cards in soft indigo glow" },
  '/diensten/ai-influencer-marketing/': { file: 'influencer', subject: 'A studio corner at blue hour with a softbox, a camera on a tripod and a laptop glowing with abstract analytics curves in indigo, minimalist and premium' },
  '/sectoren/': { file: 'sectoren', subject: 'A row of Dutch shopfronts and small offices on a quiet street at blue hour, warm windows, wet cobblestones reflecting soft indigo light' },
  '/ai-vindbaarheid': { file: 'vindbaarheid', subject: 'A dark glass office at blue hour, a laptop screen glowing with an abstract search-and-answer interface made of soft indigo light particles, reflections on the desk' },
  '/leads-kopen': { file: 'leads', subject: "A Dutch contractor's office at blue hour, a tablet on the desk glowing with an abstract map of the Netherlands with soft indigo location pins, work gloves and a measuring tape beside it" },

  // ── Kernpagina's ─────────────────────────────────────────────────────────
  '/gratis-ai-scan/': { file: 'scan', subject: 'A clean desk at blue hour with a tablet glowing with an abstract circular score gauge in indigo light, a pen and notebook beside it' },
  '/ai-oplossing-matcher/': { file: 'scan', subject: '' },
  '/gratis-ai-tools/': { file: 'scan', subject: '' },
  '/demo-aanvragen/': { file: 'demo', subject: 'A bright meeting corner at blue hour with two chairs and a laptop turned toward the viewer, its screen glowing softly indigo, ready for a demo' },
  '/demo-inplannen/': { file: 'demo', subject: '' },
  '/pilot/': { file: 'zorg', subject: '' },
  '/over/': { file: 'over', subject: 'A small Rotterdam office loft at blue hour, exposed brick, a long wooden table with two laptops and a plant, Erasmus bridge lights soft through the window' },
  '/founding/': { file: 'over', subject: '' },
  '/pers/': { file: 'over', subject: '' },
  '/ai-agency-nederland/': { file: 'over', subject: '' },
  '/tarieven/': { file: 'tarieven', subject: 'A clean desk at blue hour with a closed contract folder, a fountain pen and a laptop with a soft indigo glow, calm and transparent' },
  '/glossarium/': { file: 'kennis', subject: 'A quiet study at blue hour with open books, a laptop and a thin holographic indigo network diagram floating above the desk' },
  '/vertrouwen/': { file: 'avg', subject: '' },
  '/avg-checklist-ai-mkb/': { file: 'avg', subject: 'A Dutch office at blue hour with a document binder, a padlock shape made of soft indigo light hovering above a laptop, calm and trustworthy' },
  '/ai-roi-calculator/': { file: 'roi', subject: 'A finance desk at blue hour with a calculator, a laptop showing abstract rising bar charts in indigo light, and neatly stacked invoices' },
  '/gemiste-omzet-calculator/': { file: 'roi', subject: '' },
  '/no-show-calculator/': { file: 'roi', subject: '' },
  '/branche-statistieken-mkb-ai-nederland/': { file: 'roi', subject: '' },
  '/ai-voor-administratie-boekhouding-mkb-nederland/': { file: 'roi', subject: '' },
  '/ai-agents-voor-bedrijven/': { file: 'automatisering', subject: 'A modern Dutch office at blue hour, a laptop and a tablet on the desk connected by flowing thin indigo light lines that pass through a floating abstract workflow diagram' },
  '/ai-automatisering/': { file: 'automatisering', subject: '' },
  '/ai-marketing-bureau/': { file: 'social', subject: '' },
  '/ai-voor-ecommerce-webshops-nederland/': { file: 'webshop', subject: '' },
  '/ai-voor-zorg-mkb-nederland/': { file: 'zorg', subject: 'A calm Dutch medical practice reception at blue hour, an empty waiting room with soft light, a tablet on the counter glowing with an abstract appointment timeline in indigo' },

  // ── Locaties (31 steden) ─────────────────────────────────────────────────
  '/locaties/rotterdam': { file: 'rotterdam', subject: 'Rotterdam Erasmus bridge and skyline at blue hour seen from a modern office window, a laptop with a soft indigo glow on the desk in the foreground' },
  '/locaties/amsterdam': { file: 'amsterdam', subject: 'Amsterdam canal houses at blue hour seen from an office window, a laptop with a soft indigo glow on the desk in the foreground' },
  '/locaties/utrecht': { file: 'utrecht', subject: 'Utrecht Dom tower at blue hour seen from a modern office window, a laptop with a soft indigo glow on the desk in the foreground' },
  '/locaties/den-haag': { file: 'den-haag', subject: 'The Hague skyline with modern towers at blue hour seen from an office window, a laptop with a soft indigo glow on the desk in the foreground' },
  '/locaties/eindhoven': { file: 'eindhoven', subject: 'Eindhoven Strijp-S industrial architecture at blue hour seen from an office window, a laptop with a soft indigo glow on the desk in the foreground' },
  '/locaties': { file: 'nederland', subject: 'A typical Dutch town centre with canal and brick houses at blue hour, warm windows, a laptop with a soft indigo glow on a café table in the foreground' },

  // ── Kennisbank ───────────────────────────────────────────────────────────
  '/kennisbank/ai-receptionist': { file: 'telefoon', subject: '' },
  '/kennisbank/ai-telefon': { file: 'telefoon', subject: '' },
  '/kennisbank/whatsapp': { file: 'whatsapp', subject: 'A smartphone on a wooden café table at blue hour, its screen glowing with abstract chat bubbles in soft indigo light, a coffee cup beside it' },
  '/kennisbank/avg': { file: 'avg', subject: '' },
  '/kennisbank/ai-act': { file: 'avg', subject: '' },
  '/kennisbank/website': { file: 'website', subject: '' },
  '/kennisbank/seo': { file: 'website', subject: '' },
  '/kennisbank/webshop': { file: 'webshop', subject: '' },
  '/kennisbank/ai-roi': { file: 'roi', subject: '' },
  '/kennisbank/ai-agency': { file: 'over', subject: '' },
  '/kennisbank': { file: 'kennis', subject: '' },

  // ── Vangnet: elke overige pagina met een .hero-gradient-sectie ───────────
  '': { file: 'nederland', subject: '' },
};

/** Vind de visual voor een pad: langste match wint; NONE geeft undefined. */
export function visualFor(pathname: string): PageVisual | undefined {
  const p = pathname.endsWith('/') ? pathname : pathname + '/';
  let best: { key: string; v: PageVisual } | undefined;
  for (const [key, v] of Object.entries(PAGE_VISUALS)) {
    const isExact = key.endsWith('/');
    const hit = isExact ? p === key : p.startsWith(key);
    if (hit && (!best || key.length > best.key.length)) best = { key, v };
  }
  return best && best.v.file ? best.v : undefined;
}
