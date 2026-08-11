// Koppeling tussen de wizard op /start en de verkoopbare catalogus.
// De wizard kent dienst-ids (voice-agent, ...), de catalogus kent product_keys
// (emma-telefoon, ...). Zonder deze tabel kan een voorstel nooit een order worden.
//
// sellable = dit product richt zichzelf vandaag aantoonbaar in. Verkoop nooit
// iets dat handmatig geleverd moet worden; dat is precies het telefoontje dat
// deze funnel opheft. agenda-assistant gaat op sellable in plak B, samen met
// zijn provisioner. whatsapp-bot hangt op Meta Tech-Provider-status (spec §8).
// ai-scan-consult verkoopt vandaag een persoonlijk adviesgesprek — automatisch
// leveren zou er een ander product van maken; dat is een eigenaarsbeslissing.

export interface FunnelEntry {
  readonly serviceId: string;
  readonly productKey: string;
  /** Exacte catalogusnaam van de tier — deze string staat zo in D1 (service_orders.tier). */
  readonly tierNaam: string;
  readonly sellable: boolean;
  /** Namen van de antwoordvelden die de ROI-berekening nodig heeft. */
  readonly roiInputs: readonly string[];
  /** Statische copy wanneer de LLM-framing faalt. De funnel mag nooit omvallen. */
  readonly fallbackKop: string;
  readonly fallbackTekst: string;
}

export const FUNNEL_MAP: readonly FunnelEntry[] = [
  {
    serviceId: 'voice-agent',
    productKey: 'emma-telefoon',
    tierNaam: 'Starter',
    sellable: true,
    roiInputs: ['gemiste_gesprekken_week', 'gemiddelde_klantwaarde'],
    fallbackKop: 'Emma neemt vanaf volgende week uw telefoon aan',
    fallbackTekst:
      'Emma beantwoordt inkomende gesprekken 24/7 in het Nederlands, plant afspraken in en legt elke lead vast. '
      + 'U hoeft geen gesprek meer te missen omdat u aan het werk was.',
  },
  {
    serviceId: 'agenda-assistant',
    productKey: 'emma-telefoon',
    tierNaam: 'Starter',
    sellable: false,
    roiInputs: ['gemiste_gesprekken_week', 'gemiddelde_klantwaarde'],
    fallbackKop: 'Uw agenda, automatisch gevuld',
    fallbackTekst: 'Afspraken worden direct in uw agenda gezet, zonder heen-en-weer gemail.',
  },
  {
    // Owner-besluit 2026-08-11: het standalone catalogusproduct 'emma'
    // (WhatsApp/chat-assistent, Lite/Standard) is geschrapt — WhatsApp is nu
    // uitsluitend een inbegrepen kanaal van 'emma-telefoon'. Deze intake-entry
    // wijst daarom naar diezelfde tier; een lead die WhatsApp-automatisering
    // wil krijgt een voorstel op basis van Emma AI-receptie (vanaf €497/mnd).
    serviceId: 'whatsapp-bot',
    productKey: 'emma-telefoon',
    tierNaam: 'Starter',
    sellable: false,
    roiInputs: ['gemiste_gesprekken_week', 'gemiddelde_klantwaarde'],
    fallbackKop: 'WhatsApp zit inbegrepen bij Emma',
    fallbackTekst: 'Emma (vanaf €497/mnd) beantwoordt uw WhatsApp-berichten binnen seconden, ook buiten kantooruren — als onderdeel van dezelfde AI-receptie die ook de telefoon opneemt.',
  },
  // ai-scan-consult heeft BEWUST geen entry: het verkoopt vandaag een
  // persoonlijk adviesgesprek (lead + intake, start.astro), geen
  // catalogusproduct. Automatisch leveren zou er een ander product van maken
  // — een eigenaarsbeslissing die nog niet genomen is (spec §3). Een
  // verzonnen productKey/tierNaam zou de catalogus-controle hieronder alleen
  // laten slagen door te doen alsof dat product al bestaat; getFunnelEntry()
  // geeft voor deze dienst dus terecht null, en isSellable() daarmee false —
  // exact het gedrag van vandaag (getest in funnel-map.test.js).
] as const;

export function getFunnelEntry(serviceId: string): FunnelEntry | null {
  return FUNNEL_MAP.find((e) => e.serviceId === serviceId) || null;
}

export function isSellable(serviceId: string): boolean {
  return getFunnelEntry(serviceId)?.sellable === true;
}
