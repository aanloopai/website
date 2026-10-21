// E-mail typfout-suggestie. Pure functie, geen DOM. Poort van keukeninbeeld intake.js.
// Stelt alleen voor; het adres wordt nooit stil veranderd.
export const MAILDOMEINEN = ['gmail.com', 'hotmail.com', 'hotmail.nl', 'outlook.com', 'outlook.nl', 'live.nl', 'live.com',
  'icloud.com', 'me.com', 'yahoo.com', 'ziggo.nl', 'kpnmail.nl', 'kpnplanet.nl', 'planet.nl', 'home.nl', 'xs4all.nl',
  'telfort.nl', 'upcmail.nl', 'casema.nl', 'chello.nl', 'msn.com', 'protonmail.com', 'proton.me'];

export function afstand(a, b) {
  let vorige = [];
  for (let j = 0; j <= b.length; j++) vorige[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const rij = [i];
    for (let j = 1; j <= b.length; j++) {
      rij[j] = Math.min(vorige[j] + 1, rij[j - 1] + 1, vorige[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    vorige = rij;
  }
  return vorige[b.length];
}

/** Geeft het voorgestelde adres, of '' als er niets te verbeteren valt. */
export function emailSuggestie(adres) {
  const m = /^([^@\s]+)@([^@\s]+)$/.exec(String(adres || '').trim().toLowerCase());
  if (!m) return '';
  const domein = m[2].replace(/\.+$/, '');
  if (MAILDOMEINEN.includes(domein)) return '';
  // Kort domein: maximaal één letter verschil, anders wordt live.be ten onrechte live.nl.
  let beste = '';
  let min = domein.length >= 9 ? 3 : 2;
  for (const kandidaat of MAILDOMEINEN) {
    const d = afstand(domein, kandidaat);
    if (d < min) { min = d; beste = kandidaat; }
  }
  if (!beste) {
    const tld = domein.replace(/\.(con|cmo|ocm|vom|xom|co|om)$/, '.com').replace(/\.(nll|nk|bl|ml)$/, '.nl');
    if (tld !== domein) beste = tld;
  }
  return beste ? m[1] + '@' + beste : '';
}
