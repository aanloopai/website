// Discovery Hub — 'field' soru tipi: kimlikli (R01…), öncelikli (★ / ✉),
// NL+TR etiketli, durum/kaynak/intern notlu soru. Saf fonksiyonlar: hem
// worker (discovery.js computeAnswered) hem tarayıcı (discovery-doc.astro)
// aynı modülü kullanır — "cevaplandı" kuralı tek yerde yaşar.
//
// Cevap biçimi (disc_answers.value JSON):
//   { v, t, note, status, bron }
//   v      : cevap — string (tekst/getal/url/bestand/ja_nee/keuze) | string[] (multi)
//   t      : kısa toelichting (keuze/multi/ja_nee/bestand)
//   note   : intern not (TR) — müşteriye giden hiçbir metne girmez
//   status : open | beantwoord | nog_aanleveren | n.v.t.
//   bron   : gesprek | observatie | mail | bestand | klant (zelf ingevuld) | ''

export const FIELD_STATUSES = ['open', 'beantwoord', 'nog_aanleveren', 'n.v.t.'];
export const FIELD_SOURCES = ['gesprek', 'observatie', 'mail', 'bestand', 'klant'];
export const ANSWER_TYPES = ['tekst', 'getal', 'ja_nee', 'keuze', 'multi', 'bestand', 'url'];
export const PRIORITIES = ['star', 'normaal', 'later'];

function str(x) {
  return String(x == null ? '' : x).trim();
}

export function fieldHasValue(value) {
  if (!value || typeof value !== 'object') return false;
  const v = value.v;
  if (Array.isArray(v) ? v.some((x) => str(x)) : str(v)) return true;
  return str(value.t) !== '';
}

// Açık durum seçilmediyse: değer varsa 'beantwoord', yoksa 'open'.
export function fieldStatus(value) {
  if (value && FIELD_STATUSES.includes(value.status)) return value.status;
  return fieldHasValue(value) ? 'beantwoord' : 'open';
}

export function fieldAnswered(value) {
  const s = fieldStatus(value);
  return s === 'beantwoord' || s === 'n.v.t.' ? 1 : 0;
}

export function formatFieldAnswer(config, value) {
  if (!value || typeof value !== 'object') return '';
  if (fieldStatus(value) === 'n.v.t.' && !fieldHasValue(value)) return 'n.v.t.';
  const type = (config && config.answer_type) || 'tekst';
  let main = value.v;
  if (Array.isArray(main)) main = main.filter((x) => str(x)).join(', ');
  else if (type === 'ja_nee') main = main === 'ja' ? 'Ja' : main === 'nee' ? 'Nee' : str(main);
  else main = str(main);
  const t = str(value.t);
  return [main, t].filter(Boolean).join(' — ');
}

function fieldQuestions(sections) {
  const out = [];
  for (const sec of sections || []) {
    for (const q of sec.questions || []) {
      if (q.type === 'field') out.push({ section: sec, q });
    }
  }
  return out;
}

// ★ vragen die nog 'open' staan (toolbar-teller "★ nog open: N").
export function starOpen(sections) {
  return fieldQuestions(sections)
    .filter(({ q }) => q.config && q.config.prio === 'star' && fieldStatus(q.value) === 'open')
    .map(({ q }) => q);
}

// Aanleverlijst: alle field-vragen met status open of nog_aanleveren.
// (Spec: niet-★ open/nog_aanleveren + ★ open. Een ★ die op nog_aanleveren
// staat hoort er evengoed in, dus de unie = elke prioriteit.)
export function collectAanleverlijst(sections) {
  return fieldQuestions(sections)
    .filter(({ q }) => {
      const s = fieldStatus(q.value);
      return s === 'open' || s === 'nog_aanleveren';
    })
    .map(({ q }) => ({ id: q.id, qid: (q.config && q.config.qid) || '', label: q.label, prio: (q.config && q.config.prio) || 'normaal' }));
}

