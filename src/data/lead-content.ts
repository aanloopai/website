// Gedeelde teksten voor /leads-kopen/* — één bron voor zekerheden, stappen en
// algemene FAQ, zodat hub, sectorpagina's en subpagina's niet uit elkaar lopen.
// Zelfde spelregels als lead-sectors.ts: geen prijzen, geen verzonnen cijfers.

export const RECLAMATIE_TERMIJN = '48 uur';

export const LEAD_ZEKERHEDEN = [
  { titel: 'Exclusief', body: 'Een aanvraag gaat naar één partner. Wij verkopen dezelfde aanvraag niet nog eens aan een concurrent in uw regio.' },
  { titel: 'Betalen per lead', body: 'Geen abonnement, geen instapkosten, geen minimumafname. U betaalt per geleverde, geldige lead; wij factureren maandelijks achteraf.' },
  { titel: `Reclamatie binnen ${RECLAMATIE_TERMIJN}`, body: 'Onbereikbaar, foutieve gegevens, buiten uw regio of dubbel? Meld het binnen 48 uur en de lead wordt niet in rekening gebracht.' },
  { titel: 'AVG-conform', body: 'De aanvrager geeft bij het formulier toestemming om zijn gegevens aan één bedrijf door te geven. Wij leggen die toestemming vast en delen alleen de velden die u nodig heeft.' },
] as const;

export const LEAD_STAPPEN = [
  { titel: 'U meldt zich aan', body: 'Branche, regio (postcodegebieden), verwacht volume en of u exclusiviteit wilt. Wij bellen binnen één werkdag om de prijs per lead en de levering af te spreken.' },
  { titel: 'Wij vangen de vraag op', body: 'Via eigen vergelijk- en informatiesites, zoekmachines en AI-assistenten komen aanvragers bij ons intakeformulier: budget, wens, regio, termijn en toestemming.' },
  { titel: 'Controle en toewijzing', body: 'Elke aanvraag wordt gecontroleerd op bereikbaarheid, volledigheid en regio. Past hij bij uw profiel, dan wordt hij exclusief aan u toegewezen.' },
  { titel: 'Levering en opvolging', body: 'U ontvangt de lead per e-mail en desgewenst via WhatsApp of een CSV/CRM-koppeling, met alle velden en het moment van aanvraag. U belt, wij houden de status bij.' },
] as const;

export const LEAD_FAQ_ALGEMEEN = [
  { q: 'Wat kost een lead?', a: 'De prijs per lead spreken we per partner af; hij hangt af van branche, regio, exclusiviteit en volume. Er is geen abonnement en geen instapbedrag. Wij factureren maandelijks achteraf op basis van het aantal geleverde, geldige leads.' },
  { q: 'Wanneer is een lead geldig?', a: 'Als de aanvrager bereikbaar is op de opgegeven gegevens, de aanvraag uit uw regio komt, bij uw branche past en niet dubbel is. Voldoet een lead daar niet aan, dan meldt u dat binnen 48 uur en vervalt hij van de factuur.' },
  { q: 'Hoe zit het met de AVG?', a: 'De aanvrager geeft op het formulier expliciet toestemming om zijn gegevens aan één bedrijf door te geven voor een offerte of kennismaking. Wij bewaren die toestemming. Na levering bent u zelf verantwoordelijk voor een zorgvuldige opvolging en verwerking; wij verkopen de gegevens niet door.' },
] as const;
