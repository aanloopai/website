import { describe, it, expect } from 'vitest';
import { emailSuggestie } from '../src/lib/email-suggest.js';

describe('emailSuggestie', () => {
  const geeft = [
    ['jan@gmial.com', 'jan@gmail.com'],
    ['jan@gmail.co', 'jan@gmail.com'],
    ['jan@Hotmial.NL', 'jan@hotmail.nl'],
    ['jan@outlok.com', 'jan@outlook.com'],
    ['jan@zigo.nl', 'jan@ziggo.nl'],
    ['jan@bedrijf.con', 'jan@bedrijf.com'],
    ['jan@bedrijf.nll', 'jan@bedrijf.nl'],
  ];
  for (const [i, o] of geeft) it(`${i} -> ${o}`, () => expect(emailSuggestie(i)).toBe(o));

  const niets = ['jan@gmail.com', 'jan@live.nl', 'jan@live.be', 'jan@devries-keukens.nl', 'jan@kpn.nl', '', 'geen-adres', 'a@b@c.nl'];
  for (const i of niets) it(`geen suggestie voor "${i}"`, () => expect(emailSuggestie(i)).toBe(''));
});
