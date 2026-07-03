// Shared HTML escaper — single source of truth (M7 consolidation).
// Escapes all five HTML-significant characters, including the single quote,
// so values are safe inside both double- and single-quoted attributes and text.
const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}
