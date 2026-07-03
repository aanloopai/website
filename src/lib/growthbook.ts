// GrowthBook SDK helper — lazy-init singleton voor client-side experiments.
// Self-host: gb-api.aanloopai.nl (zie memory aanloop_growthbook_infra.md)
//
// Gebruik in een Astro <script>-blok of component:
//   import { initGrowthBook, getFeatureValue } from '../lib/growthbook';
//   await initGrowthBook();
//   const buttonText = getFeatureValue('roi-email-cta-button-text', 'default →');
//
// thirdPartyTrackingPlugin stuurt experiment_viewed events automatisch naar GA4
// (Aanloop heeft GA4 measurement id G-VS8SZZ6W45 actief in BaseLayout.astro).

import { GrowthBook } from '@growthbook/growthbook';
import {
  autoAttributesPlugin,
  thirdPartyTrackingPlugin,
} from '@growthbook/growthbook/plugins';

const GB_API_HOST = 'https://gb-api.aanloopai.nl';
const GB_CLIENT_KEY = 'sdk-rCwWmUBjbXcmteRx';
const ANON_ID_KEY = 'aanloop_anon_id';

type GBInstance = InstanceType<typeof GrowthBook>;

let _instance: GBInstance | null = null;
let _initPromise: Promise<GBInstance> | null = null;

// Persistent anonymous user-ID — eenmaal in localStorage, daarna stabiel.
// Gebruikt door GrowthBook voor sticky bucketing (zelfde gebruiker krijgt zelfde variant).
function getAnonId(): string {
  try {
    if (typeof localStorage === 'undefined') return 'anon-' + Math.random().toString(36).slice(2, 10);
    let id = localStorage.getItem(ANON_ID_KEY);
    if (!id) {
      // RFC 4122 v4 UUID via crypto.randomUUID() (alle moderne browsers)
      id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'anon-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
      try { localStorage.setItem(ANON_ID_KEY, id); } catch { /* private browsing — laat staan in-memory */ }
    }
    return id;
  } catch {
    // localStorage volledig ontoegankelijk (storage-locked/sandboxed/private browser —
    // sommige browsers gooien al bij de getter, niet pas bij getItem/setItem).
    // Val terug op een in-memory random id zodat init() niet crasht.
    return 'anon-' + Math.random().toString(36).slice(2, 10);
  }
}

export async function initGrowthBook(): Promise<GBInstance> {
  if (_instance) return _instance;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const gb = new GrowthBook({
        apiHost: GB_API_HOST,
        clientKey: GB_CLIENT_KEY,
        // DevMode toont GrowthBook DevTools op de pagina — alleen tijdens lokaal `astro dev`
        enableDevMode: import.meta.env.DEV ?? false,
        attributes: {
          id: getAnonId(),
          url: typeof location !== 'undefined' ? location.pathname : '/',
        },
        plugins: [
          autoAttributesPlugin(),
          thirdPartyTrackingPlugin({ trackers: ['ga4'] }),
        ],
      });

      try {
        // Streaming: SSE-update als feature flags wijzigen tijdens de sessie.
        // Timeout zodat we niet eindeloos wachten als gb-api offline is.
        await Promise.race([
          gb.init({ streaming: true }),
          new Promise<void>((_, reject) => setTimeout(() => reject(new Error('GrowthBook init timeout')), 3000)),
        ]);
      } catch (err) {
        // Fail open: als de GB API onbereikbaar is, gebruiken we default values overal.
        // Dit voorkomt dat een GB-outage de hele site breekt.
        console.warn('[growthbook] init failed, using defaults:', err);
      }

      _instance = gb;
      return gb;
    } catch (err) {
      // Self-heal: iets onverwachts ging mis vóór/tijdens init (bv. GrowthBook-constructor
      // of een plugin die crasht — getAnonId() zelf kan hier niet meer voor zorgen, die is
      // al fail-safe). Reset de singleton-promise zodat een volgende initGrowthBook()-call
      // vers opnieuw probeert i.p.v. voor altijd dezelfde rejected promise terug te geven.
      _initPromise = null;
      throw err;
    }
  })();

  return _initPromise;
}

export function getFeatureValue<T>(key: string, fallback: T): T {
  if (!_instance) return fallback;
  return _instance.getFeatureValue<T>(key, fallback);
}

export function isOn(key: string): boolean {
  if (!_instance) return false;
  return _instance.isOn(key);
}
