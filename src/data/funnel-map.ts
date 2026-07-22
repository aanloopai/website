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
    serviceId: 'whatsapp-bot',
    productKey: 'emma-whatsapp',
    tierNaam: 'Standard',
    sellable: false,
    roiInputs: ['gemiste_gesprekken_week', 'gemiddelde_klantwaarde'],
    fallbackKop: 'Emma beantwoordt uw WhatsApp',
    fallbackTekst: 'Klanten krijgen binnen seconden antwoord, ook buiten kantooruren.',
  },
  {
    serviceId: 'ai-scan-consult',
    productKey: 'ai-scan',
    tierNaam: 'Scan',
    sellable: false,
    roiInputs: [],
    fallbackKop: 'AI-scan voor uw bedrijf',
    fallbackTekst: 'We brengen in kaart waar AI in uw bedrijf het snelst geld oplevert.',
  },
] as const;

export function getFunnelEntry(serviceId: string): FunnelEntry | null {
  return FUNNEL_MAP.find((e) => e.serviceId === serviceId) || null;
}

export function isSellable(serviceId: string): boolean {
  return getFunnelEntry(serviceId)?.sellable === true;
}
