// Aanloop AI bedrijfsgegevens — voor op facturen (V4, wettelijk verplicht).
// KvK is bekend (site/schema, 88606902). VUL btwId + adres aan met de echte
// waarden — één plek, hier wijzigen volstaat.

export const BEDRIJF = {
  naam: 'Aanloop AI',
  kvk: '88606902',
  btwId: 'NL004672676B48',
  adres: 'Blokfluit 31',
  postcode: '3068 KZ',
  stad: 'Rotterdam',
  land: 'Nederland',
  email: 'hello@aanloopai.nl',
  website: 'aanloopai.nl',
  iban: '', // optioneel — IBAN voor op de factuur
};

export const BTW_TARIEF = 0.21;
