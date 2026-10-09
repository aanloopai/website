// Shared pure helpers for the overeenkomst flow (templates, hashes, labels).
import { randomId, sha256Hex } from './auth.js';
import { wordCount } from './markdown-lite.js';
import { SCHEMA_STATEMENTS, SCHEMA_ALTERS } from './overeenkomst-schema.js';
import { TEMPLATE_SEED } from './overeenkomst-templates-seed.js';

export { sha256Hex };

export const FIXED_VARS = {
  aanloopai_adres: 'Blokfluit 31, 3068 KZ Rotterdam',
  aanloopai_btw: 'NL004672676B48',
  aanloopai_kvk: '88606902',
};

export const TEMPLATE_SLUGS = ['overeenkomst', 'algemene-voorwaarden', 'privacy-verwerker'];

export const CONSENT_LABELS = {
  overeenkomst: 'Ik heb de overeenkomst volledig gelezen en ga akkoord met de inhoud.',
  'algemene-voorwaarden': 'Ik heb de Algemene Voorwaarden van AanloopAI volledig gelezen en aanvaard deze.',
  'privacy-verwerker': 'Ik heb de Privacyverklaring en de Verwerkersovereenkomst volledig gelezen en ga akkoord.',
};

export const NO_PASSWORD_NOTICE = 'Deel geen wachtwoorden. Toegang verlenen we via uitnodiging op jouw account.';

export const ACCEPTANCE_LABEL = 'Ik verklaar dat ik de overeenkomst, de Algemene Voorwaarden van AanloopAI en de Privacyverklaring en Verwerkersovereenkomst volledig heb gelezen, begrepen en aanvaard, en dat ik alle daarin opgenomen voorwaarden onvoorwaardelijk accepteer.';

export const AUTHORIZED_LABEL = (bedrijf) => `Ik ben bevoegd om ${bedrijf} te vertegenwoordigen en onderteken deze overeenkomst digitaal. Ik begrijp dat deze digitale handtekening rechtsgeldig is (eIDAS, art. 3:15a BW).`;

