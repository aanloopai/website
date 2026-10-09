// Shared pure helpers for the overeenkomst flow (templates, hashes, labels).
import { randomId, sha256Hex } from './auth.js';
import { wordCount } from './markdown-lite.js';
import { SCHEMA_STATEMENTS } from './overeenkomst-schema.js';
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

export const AUTHORIZED_LABEL = (bedrijf) => `Ik ben bevoegd om ${bedrijf} te vertegenwoordigen en onderteken deze overeenkomst digitaal. Ik begrijp dat deze digitale handtekening rechtsgeldig is (eIDAS, art. 3:15a BW).`;

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
  return vars;
}

export function minReadSeconds(markdown) {
  return Math.max(20, Math.ceil(wordCount(markdown) / 8));
}

// Fixed key order: the hash must stay reproducible from the stored audit data.
export async function computeEvidenceSha256({
  agreementId, userId, contentHashes, typedName, signedAtMs, signatureSha256, otpVerifiedAt, consentCheckboxAts,
}) {
  return sha256Hex(JSON.stringify({
    agreementId, userId, contentHashes, typedName, signedAtMs, signatureSha256, otpVerifiedAt, consentCheckboxAts,
  }));
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
