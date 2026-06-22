// A/B Experiment registry — Phase 2 (2026-05-06)
// Centraal register van alle GrowthBook feature-flag keys + DOM-swap utilities.
//
// Gebruik in een Astro <script> blok:
//   import { initExperimentsOnConsent } from '../lib/ab-experiments';
//   initExperimentsOnConsent();
//
// Consent-gate: initGrowthBook() wordt pas aangeroepen na het 'gb-tracking-consent'
// custom event (dispatched door de consent banner na opt-in). Dit borgt AVG-compliance.
//
// Fail-open: als GB-API niet bereikbaar is (timeout 3s in growthbook.ts) blijft
// de statische HTML (control variant) staan — geen broken UX.

import { initGrowthBook, getFeatureValue } from './growthbook';

// ── Experiment keys ──────────────────────────────────────────────────────────

export const EXPERIMENTS = {
  // Homepage
  HOMEPAGE_HERO_COPY: 'homepage-hero-copy',
  HOMEPAGE_CTA_TEXT: 'homepage-cta-text',
  HOMEPAGE_SOCIAL_PROOF: 'homepage-social-proof-placement',

  // Tarieven
  TARIEVEN_LAYOUT: 'tarieven-layout',
  TARIEVEN_CTA_TEXT: 'tarieven-cta-text',

  // Emma
  EMMA_HERO_COPY: 'marco-hero-copy',

  // AI-Website Bundel
  BUNDEL_HERO_COPY: 'bundel-hero-copy',

  // ROI Calculator
  ROI_CALC_FIRST_STEP: 'roi-calc-first-step',
  ROI_EMAIL_CTA: 'roi-email-cta-button-text',
} as const;

// ── Variant copy ─────────────────────────────────────────────────────────────

export const VARIANTS = {
  [EXPERIMENTS.HOMEPAGE_HERO_COPY]: {
    control: {
      headline: 'AI Bureau Nederland voor MKB',
      sub: 'Aanloop AI: hét AI bureau voor Nederlands MKB. AI-receptionist, WhatsApp-agent en custom workflows — live binnen 14 dagen.',
    },
    emotional: {
      headline: 'Stop gemiste leads. Voor altijd.',
      sub: 'Elke onbeantwoorde beller is een lead die naar uw concurrent gaat. Emma pakt 24/7 op — ook zaterdagnacht.',
    },
    roi: {
      headline: 'Bespaar €40k+/jaar op personeelskosten',
      sub: 'MKB-bedrijven die Emma inzetten betalen €497/mnd en elimineren een fulltime receptionist. Terugverdientijd: 6 weken.',
    },
  },
  [EXPERIMENTS.HOMEPAGE_CTA_TEXT]: {
    control: 'Boek een gratis demo',
    scan: 'Gratis AI-scan aanvragen',
    vandaag: 'Start vandaag — live binnen 14 dagen',
  },
  [EXPERIMENTS.TARIEVEN_CTA_TEXT]: {
    control: null as null, // Per-plan tekst ("Start met Starter" etc.) — geen swap
    scan: 'Gratis AI-scan',
    vandaag: 'Plan direct een demo',
  },
  [EXPERIMENTS.EMMA_HERO_COPY]: {
    control: {
      headline: 'Emma — AI Receptionist & AI Telefoniste',
      sub: 'Neemt 24/7 gesprekken aan in vloeiend Nederlands, plant afspraken en levert leads direct in uw inbox.',
    },
    emotional: {
      headline: 'Nooit meer een gemiste klant',
      sub: 'Terwijl u slaapt, werkt, of op de werf staat — Emma pakt elke beller op en zet leads om in afspraken.',
    },
    roi: {
      headline: 'Emma vervangt een €42k/jaar receptionist voor €497/mnd',
      sub: 'Geen ziekte, geen vakantie, geen loonkosten. 24/7 NL-telefoon, CRM-integratie en agenda-planning inbegrepen.',
    },
  },
  [EXPERIMENTS.BUNDEL_HERO_COPY]: {
    control: {
      headline: 'AI-Website Bundel — Website + Emma',
      sub: 'Eén partner voor website én AI automatisering. Eén factuur, één SLA, live binnen 8 weken.',
    },
    emotional: {
      headline: 'Eén partner voor website én AI — eindelijk rust',
      sub: 'Geen "vraag de webdeveloper" meer als de AI bugs heeft. Wij bouwen én beheren alles als één geïntegreerd systeem.',
    },
    roi: {
      headline: 'Bespaar €8–15k in jaar 1 tegenover losse afname',
      sub: 'Bundel jaar 1: €9.514. Losse afname: €19.342. Besparing: €9.828.',
    },
  },
  [EXPERIMENTS.ROI_EMAIL_CTA]: {
    control: 'Stuur rapport per e-mail →',
    b: 'Ontvang mijn ROI-rapport (gratis)',
    c: 'Bereken mijn exacte besparing →',
  },
} as const;

