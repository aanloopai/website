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

/**
 * Rendert één veld (label + input + hint) voor een intake-stapschema.
 * @param {{name: string, label: string, type: string, required?: boolean, options?: string[], placeholder?: string, hint?: string}} f
 * @param {unknown} val
 */
export function fieldHtml(f, val) {
  const label = '<label class="plabel">' + escHtml(f.label) + (f.required ? ' *' : '') + '</label>';
  const hint = f.hint ? '<p class="mt-1 text-xs p-muted">' + escHtml(f.hint) + '</p>' : '';
  const id = 'fld_' + f.name;
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
    if (f.type === 'multiselect') {
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
    if (!f.required) return false;
    const v = vals[f.name];
    return !v || (Array.isArray(v) && !v.length);
  });
}
