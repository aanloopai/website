// Gedeelde client-side veldrenderer voor de intake-achtige stap-schema's
// (src/data/intake-schemas.ts). Geëxtraheerd uit de eerste-aanvraag wizard
// (src/pages/portal/intake.astro, die zelf ongewijzigd blijft draaien met
// zijn eigen inline script) zodat de post-pay onboarding-wizard
// (src/pages/portal/onboarding.astro) exact dezelfde veldtypes/opmaak
// (ptextarea/pselect/pinput/faqlist) rendert zonder de renderer te dupliceren.
//
// Pure/DOM-only helpers — geen fetch, geen paginaspecifieke IDs, zodat beide
// wizards hun eigen orkestratie (welke stappen, welke knoppen) eromheen
// kunnen bouwen.

/** @param {unknown} s */
export function escHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));
}

/** @param {{vraag?: string, antwoord?: string}} p */
export function faqRowHtml(p) {
  return '<div class="faq-row rounded-md border p-2" style="border-color:var(--p-border)">'
    + '<input class="pinput faq-v" placeholder="Vraag" value="' + escHtml(p.vraag || '') + '" />'
    + '<textarea class="ptextarea faq-a mt-1" placeholder="Antwoord">' + escHtml(p.antwoord || '') + '</textarea></div>';
}

// Strikte allowlist voor `labelHtml` (consent-velden): alles wordt ge-escaped,
// behalve <a href="/relatief/pad" ...>tekst</a> met uitsluitend de attributen
// target="_blank", rel="noopener" en class="p-link". Alleen schema-tekst uit
// intake-schemas.ts komt hier binnen — nooit gebruikersinvoer — maar de
// allowlist maakt dat ook een fout in het schema geen script kan injecteren.
const SAFE_ANCHOR = /<a href="(\/[^"<>]*)"((?:\s+(?:target="_blank"|rel="noopener"|class="p-link"))*)>([^<]*)<\/a>/g;
/** @param {string} html */
export function safeLabelHtml(html) {
  const src = String(html == null ? '' : html);
  const parts = [];
  let last = 0;
  let m;
  SAFE_ANCHOR.lastIndex = 0;
  while ((m = SAFE_ANCHOR.exec(src))) {
    parts.push(escHtml(src.slice(last, m.index)));
    parts.push('<a href="' + escHtml(m[1]) + '"' + m[2] + '>' + escHtml(m[3]) + '</a>');
    last = m.index + m[0].length;
  }
  parts.push(escHtml(src.slice(last)));
  return parts.join('');
}

/**
 * Zichtbaarheid van een veld binnen zijn stap (`showIf`). Zonder showIf altijd
 * zichtbaar. `vals` = de huidige waarden van dezelfde stap.
 * @param {{showIf?: {field: string, in: string[]}}} f
 * @param {Record<string, unknown>} vals
 */
export function isFieldVisible(f, vals) {
  const c = f && f.showIf;
  if (!c || !c.field || !Array.isArray(c.in)) return true;
  const v = (vals || {})[c.field];
  if (Array.isArray(v)) return v.some((x) => c.in.indexOf(x) > -1);
  return c.in.indexOf(v) > -1;
}

/**
 * Rendert één veld (label + input + hint) voor een intake-stapschema.
 * @param {{name: string, label?: string, type: string, required?: boolean, options?: string[], placeholder?: string, hint?: string, text?: string, labelHtml?: string}} f
 * @param {unknown} val
 */
export function fieldHtml(f, val) {
  const id = 'fld_' + f.name;
  const hint = f.hint ? '<p class="mt-1 text-xs p-muted">' + escHtml(f.hint) + '</p>' : '';
  if (f.type === 'info') {
    return '<div class="p-info rounded-md border p-3 text-sm p-muted" style="border-color:var(--p-border)" data-info="' + escHtml(f.name) + '">'
      + escHtml(f.text || f.label || '') + '</div>';
  }
  if (f.type === 'consent') {
    const text = f.labelHtml ? safeLabelHtml(f.labelHtml) : escHtml(f.label || '');
    return '<label class="flex items-start gap-2 text-sm" style="color:var(--p-ink)">'
      + '<input type="checkbox" class="consent mt-0.5" id="' + id + '" data-f="' + escHtml(f.name) + '"' + (val === true ? ' checked' : '') + ' /> '
      + '<span>' + text + (f.required ? ' *' : '') + '</span></label>' + hint;
  }
  const label = '<label class="plabel">' + escHtml(f.label) + (f.required ? ' *' : '') + '</label>';
  let body = '';
  if (f.type === 'textarea') {
    body = '<textarea class="ptextarea" id="' + id + '" data-f="' + f.name + '" placeholder="' + escHtml(f.placeholder || '') + '">' + escHtml(val || '') + '</textarea>';
  } else if (f.type === 'select') {
    body = '<select class="pselect" id="' + id + '" data-f="' + f.name + '"><option value="">— Kies —</option>'
      + (f.options || []).map((o) => '<option value="' + escHtml(o) + '"' + (val === o ? ' selected' : '') + '>' + escHtml(o) + '</option>').join('')
      + '</select>';
  } else if (f.type === 'multiselect') {
    const arr = Array.isArray(val) ? val : [];
    body = '<div class="space-y-1.5">' + (f.options || []).map((o) => (
      '<label class="flex items-center gap-2 text-sm"><input type="checkbox" class="ms" data-f="' + f.name + '" value="' + escHtml(o) + '"'
      + (arr.indexOf(o) > -1 ? ' checked' : '') + ' /> ' + escHtml(o) + '</label>'
    )).join('') + '</div>';
  } else if (f.type === 'faqlist') {
    const pairs = Array.isArray(val) ? val : [];
    body = '<div class="faqlist space-y-2" data-f="' + f.name + '">'
      + (pairs.length ? pairs.map(faqRowHtml).join('') : faqRowHtml({ vraag: '', antwoord: '' }))
      + '</div><button type="button" class="faq-add pbtn pbtn--subtle pbtn--sm mt-2" data-f="' + f.name + '">+ Vraag toevoegen</button>';
  } else {
    const t = (f.type === 'tel' || f.type === 'email' || f.type === 'url') ? f.type : 'text';
    body = '<input type="' + t + '" class="pinput" id="' + id + '" data-f="' + f.name + '" value="' + escHtml(val || '') + '" placeholder="' + escHtml(f.placeholder || '') + '" />';
  }
  return label + body + hint;
}

