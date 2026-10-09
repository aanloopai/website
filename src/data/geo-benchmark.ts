// Cijfers uit de GEO Agency Index Nederland (Gold Lemon), editie oktober 2026,
// methode 1.2.1. Bron: https://goldlemon.nl/geo-benchmark/ en het rapport
// /downloads/geo-benchmark/2026-10-rapport.pdf, licentie CC BY 4.0.
// Elke maand (publicatie op de 1e) bijwerken; de guard-test controleert dat
// de top-10 en onze eigen rij compleet zijn en dat de bron vermeld wordt.

export interface BenchmarkRij {
  plaats: number;
  bureau: string;
  genoemdPct: number; // aandeel van de 1.298 antwoorden
  index: number;
  techniek: number;
  aanbod: number;
}

export const GEO_BENCHMARK = {
  naam: 'GEO Agency Index Nederland',
  uitgever: 'Gold Lemon',
  editie: 'oktober 2026',
  methode: '1.2.1',
  meetdatum: '29 september 2026',
  publicatie: '1 oktober 2026',
  volgende: '1 november 2026',
  bronUrl: 'https://goldlemon.nl/geo-benchmark/',
  rapportUrl: 'https://goldlemon.nl/downloads/geo-benchmark/2026-10-rapport.pdf',
  licentie: 'CC BY 4.0',
  vragen: 87,
  engines: 7,
  antwoorden: 1298,
  register: 1497,
  geplaatst: 222,
  weging: { vermeldingen: 50, techniek: 25, aanbod: 25 },
  aanloop: { plaats: 24, genoemdPct: 0.5, genoemdAantal: 7, index: 49.2, techniek: 90.6, aanbod: 100.0, sectorZorgPlaats: 3 },
  top10: [
    { plaats: 1, bureau: 'Citeerbaar', genoemdPct: 12.9, index: 83.0, techniek: 96.9, aanbod: 75.0 },
    { plaats: 2, bureau: 'Timmermans Media', genoemdPct: 10.7, index: 70.8, techniek: 96.9, aanbod: 62.5 },
    { plaats: 3, bureau: 'BDMNL', genoemdPct: 12.2, index: 65.0, techniek: 74.0, aanbod: 50.0 },
    { plaats: 4, bureau: 'Generativ', genoemdPct: 8.4, index: 64.4, techniek: 93.8, aanbod: 50.0 },
    { plaats: 5, bureau: 'GPTBureau', genoemdPct: 15.2, index: 61.0, techniek: 43.9, aanbod: 0.0 },
    { plaats: 6, bureau: 'SmartRanking', genoemdPct: 7.9, index: 60.7, techniek: 72.9, aanbod: 75.0 },
    { plaats: 7, bureau: 'OpsCode', genoemdPct: 6.4, index: 58.6, techniek: 90.6, aanbod: 75.0 },
    { plaats: 8, bureau: 'Maatwerk Online', genoemdPct: 7.8, index: 56.7, techniek: 80.4, aanbod: 62.5 },
    { plaats: 9, bureau: 'Onder', genoemdPct: 10.0, index: 55.4, techniek: 69.2, aanbod: 37.5 },
    { plaats: 10, bureau: 'Pico Yellow', genoemdPct: 6.4, index: 55.1, techniek: 90.5, aanbod: 50.0 },
  ] as BenchmarkRij[],
  // Uit het rapport: herkomst van de bronnen onder de 1.124 antwoorden die een bureau noemen.
  bronnen: [
    { soort: 'Websites van bureaus zelf', pct: 69.8 },
    { soort: 'Overige sites (kennisbanken, blogs, bedrijvengidsen buiten de marketing)', pct: 23.7 },
    { soort: 'Gidsen en vergelijkingssites voor bureaus', pct: 3.6 },
    { soort: 'Vakmedia en platforms (Emerce, Frankwatching, LinkedIn en andere)', pct: 2.9 },
  ],
} as const;
