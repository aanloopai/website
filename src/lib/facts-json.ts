// Gedeelde helpers voor de machineleesbare feitenbestanden (/facts.json,
// /pricing.json, /claims.json). Sleutelvolgorde is vast (objecten worden in
// invoegvolgorde geserialiseerd), zodat diffs en caches stabiel blijven.
export const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

/** Datum (ISO) waarop de feiten voor het laatst tegen de bronpagina's zijn nagelopen. */
export const FEITEN_GECONTROLEERD = '2026-10-09';

export const jsonResponse = (data: unknown): Response =>
  new Response(JSON.stringify(data, null, 2) + '\n', { headers: JSON_HEADERS });