/** Wire "+ Vraag toevoegen" click-handlers within `root` (default: document). */
export function wireFaqLists(root) {
  const scope = root || document;
  Array.prototype.forEach.call(scope.querySelectorAll('.faq-add'), (b) => {
    b.addEventListener('click', () => {
      const list = scope.querySelector('.faqlist[data-f="' + b.getAttribute('data-f') + '"]');
      const tmp = document.createElement('div');
      tmp.innerHTML = faqRowHtml({ vraag: '', antwoord: '' });
      list.appendChild(tmp.firstChild);
    });
  });
}

/**
 * Leest de huidige DOM-waarden voor alle velden van `step` terug in een
 * platte `{ [fieldName]: value }`-map (binnen `root`, default: document).
 * @param {{fields: Array<{name: string, type: string}>}} step
 */
export function collectStepValues(step, root) {
  const scope = root || document;
  const vals = {};
  step.fields.forEach((f) => {
    if (f.type === 'info') return; // geen input, geen waarde
    if (f.type === 'consent') {
      const cb = scope.querySelector('#fld_' + f.name);
      vals[f.name] = !!(cb && cb.checked);
    } else if (f.type === 'multiselect') {
      vals[f.name] = Array.prototype.slice.call(
        scope.querySelectorAll('.ms[data-f="' + f.name + '"]:checked'),
      ).map((c) => c.value);
    } else if (f.type === 'faqlist') {
      const rows = scope.querySelectorAll('.faqlist[data-f="' + f.name + '"] .faq-row');
      vals[f.name] = Array.prototype.slice.call(rows).map((row) => ({
        vraag: row.querySelector('.faq-v').value.trim(),
        antwoord: row.querySelector('.faq-a').value.trim(),
      })).filter((p) => p.vraag || p.antwoord);
    } else {
      const el = scope.querySelector('#fld_' + f.name);
      vals[f.name] = el ? el.value.trim() : '';
    }
  });
  return vals;
}

/**
 * @param {{fields: Array<{name: string, label: string, required?: boolean}>}} step
 * @param {Record<string, unknown>} vals
 */
export function missingRequiredFields(step, vals) {
  return step.fields.filter((f) => {
    if (!f.required || f.type === 'info') return false;
    if (!isFieldVisible(f, vals)) return false; // verborgen via showIf → niet verplicht
    const v = vals[f.name];
    if (f.type === 'consent') return v !== true;
    return !v || (Array.isArray(v) && !v.length);
  });
}

/**
 * `showIf`-ondersteuning voor wizards die elk veld in `<div id="fw_<name>">`
 * zetten: zet `hidden` op basis van de huidige stapwaarden en hangt
 * change-listeners aan select/multiselect. Zonder showIf-velden: no-op.
 * @param {{fields: Array<{name: string, type: string, showIf?: object}>}} step
 */
export function wireShowIf(step, root) {
  const scope = root || document;
  const conditional = step.fields.filter((f) => f.showIf);
  if (!conditional.length) return;
  const apply = () => {
    const vals = collectStepValues(step, scope);
    conditional.forEach((f) => {
      const wrap = scope.querySelector('#fw_' + f.name);
      if (wrap) wrap.classList.toggle('hidden', !isFieldVisible(f, vals));
    });
  };
  Array.prototype.forEach.call(scope.querySelectorAll('.pselect[data-f], .ms[data-f]'), (el) => {
    el.addEventListener('change', apply);
  });
  apply();
}