// ── DOM swap utilities ────────────────────────────────────────────────────────

/**
 * Vervang tekst-content van elementen via data-ab attribuut.
 * Enkelvoudig: <button data-ab="homepage-cta-text">…</button>
 * Multi-field: <h1 data-ab="homepage-hero-copy" data-ab-field="headline">…</h1>
 */
function swapText(experimentKey: string, variantData: Record<string, string> | string): void {
  if (typeof variantData === 'string') {
    document.querySelectorAll(`[data-ab="${experimentKey}"]`).forEach((el) => {
      el.textContent = variantData;
    });
    return;
  }
  document.querySelectorAll(`[data-ab="${experimentKey}"]`).forEach((el) => {
    const field = (el as HTMLElement).dataset.abField;
    if (field && field in variantData) {
      el.textContent = variantData[field as keyof typeof variantData];
    }
  });
}

/**
 * Activeer alternatieve layout-sectie (bijv. tarieven cards vs tabel).
 * Beide layouts zijn pre-rendered in statische HTML.
 * Control-sectie: data-ab-layout-group="tarieven-layout" data-ab-layout="control"
 * Variant-sectie: data-ab-layout-group="tarieven-layout" data-ab-layout="table"
 */
function swapLayout(experimentKey: string, variant: string): void {
  document.querySelectorAll(`[data-ab-layout-group="${experimentKey}"]`).forEach((el) => {
    const layoutVariant = (el as HTMLElement).dataset.abLayout;
    (el as HTMLElement).style.display = layoutVariant === variant ? '' : 'none';
  });
}

/**
 * Verplaats social-proof sectie op basis van variant.
 * Markeer de sectie met data-social-proof attribuut.
 * Ankerpunten: .hero-gradient (above-fold) en [data-cta-section] (near-cta).
 */
function swapSocialProofPlacement(variant: string): void {
  const socialProof = document.querySelector('[data-social-proof]') as HTMLElement | null;
  if (!socialProof || variant === 'control') return;

  if (variant === 'above-fold') {
    const hero = document.querySelector('.hero-gradient');
    hero?.parentNode?.insertBefore(socialProof, hero);
  } else if (variant === 'near-cta') {
    const ctaSection = document.querySelector('[data-cta-section]');
    ctaSection?.parentNode?.insertBefore(socialProof, ctaSection);
  }
}

// ── Per-pagina experiment applicators ────────────────────────────────────────

function applyHomepageExperiments(): void {
  const heroVariant = getFeatureValue(EXPERIMENTS.HOMEPAGE_HERO_COPY, 'control');
  if (heroVariant !== 'control') {
    const data = VARIANTS[EXPERIMENTS.HOMEPAGE_HERO_COPY][heroVariant as keyof typeof VARIANTS[typeof EXPERIMENTS.HOMEPAGE_HERO_COPY]];
    if (data) swapText(EXPERIMENTS.HOMEPAGE_HERO_COPY, data as Record<string, string>);
  }

  const ctaVariant = getFeatureValue(EXPERIMENTS.HOMEPAGE_CTA_TEXT, 'control');
  if (ctaVariant !== 'control') {
    const ctaText = VARIANTS[EXPERIMENTS.HOMEPAGE_CTA_TEXT][ctaVariant as keyof typeof VARIANTS[typeof EXPERIMENTS.HOMEPAGE_CTA_TEXT]];
    if (ctaText) swapText(EXPERIMENTS.HOMEPAGE_CTA_TEXT, ctaText);
  }

  swapSocialProofPlacement(getFeatureValue(EXPERIMENTS.HOMEPAGE_SOCIAL_PROOF, 'control'));
}

function applyTarievenExperiments(): void {
  swapLayout(EXPERIMENTS.TARIEVEN_LAYOUT, getFeatureValue(EXPERIMENTS.TARIEVEN_LAYOUT, 'control'));

  const ctaVariant = getFeatureValue(EXPERIMENTS.TARIEVEN_CTA_TEXT, 'control');
  if (ctaVariant !== 'control') {
    const ctaText = VARIANTS[EXPERIMENTS.TARIEVEN_CTA_TEXT][ctaVariant as keyof typeof VARIANTS[typeof EXPERIMENTS.TARIEVEN_CTA_TEXT]];
    if (ctaText) swapText(EXPERIMENTS.TARIEVEN_CTA_TEXT, ctaText);
  }
}