// ── Bedragen (all amounts excl. btw) ───────────────────────────────────────
// '€ 4.500' / '4500' / '€ 1.000,00' / '1.000,5' -> number. Anything else -> null.
export function parseEuro(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  let t = String(raw ?? '').replace(/€|eur(o)?/gi, '').replace(/\s+/g, '').replace(/,-$/, '');
  if (!t || !/^\d[\d.,]*$/.test(t)) return null;
  const lastComma = t.lastIndexOf(',');
  const lastDot = t.lastIndexOf('.');
  if (lastComma > -1) {
    // Dutch: '.' groups thousands, ',' is the decimal separator.
    if (lastDot > lastComma) return null;
    t = t.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > -1) {
    // Only dots: 3 trailing digits after every dot = thousands grouping, otherwise a decimal point.
    t = /^\d{1,3}(\.\d{3})+$/.test(t) ? t.replace(/\./g, '') : t;
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

// 4500 -> '€ 4.500'; 1000.5 -> '€ 1.000,50'; null -> '—'.
export function formatEuro(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  const v = Number(n);
  const whole = Math.abs(v - Math.round(v)) < 0.005;
  const txt = new Intl.NumberFormat('nl-NL', {
    minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2,
  }).format(whole ? Math.round(v) : v);
  return `€ ${txt}`;
}

const intOrNull = (raw) => {
  const n = parseEuro(raw);
  return n == null ? null : Math.round(n);
};

export function computeTotals(vars) {
  const v = vars || {};
  const website = parseEuro(v.prijs_website);
  const gekozen = String(v.optie_3d_gekozen ?? '').trim().toLowerCase() === 'ja';
  const prijs3d = parseEuro(v.prijs_optie_3d);
  const spec = [{ label: 'Website', bedrag: website }];
  if (gekozen) spec.push({ label: 'Cinematic 3D-beleving', bedrag: prijs3d });
  const eenmalig = spec.every((r) => r.bedrag != null) ? spec.reduce((a, r) => a + r.bedrag, 0) : null;
  return {
    eenmalig,
    eenmalig_specificatie: spec,
    maandelijks: parseEuro(v.prijs_beheer_maand),
    leads: {
      per_lead: parseEuro(v.prijs_lead),
      bundel_aantal: intOrNull(v.lead_bundel_aantal),
      bundel_prijs: parseEuro(v.lead_bundel_prijs),
    },
    optie_3d: { gekozen, prijs: prijs3d },
  };
}

export const AMOUNTS_LABEL = (t) => `Ik ga akkoord met het eenmalige bedrag van ${formatEuro(t?.eenmalig)} excl. btw en het maandelijkse bedrag van ${formatEuro(t?.maandelijks)} excl. btw, en met de leadprijs van ${formatEuro(t?.leads?.per_lead)} per lead (bundel van ${t?.leads?.bundel_aantal ?? '—'} leads voor ${formatEuro(t?.leads?.bundel_prijs)}).`;

// Plain-text lines of the totals block (used on the PDF signing page).
export function totalsLines(t) {
  const lines = [`Eenmalig: ${formatEuro(t?.eenmalig)} excl. btw`];
  for (const r of t?.eenmalig_specificatie || []) lines.push(`  - ${r.label}: ${formatEuro(r.bedrag)}`);
  lines.push(`Maandelijks (beheer & groei, vanaf livegang): ${formatEuro(t?.maandelijks)} excl. btw`);
  lines.push(`Leads: ${formatEuro(t?.leads?.per_lead)} per lead - bundel van ${t?.leads?.bundel_aantal ?? '—'} = ${formatEuro(t?.leads?.bundel_prijs)} excl. btw`);
  return lines;
}

// {{name}} / {{ name }} (an optional "|hint" suffix is ignored).
// Unknown name -> "[ontbreekt: name]"; known-but-empty -> "".
export function renderTemplate(bodyMarkdown, vars) {
  const v = vars || {};
  return String(bodyMarkdown ?? '').replace(/\{\{\s*([^{}|\s]+)(?:\|[^{}]*)?\s*\}\}/g, (_m, name) => {
    const val = v[name];
    if (val === undefined || val === null) return `[ontbreekt: ${name}]`;
    return String(val);
  });
}

const NL_MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

function amsterdamParts(ms) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Amsterdam', year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  const o = {};
  for (const p of parts) o[p.type] = p.value;
  return {
    y: Number(o.year), m: Number(o.month), d: Number(o.day), hh: o.hour, mm: o.minute,
  };
}

export function formatAmsterdam(ms) {
  const {
    y, m, d, hh, mm,
  } = amsterdamParts(ms);
  return `${d}-${m}-${y} ${hh}:${mm}`;
}

function datumNl(ms) {
  const { y, m, d } = amsterdamParts(ms);
  return `${d} ${NL_MONTHS[m - 1]} ${y}`;
}

export function buildVars(agreement, customer) {
  let base = {};
  try { base = JSON.parse(agreement?.variables_json || '{}') || {}; } catch { base = {}; }
  const vars = {
    ...base, ...FIXED_VARS, datum: datumNl(Date.now()), agreement_id: agreement?.id ?? '',
  };
  if (customer?.kvk && String(customer.kvk).trim()) vars.klant_kvk = String(customer.kvk).trim();
  if (customer?.btw_id && String(customer.btw_id).trim()) vars.klant_btw = String(customer.btw_id).trim();
  // btw is optional (e.g. no VAT number yet): never render an empty slot.
  if (!String(vars.klant_btw ?? '').trim()) vars.klant_btw = '—';
  return vars;
}

export function minReadSeconds(markdown) {
  return Math.max(20, Math.ceil(wordCount(markdown) / 8));
}

// Fixed key order: the hash must stay reproducible from the stored audit data.
export async function computeEvidenceSha256({
  agreementId, userId, contentHashes, typedName, signedAtMs, signatureSha256, otpVerifiedAt, consentCheckboxAts, acceptedAllAt,
  amountsAcceptedAt,
}) {
  const payload = {
    agreementId, userId, contentHashes, typedName, signedAtMs, signatureSha256, otpVerifiedAt, consentCheckboxAts, acceptedAllAt,
  };
  // Appended last and only when present, so hashes of agreements signed before 0027 stay reproducible.
  if (amountsAcceptedAt != null) payload.amountsAcceptedAt = amountsAcceptedAt;
  return sha256Hex(JSON.stringify(payload));
}

const MAX_SIGNATURE_BYTES = 300 * 1024;
const MIN_SIGNATURE_PX = 10;
const MAX_SIGNATURE_PX = 2000;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// data:image/png;base64,... -> Uint8Array. Throws Error with .code 'too_big' | 'invalid'.
export function decodeSignaturePng(dataUrl) {
  const fail = (code) => { const e = new Error(code === 'too_big' ? 'Handtekening te groot' : 'Ongeldige handtekening'); e.code = code; return e; };
  if (typeof dataUrl !== 'string') throw fail('invalid');
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw fail('invalid');
  // Cheap size guard before decoding (base64 expands by 4/3).
  if (m[1].length > Math.ceil(MAX_SIGNATURE_BYTES / 3) * 4 + 4) throw fail('too_big');
  let bytes;
  try {
    const bin = atob(m[1]);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } catch { throw fail('invalid'); }
  if (bytes.length > MAX_SIGNATURE_BYTES) throw fail('too_big');
  if (bytes.length < 24 || !PNG_MAGIC.every((b, i) => bytes[i] === b)) throw fail('invalid');
  // IHDR: width/height are big-endian uint32 at bytes 16-23; reject PNG bombs / tiny images.
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const w = dv.getUint32(16); const h = dv.getUint32(20);
  if (w < MIN_SIGNATURE_PX || h < MIN_SIGNATURE_PX || w > MAX_SIGNATURE_PX || h > MAX_SIGNATURE_PX) throw fail('invalid');
  return bytes;
}

// The 13 items of SPEC §7. max_mb capped at 25 (KV value limit).
export function DEFAULT_UPLOAD_ITEMS(projectDomein) {
  const dom = projectDomein && String(projectDomein).trim() ? String(projectDomein).trim() : 'het domein';
  const photo = 'jpg,png,heic';
  const file = (label, description, o = {}) => ({
    label, description, type: 'file', required: 1, accepted_ext: '', max_mb: 25, multi: 0, max_files: 1, ...o,
  });
  const text = (label, description) => ({
    label, description, type: 'text', required: 1, accepted_ext: null, max_mb: 25, multi: 0, max_files: 1,
  });
  const bool = (label, description) => ({
    label, description, type: 'boolean', required: 1, accepted_ext: null, max_mb: 25, multi: 0, max_files: 1,
  });
  return [
    file('Logo (vector: .svg/.ai/.eps/.pdf)', 'Lever je logo bij voorkeur als vectorbestand aan.', { accepted_ext: 'svg,ai,eps,pdf' }),
    file('Huisstijlgids / kleuren / lettertypen', 'Heb je een huisstijlgids? Lever die dan hier aan.', { required: 0, accepted_ext: 'pdf,docx,md' }),
    file("Foto's showroom en team", "Foto's van je showroom en je team.", { accepted_ext: photo, multi: 1, max_files: 40 }),
    file("Foto's geplaatste keukens (met toestemming klant)", "Foto's van geplaatste keukens, alleen met toestemming van de klant.", {
      required: 0, accepted_ext: photo, multi: 1, max_files: 40,
    }),
    bool("Toestemmingsverklaring klantfoto's", 'Ik bevestig dat de klanten toestemming hebben gegeven'),
    text(`Domein ${dom} — registrar en wie beheert DNS`, 'Bij welke registrar staat het domein en wie beheert de DNS-instellingen?'),
    text('Google Analytics / Search Console / Meta Business — welk account, wie geeft toegang', 'Welk account gebruik je en wie geeft ons toegang?'),
    text('Google Business Profile — beheerder (naam + e-mail)', 'Wie beheert jullie Google Business Profile?'),
    text('Agenda voor afspraakmodule (Google / Outlook) + e-mailadres', 'Welke agenda gebruiken we voor de afspraakmodule en op welk e-mailadres?'),
    text('Tekstinput: Keukenkompas-uitleg', 'Uitleg voor de Keukenkompas-pagina.'),
    text('Tekstinput: All-in keukenpakket', 'Uitleg voor het all-in keukenpakket.'),
    bool('Vanaf-prijzen tonen op de site?', 'Wil je vanaf-prijzen op de website tonen? Kies ja of nee.'),
    text('Teamnamen + functies voor "over ons"', 'Namen en functies van je team voor de over-ons-pagina.'),
  ];
}

export async function writeAudit(db, {
  customer_id = null, actor, action, meta = null, ip = null,
} = {}) {
  try {
    await db.prepare(
      'INSERT INTO portal_audit_log (id, customer_id, actor, action, meta_json, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(
      randomId('aud'), customer_id, actor ?? 'system', action,
      meta == null ? null : JSON.stringify(meta), ip, Date.now(),
    ).run();
  } catch (err) {
    console.error('writeAudit failed', err);
  }
}

// Lazy schema + template seed (once per isolate). Mirrors discovery.js ensureSchemaAndSeed.
let schemaReady = null;
export function resetPortaalSchemaMemo() { schemaReady = null; }
export async function ensurePortaalSchema(env) {
  if (!schemaReady) {
    const db = env.PORTAL_DB;
    schemaReady = (async () => {
      await db.batch(SCHEMA_STATEMENTS.map((s) => db.prepare(s)));
      for (const alter of SCHEMA_ALTERS) {
        try { await db.prepare(alter).run(); } catch (err) {
          if (!/duplicate column/i.test(String(err?.message || err))) throw err;
        }
      }
      const row = await db.prepare('SELECT count(*) AS n FROM agr_templates').first();
      if (!row || !row.n) {
        await db.batch(TEMPLATE_SEED.map((t) => db.prepare(
          'INSERT OR IGNORE INTO agr_templates (id, slug, version, title, body_markdown, effective_from, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ).bind(t.id, t.slug, t.version, t.title, t.body, 1760000000000, 1760000000000)));
      }
    })().catch((err) => { schemaReady = null; throw err; });
  }
  return schemaReady;
}
