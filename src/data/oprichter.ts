// Eén schakelaar voor de drie technische controles uit de GEO Agency Index
// Nederland die een naam vereisen: "Personen als entiteit vastgelegd",
// "Artikelen met een auteur" en "Koppeling met Wikidata".
//
// Besluit tot nu toe (team/index.astro): de naam van de oprichter wordt niet
// gepubliceerd. Zolang OPRICHTER null is, blijft de site precies zoals hij was.
// Zet de velden hieronder om de Person-entiteit, het auteurschap van alle
// kennisbank-artikelen en de Wikidata-sameAs in één keer live te zetten.
// Guard: test/geo-bureau.test.js controleert dat beide paden geldig blijven.

export interface Oprichter {
  naam: string;            // volledige naam, bijv. 'Voornaam Achternaam'
  functie: string;         // bijv. 'Oprichter en AI-strateeg'
  linkedin: string;        // volledige LinkedIn-profiel-URL
  profielUrl: string;      // pagina op aanloopai.nl die de persoon beschrijft (bijv. '/over/')
  wikidata?: string;       // Q-id van de persoon, alleen als dat item bestaat
}

export const OPRICHTER: Oprichter | null = null;

// Wikidata-item van Aanloop AI (organisatie). Aanmaken via wikidata.org
// (P31 = business, P17 = Nederland, P856 = website, P3220 = KvK 88606902,
// P159 = Rotterdam, P571 = 2023) en hier de Q-id invullen.
export const ORGANISATIE_WIKIDATA: string | null = null;

export const PERSON_ID = 'https://aanloopai.nl/#oprichter';
