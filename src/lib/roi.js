// ROI-berekening voor het gepersonaliseerde voorstel.
//
// Bewust een pure, deterministische functie: deze getallen staan straks als
// concrete belofte op een verkooppagina. Een taalmodel mag ze framen, nooit
// produceren. Ontbrekende input levert een eerlijk bereik of helemaal niets —
// nooit een verzonnen puntgetal.

/** Gemiddeld aantal weken per maand (365 / 7 / 12). */
export const WEKEN_PER_MAAND = 4.33;
/** Aandeel gemiste gesprekken dat bij directe opvolging klant zou worden. */
export const CONVERSIE_LAAG = 0.15;
export const CONVERSIE_PUNT = 0.30;
export const CONVERSIE_HOOG = 0.45;
/** Bovengrenzen tegen absurde of kwaadwillende invoer. */
const MAX_GESPREKKEN_WEEK = 200;
const MAX_KLANTWAARDE = 100000;
/** Gebruikt voor het bereik wanneer de klantwaarde niet is opgegeven. */
const KLANTWAARDE_LAAG = 150;
const KLANTWAARDE_HOOG = 750;

function positiefGetal(raw, max) {
  const n = Number(String(raw ?? '').replace(',', '.').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(n, max);
}

export function berekenRoi(answers) {
  const perWeek = positiefGetal(answers?.gemiste_gesprekken_week, MAX_GESPREKKEN_WEEK);
  const waarde = positiefGetal(answers?.gemiddelde_klantwaarde, MAX_KLANTWAARDE);

  const aannames = {
    wekenPerMaand: WEKEN_PER_MAAND,
    conversie: CONVERSIE_PUNT,
    conversieLaag: CONVERSIE_LAAG,
    conversieHoog: CONVERSIE_HOOG,
  };

  if (!perWeek) {
    return {
      modus: 'geen',
      gemistPerMaand: null,
      verliesPerMaandCent: null,
      verliesLaagCent: null,
      verliesHoogCent: null,
      aannames,
    };
  }

  const gemistPerMaand = Math.round(perWeek * WEKEN_PER_MAAND);

  if (waarde) {
    return {
      modus: 'punt',
      gemistPerMaand,
      verliesPerMaandCent: Math.round(perWeek * WEKEN_PER_MAAND * CONVERSIE_PUNT * waarde * 100),
      verliesLaagCent: Math.round(perWeek * WEKEN_PER_MAAND * CONVERSIE_LAAG * waarde * 100),
      verliesHoogCent: Math.round(perWeek * WEKEN_PER_MAAND * CONVERSIE_HOOG * waarde * 100),
      aannames: { ...aannames, klantwaarde: waarde },
    };
  }

  return {
    modus: 'bereik',
    gemistPerMaand,
    verliesPerMaandCent: null,
    verliesLaagCent: Math.round(perWeek * WEKEN_PER_MAAND * CONVERSIE_LAAG * KLANTWAARDE_LAAG * 100),
    verliesHoogCent: Math.round(perWeek * WEKEN_PER_MAAND * CONVERSIE_HOOG * KLANTWAARDE_HOOG * 100),
    aannames: { ...aannames, klantwaardeLaag: KLANTWAARDE_LAAG, klantwaardeHoog: KLANTWAARDE_HOOG },
  };
}
