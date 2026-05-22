// Aanloop AI bedrijfsgegevens — voor op facturen (V4, wettelijk verplicht).
// KvK is bekend (site/schema, 88606902). VUL btwId + adres aan met de echte
// waarden — één plek, hier wijzigen volstaat.

export const BEDRIJF = {
  naam: 'Aanloop AI B.V.',
  kvk: '88606902',
  // TODO — VERVANG deze placeholders door de echte waarden:
  btwId: 'NL______B__', // echt BTW-identificatienummer invullen
  adres: 'STRAAT + HUISNUMMER', // echte vestigingsadres invullen
  postcode: '3011',
  stad: 'Rotterdam',
  land: 'Nederland',
  email: 'hello@aanloopai.nl',
  website: 'aanloopai.nl',
  iban: '', // optioneel — IBAN voor op de factuur
};

export const BTW_TARIEF = 0.21;