function applyEmmaExperiments(): void {
  const heroVariant = getFeatureValue(EXPERIMENTS.EMMA_HERO_COPY, 'control');
  if (heroVariant !== 'control') {
    const data = VARIANTS[EXPERIMENTS.EMMA_HERO_COPY][heroVariant as keyof typeof VARIANTS[typeof EXPERIMENTS.EMMA_HERO_COPY]];
    if (data) swapText(EXPERIMENTS.EMMA_HERO_COPY, data as Record<string, string>);
  }

  // CTA gedeeld met homepage-cta-text experiment
  const ctaVariant = getFeatureValue(EXPERIMENTS.HOMEPAGE_CTA_TEXT, 'control');
  if (ctaVariant !== 'control') {
    const ctaText = VARIANTS[EXPERIMENTS.HOMEPAGE_CTA_TEXT][ctaVariant as keyof typeof VARIANTS[typeof EXPERIMENTS.HOMEPAGE_CTA_TEXT]];
    if (ctaText) swapText(EXPERIMENTS.HOMEPAGE_CTA_TEXT, ctaText);
  }
}

function applyBundelExperiments(): void {
  const heroVariant = getFeatureValue(EXPERIMENTS.BUNDEL_HERO_COPY, 'control');
  if (heroVariant !== 'control') {
    const data = VARIANTS[EXPERIMENTS.BUNDEL_HERO_COPY][heroVariant as keyof typeof VARIANTS[typeof EXPERIMENTS.BUNDEL_HERO_COPY]];
    if (data) swapText(EXPERIMENTS.BUNDEL_HERO_COPY, data as Record<string, string>);
  }
}

function applyRoiCalcExperiments(): void {
  // roi-email-cta-button-text is al geïmplementeerd in ai-roi-calculator.astro.
  // roi-calc-first-step: progressive disclosure — toon eerst 2 sliders.
  const stepVariant = getFeatureValue(EXPERIMENTS.ROI_CALC_FIRST_STEP, 'control');
  if (stepVariant === 'simple') {
    const extraSliders = document.querySelectorAll('[data-roi-slider-extra]');
    extraSliders.forEach((el) => { (el as HTMLElement).style.display = 'none'; });

    const revealBtn = document.querySelector('[data-roi-reveal-sliders]') as HTMLElement | null;
    if (revealBtn) {
      revealBtn.style.display = '';
      revealBtn.addEventListener('click', () => {
        extraSliders.forEach((el) => { (el as HTMLElement).style.display = ''; });
        revealBtn.style.display = 'none';
      }, { once: true });
    }
  }
}

// ── Page router ──────────────────────────────────────────────────────────────

const PAGE_APPLICATORS: Record<string, () => void> = {
  '/': applyHomepageExperiments,
  '/tarieven/': applyTarievenExperiments,
  '/tarieven': applyTarievenExperiments,
  '/diensten/emma/': applyEmmaExperiments,
  '/diensten/emma': applyEmmaExperiments,
  '/diensten/ai-website-bundel-mkb-nederland/': applyBundelExperiments,
  '/diensten/ai-website-bundel-mkb-nederland': applyBundelExperiments,
  '/ai-roi-calculator/': applyRoiCalcExperiments,
  '/ai-roi-calculator': applyRoiCalcExperiments,
};

// ── Flicker-preventie ────────────────────────────────────────────────────────

function hideTestElements(): void {
  const style = document.createElement('style');
  style.id = 'ab-hide-style';
  style.textContent = '[data-ab],[data-ab-layout-group],[data-social-proof]{opacity:0;transition:opacity 0.15s}';
  document.head.appendChild(style);
  setTimeout(revealTestElements, 400); // fail-open timeout
}

function revealTestElements(): void {
  document.getElementById('ab-hide-style')?.remove();
}

// ── Consent-gate entry point ─────────────────────────────────────────────────

/**
 * Hoofd-entry point. Roep aan in elke pagina-<script>.
 * Luistert op 'gb-tracking-consent' event (dispatched door consent banner na opt-in).
 * Als consent al eerder in deze sessie gegeven was, start direct.
 *
 * Consent banner aanpassing (één regel toevoegen in accept handler):
 *   window.dispatchEvent(new CustomEvent('gb-tracking-consent'));
 */
export function initExperimentsOnConsent(): void {
  hideTestElements();

  const run = async () => {
    try {
      await initGrowthBook();
      const path = typeof location !== 'undefined' ? location.pathname : '/';
      const applicator = PAGE_APPLICATORS[path];
      if (applicator) applicator();
    } catch (err) {
      console.warn('[ab-experiments] apply failed, showing control:', err);
    } finally {
      revealTestElements();
    }
  };

  // Consent al eerder gegeven in deze sessie
  try {
    if (sessionStorage.getItem('gb-consent') === '1') {
      void run();
      return;
    }
  } catch { /* private browsing — val door naar event listener */ }

  window.addEventListener(
    'gb-tracking-consent',
    () => {
      try { sessionStorage.setItem('gb-consent', '1'); } catch { /* private browsing */ }
      void run();
    },
    { once: true }
  );

  // Reveal na 400ms als consent snel dismissed wordt (geen swap nodig)
  setTimeout(revealTestElements, 400);
}
