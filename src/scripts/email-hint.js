// "Bedoelt u jan@gmail.com?" + funnel-events voor formulieren met input[data-email-hint].
// Events dragen alleen domein / veldnaam / formuliernaam, nooit een adres of waarde.
import { emailSuggestie } from '../lib/email-suggest.js';

const track = (name, params) => { try { window._track?.(name, params || {}); } catch (e) { /* analytics mag nooit blokkeren */ } };
const STATES = new Set();
let wrapped = false;

// Een geslaagde verzending (generate_lead / intake_submitted) markeert alle formulieren als verzonden.
function wrapTrack() {
  if (wrapped || typeof window._track !== 'function') return;
  wrapped = true;
  const orig = window._track;
  window._track = function (name) {
    if (name === 'generate_lead' || name === 'intake_submitted') STATES.forEach((s) => { s.submitted = true; });
    return orig.apply(this, arguments);
  };
}

function initForm(input) {
  const form = input.form;
  if (!form || form.dataset.emailHintInit) return;
  form.dataset.emailHintInit = '1';
  const state = { started: false, submitted: false, abandoned: false };
  const formName = form.dataset.formName || form.id || 'form';
  STATES.add(state);

  // Zichtbaarheid uitsluitend via style.display (geen [hidden]/class-mix: KIB-incident, lege "Bedoelt u ?").
  const hint = document.createElement('p');
  hint.className = 'mt-1 text-xs text-slate-500';
  hint.setAttribute('aria-live', 'polite');
  hint.style.display = 'none';
  const knop = document.createElement('button');
  knop.type = 'button';
  knop.className = 'underline';
  hint.append('Bedoelt u ', knop, '?');
  input.insertAdjacentElement('afterend', hint);
  const toon = (aan) => { hint.style.display = aan ? 'block' : 'none'; };

  input.addEventListener('blur', () => {
    const s = emailSuggestie(input.value);
    knop.textContent = s;
    toon(!!s);
    if (s) track('email_suggestie_getoond', { domain: s.split('@')[1], form_name: formName });
  });
  input.addEventListener('input', () => toon(false));
  knop.addEventListener('click', () => {
    const domain = knop.textContent.split('@')[1];
    input.value = knop.textContent;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    toon(false);
    track('email_suggestie_overgenomen', { domain, form_name: formName });
  });

  form.addEventListener('focusin', () => {
    if (state.started) return;
    state.started = true;
    track('form_start', { form_name: formName });
  });

  // Validatiefouten: zichtbare, verplichte velden die nu ongeldig zijn; alleen de veldnaam.
  const meld = () => {
    form.querySelectorAll('[required]').forEach((el) => {
      if (el.offsetParent === null || !el.name) return;
      if (!el.checkValidity()) track('form_error', { field: el.name, form_name: formName });
    });
  };
  form.addEventListener('submit', meld);
  form.querySelectorAll('[data-form-submit]').forEach((b) => b.addEventListener('click', meld));

  window.addEventListener('pagehide', () => {
    if (state.started && !state.submitted && !state.abandoned) {
      state.abandoned = true;
      track('form_abandon', { form_name: formName });
    }
  });
}

function init() {
  wrapTrack();
  document.querySelectorAll('input[type="email"][data-email-hint]').forEach(initForm);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