export const MAIL_SUBJECT = 'Vervolg op ons gesprek — nog een paar gegevens';

export const MAIL_SIGNATURE = ['Met vriendelijke groet,', 'Mustafa Dogan', 'AanloopAI / Alfa Reclame', '06 24741597'];

export function buildAanleverMail({ aanhef, items, deadline }) {
  const lines = [
    `${str(aanhef) || 'Beste'},`,
    '',
    'Bedankt voor het gesprek vandaag in de showroom. Om direct te kunnen starten zonder een tweede afspraak, heb ik nog onderstaande gegevens nodig. Je kunt ze gewoon in een reply zetten of als bijlage sturen.',
    '',
    ...(items || []).map((it, i) => `${i + 1}. ${it.label}`),
    '',
    `Graag uiterlijk ${str(deadline) || '[datum]'}. Ontbreekt iets of weet je iets niet zeker, laat het dan gewoon staan — dan pak ik het samen met jou op.`,
    '',
    ...MAIL_SIGNATURE,
  ];
  return { subject: MAIL_SUBJECT, body: lines.join('\n') };
}

// "Ron (keukenzaak)" → "Beste Ron"
export function defaultAanhef(clientName) {
  const first = str(clientName).split(/[\s(]/)[0];
  return first ? `Beste ${first}` : 'Beste';
}

// Waarde van de vraag met config.role === role (bv. 'deadline').
export function roleValue(sections, role) {
  for (const sec of sections || []) {
    for (const q of sec.questions || []) {
      if (q.config && q.config.role === role) {
        const v = q.value;
        if (v && typeof v === 'object' && !Array.isArray(v)) return str(v.main);
        return str(v);
      }
    }
  }
  return '';
}

function mdCell(s) {
  return str(s).replace(/\|/g, '\\|').replace(/\n+/g, ' ');
}

function textValue(v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    return [str(v.main), ...(Array.isArray(v.subs) ? v.subs.map(str) : [])].filter(Boolean).join(' · ');
  }
  return str(v);
}

// NL-samenvatting voor offerte/plan: beantwoorde field-vragen + blokken met
// config.export. Interne notities (note, TR-blokken, bölüm notları) blijven
// er bewust buiten.
export function buildMarkdown({ doc, sections, today }) {
  const out = [`# Discovery — ${str(doc && doc.client_name)}`, '', `_${str(doc && doc.title)} · samenvatting ${str(today)}_`, ''];
  for (const sec of sections || []) {
    const lines = [];
    for (const q of sec.questions || []) {
      if (q.type === 'field') {
        if (!fieldAnswered(q.value)) continue;
        const ans = formatFieldAnswer(q.config, q.value);
        const obs = q.value && q.value.bron === 'observatie' ? ' _(observatie)_' : '';
        lines.push(`- **${str(q.config && q.config.qid)}** ${q.label}  \n  → ${ans || '—'}${obs}`);
        continue;
      }
      if (!(q.config && q.config.export)) continue;
      if (q.type === 'checklist') {
        const vals = Array.isArray(q.value) ? q.value : [];
        (q.sub_items || []).forEach((item, i) => lines.push(`- [${vals[i] === true ? 'x' : ' '}] ${item}`));
      } else if (q.type === 'table') {
        const cols = (q.config.columns || []);
        const rows = Array.isArray(q.value) && q.value.length ? q.value : (q.config.initial_rows || []);
        lines.push('', `| ${cols.map((c) => mdCell(c.label)).join(' | ')} |`, `|${cols.map(() => '---').join('|')}|`);
        rows.forEach((r) => lines.push(`| ${cols.map((c, i) => mdCell(Array.isArray(r) ? r[i] : '')).join(' | ')} |`));
        lines.push('');
      } else {
        const v = textValue(q.value);
        if (v) lines.push(`- **${q.label}:** ${v}`);
      }
    }
    if (lines.length) out.push(`## ${sec.title}`, '', ...lines, '');
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}
