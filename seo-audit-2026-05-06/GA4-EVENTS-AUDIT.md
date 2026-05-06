# GA4 Events Audit & Looker Studio Dashboard Plan
## aanloopai.nl — Phase 2 Conversion Tracking

**Datum:** 2026-05-06
**GA4 Measurement ID:** G-VS8SZZ6W45
**GTM Container:** Geen aparte GTM-container — GA4 wordt rechtstreeks via `gtag.js` geladen (lazy-loaded na eerste user-interactie)

---

## 1. Huidige GA4-configuratie

### Wat werkt correct

| Component | Status | Details |
|-----------|--------|---------|
| GA4 Measurement ID | LIVE | `G-VS8SZZ6W45` in BaseLayout.astro:285 |
| Consent Mode v2 | CORRECT | Default `analytics_storage: denied`; update na cookie-accept |
| Lazy GTM loading | GOED | Script loaded on scroll/click/idle — bespaart ~1500ms TBT |
| Geen GTM-container | OPZETTELIJK | Geen GTM-container; alleen direct `gtag.js`. Beperkt server-side tagging maar vereenvoudigt CSP |
| Cookie banner | WERKT | Lokale `aanloop_cookie_consent` key; Consent Mode update correct |

### Wat ontbreekt

- Geen enkel conversion-event buiten `gratis-ai-scan.astro`
- Geen `purchase` / `generate_lead` events met `value`-parameters
- Geen telefoonklik-tracking
- Geen WhatsApp-klik-tracking
- Geen ROI-calculator tracking
- Geen demo-formulier stap-tracking
- Geen aanvragen/checkout tracking
- Geen contact-formulier tracking

---

## 2. Existing Event Tracking — Inventarisatie

### AANWEZIG (gratis-ai-scan.astro)

| Event | Bestand | Parameters |
|-------|---------|------------|
| `scan_started` | gratis-ai-scan.astro:881 | `{}` |
| `scan_step_completed` | gratis-ai-scan.astro:850 | `{ step, qid }` |
| `scan_finished` | gratis-ai-scan.astro:836 | `{ scan_score, scan_tier }` |
| `scan_email_sent` | gratis-ai-scan.astro:939 | `{}` |

### ONTBREEKT — Conversie-events

| Event | Pagina | Prioriteit |
|-------|--------|------------|
| `generate_lead` (demo aanvraag submission) | demo-aanvragen.astro | P0 KRITISCH |
| `purchase` of `generate_lead` (aanvragen checkout) | aanvragen.astro | P0 KRITISCH |
| `phone_click` | Header, Footer, Contact, alle pagina's | P1 HOOG |
| `whatsapp_click` | Header, BaseLayout sticky CTA, Footer | P1 HOOG |
| `roi_calculator_started` | ai-roi-calculator.astro | P1 HOOG |
| `roi_calculator_result_viewed` | ai-roi-calculator.astro | P1 HOOG |
| `roi_email_submitted` | ai-roi-calculator.astro | P1 HOOG |
| `contact_form_submit` | contact.astro | P1 HOOG |
| `demo_form_started` | demo-aanvragen.astro | P2 MIDDEL |
| `demo_step_2_completed` | demo-aanvragen.astro | P2 MIDDEL |
| `roi_preset_selected` | ai-roi-calculator.astro | P2 MIDDEL |
| `roi_pdf_downloaded` | ai-roi-calculator.astro | P2 MIDDEL |
| `plan_selected` | aanvragen.astro | P2 MIDDEL |
| `billing_toggle` | aanvragen.astro | P3 LAAG |

---

## 3. Aanbevolen Events met Code-patches

### 3.1 Globale tracking helper + phone/WhatsApp delegate (BaseLayout.astro)

Voeg toe aan het bestaande `<script is:inline>` Consent Mode blok, direct na
`gtag('config', 'G-VS8SZZ6W45', { ... });`:

```js
// Global fail-safe event helper
window._track = function(name, params) {
  try {
    if (window.gtag) window.gtag('event', name, params || {});
    if (Array.isArray(window.dataLayer)) window.dataLayer.push(Object.assign({ event: name }, params || {}));
  } catch(e) {}
};
// Phone-click delegation (werkt ook na lazy DOM-injectie van ElevenLabs widget)
document.addEventListener('click', function(e) {
  var a = e.target && e.target.closest ? e.target.closest('a[href^="tel:"]') : null;
  if (a) window._track('phone_click', { link_url: a.href, link_text: (a.textContent || '').trim() });
});
// WhatsApp-click delegation
document.addEventListener('click', function(e) {
  var a = e.target && e.target.closest ? e.target.closest('a[href*="wa.me"]') : null;
  if (a) window._track('whatsapp_click', { link_url: a.href });
});
```

**CSP-note:** Geen externe resources toegevoegd. `window._track` hergebruikt
bestaande `gtag` functie. Geen nieuwe CSP-entries nodig. Idempotent: guard
`if (!window._track)` optioneel maar niet vereist door lazy-load volgorde.

---

### 3.2 Demo-aanvragen form tracking (demo-aanvragen.astro)

Voeg toe in de bestaande `<script>` tag, na de bestaande click-event bindings:

```typescript
// Form start tracking (eenmalig bij eerste stap-2 poging)
let _demoStarted = false;
document.getElementById('naar-stap-2')?.addEventListener('click', () => {
  if (!_demoStarted && v1()) {
    _demoStarted = true;
    (window as any)._track?.('demo_form_started', { form_name: 'demo_aanvraag' });
  }
});

// Stap 2 voltooid
document.getElementById('naar-stap-3')?.addEventListener('click', () => {
  if (v2()) {
    (window as any)._track?.('demo_form_step2_completed', {
      form_name: 'demo_aanvraag',
      sector: (document.getElementById('sector') as HTMLSelectElement)?.value || '',
    });
  }
});
```

In het `submit` success-blok, **voor** `window.location.href = '/demo-bedankt/'`:

```typescript
(window as any)._track?.('generate_lead', {
  form_name: 'demo_aanvraag',
  currency: 'EUR',
  value: 200,
});
```

---

### 3.3 Aanvragen/checkout tracking (aanvragen.astro)

In het checkout-form submit success-blok, **voor** `window.location.href = '/bedankt/?type=aanvraag'`:

```typescript
const _planParam = new URLSearchParams(window.location.search).get('plan') || 'groei';
const _planValues: Record<string, number> = { starter: 597, groei: 1197 };
const _planValue = _planValues[_planParam] || 597;
(window as any)._track?.('purchase', {
  transaction_id: 'aanvraag_' + Date.now(),
  currency: 'EUR',
  value: _planValue,
  items: [{ item_name: 'Aanloop AI ' + _planParam, price: _planValue, quantity: 1 }],
});
```

Track plan-intent bij page-load (URL params):

```typescript
document.addEventListener('DOMContentLoaded', () => {
  const _plan = new URLSearchParams(window.location.search).get('plan') || 'groei';
  (window as any)._track?.('plan_page_viewed', { plan_name: _plan });
});
```

---

### 3.4 ROI Calculator tracking (ai-roi-calculator.astro)

Bovenaan de bestaande `<script>` tag (na imports):

```typescript
let _roiTrackTimer: ReturnType<typeof setTimeout> | null = null;
let _roiStarted = false;
```

In `updateCalc()`, na de resultaten-update sectie:

```typescript
if (!_roiStarted) {
  _roiStarted = true;
  (window as any)._track?.('roi_calculator_started', {});
}
if (_roiTrackTimer) clearTimeout(_roiTrackTimer);
_roiTrackTimer = setTimeout(() => {
  const _sectorEl = document.getElementById('sector') as HTMLSelectElement;
  (window as any)._track?.('roi_calculator_result_viewed', {
    roi_total: Math.round(totalSaving),
    roi_tier: tierLabel,
    roi_payback_months: Math.round(paybackMonths),
    roi_sector: _sectorEl?.options[_sectorEl.selectedIndex]?.textContent || '',
  });
}, 3000);
```

In `applyPreset()`, na `updateCalc()`:

```typescript
(window as any)._track?.('roi_preset_selected', {
  preset_id: card.getAttribute('data-preset') || '',
});
```

In `downloadPdf()`, na `btnText.textContent = 'PDF wordt gegenereerd…'`:

```typescript
(window as any)._track?.('roi_pdf_downloaded', {});
```

In het email-capture success-blok, na `showEmailMsg(...)`:

```typescript
(window as any)._track?.('roi_email_submitted', { currency: 'EUR', value: 50 });
```

---

### 3.5 Contact form tracking (contact.astro)

In het contact-form fetch success-blok, voor de redirect:

```typescript
const _ctype = (document.querySelector('input[name="type"]:checked') as HTMLInputElement)?.value || 'contact';
const _cvals: Record<string, number> = { demo: 200, offerte: 300, contact: 50 };
(window as any)._track?.('generate_lead', {
  form_name: 'contact_form',
  contact_type: _ctype,
  currency: 'EUR',
  value: _cvals[_ctype] || 50,
});
```

---

## 4. Looker Studio Dashboard Template

### Vereiste verbindingen

1. **GA4 Data Source:** Property `G-VS8SZZ6W45` — aanloopai.nl
2. **Google Search Console:** aanloopai.nl eigendom (URL-prefix)
3. **Datumbereik default:** Laatste 90 dagen, vergelijking vorige periode

### Tab 1 — Organisch Verkeer

**Scorecard row:** Sessies (Organic) | Gebruikers | Gem. sessieduur | Bouncepercentage

**Tijdlijn:** `date` x `sessions` (Organic) + `conversions` (dual-axis, 7-daags voortschrijdend)

**Tabel — Top-pagina's:**
Dimensies: `pagePath`
Metrics: `screenPageViews`, `sessions`, `bounceRate`, `averageSessionDuration`
Filter: Channel = Organic Search

---

### Tab 2 — Conversion Funnel

**Funnel-visualisatie (stappen):**

| # | Event / Segment | Omschrijving |
|---|-----------------|--------------|
| 1 | Alle organische sessies | Verkeer |
| 2 | `roi_calculator_started` OR `scan_started` | Tool-engagement |
| 3 | `demo_form_started` OR `generate_lead` (contact) | Lead-intent |
| 4 | `generate_lead` (form=demo_aanvraag) | Demo aangevraagd |
| 5 | `purchase` | Aanvraag voltooid |

**Scorecard row:**
`generate_lead` count | `purchase` count | `purchase` value | `whatsapp_click` count | `phone_click` count

**Tijdlijn:** `generate_lead` events per dag

---

### Tab 3 — Per-Page Performance

**Tabel — Converting pages:**
Dimensie: `pagePath`
Metrics: `sessions`, `conversions` (lead events), Conversie Rate (`conversions/sessions`)
Sort: Conversie Rate desc

**Tabel — High Bounce pages:**
Dimensie: `pagePath`
Metrics: `sessions`, `bounceRate`, `averageSessionDuration`
Filter: `sessions > 50`

---

### Tab 4 — SEO Health (GSC)

**Scorecard row (GSC):** Impressies | Klikken | Gem. CTR | Gem. Positie

**Tijdlijn:** Impressies + Klikken (weekly, dual-axis)

**Tabel — Top queries:**
Dimensie: `query` | Metrics: `impressions`, `clicks`, `ctr`, `position` | Filter: `impressions > 10`

**Tabel — Top pagina's in GSC:**
Dimensie: `page` | Metrics: `impressions`, `clicks`, `ctr`, `position`

---

## 5. Conversion Goals & ROI-Waarden

Markeer als Conversion in GA4 Admin > Events > Mark as conversion:

| Event | Geschatte Waarde (EUR) | Toelichting |
|-------|------------------------|-------------|
| `generate_lead` (form=demo_aanvraag) | 200 | 15% close rate × €1.197 gem. MRR |
| `generate_lead` (form=contact_form, type=demo) | 200 | Zelfde pipeline |
| `generate_lead` (form=contact_form, type=offerte) | 300 | Hogere purchase-intent |
| `purchase` (plan=starter) | 597 | Starter abonnementsprijs/mnd |
| `purchase` (plan=groei) | 1197 | Groei abonnementsprijs/mnd |
| `roi_email_submitted` | 50 | Email-capture lead (lagere intent) |
| `scan_finished` | 30 | Scan-completion (funnel indicator) |
| `phone_click` | 100 | Hoge-intent direct contact |
| `whatsapp_click` | 80 | Hoge-intent direct contact |

**SEO ROI-formule:**
```
SEO ROI (%) = ((Organische conversie-waarde/mnd - SEO-kosten/mnd) / SEO-kosten/mnd) × 100
```

Voorbeeld: 5 demo-leads via organisch per maand = 5 × €200 = €1.000 pipeline-waarde.

---

## 6. Microsoft Clarity — Gratis Heatmaps

### Stap 1: Signup
Maak een project aan op [clarity.microsoft.com](https://clarity.microsoft.com) voor `aanloopai.nl`.

### Stap 2: Snippet

Voeg toe aan BaseLayout.astro, na de bestaande Consent Mode `<script is:inline>`:

```html
<!-- Microsoft Clarity — heatmaps & session recordings (laden alleen na cookie-consent) -->
<script is:inline>
  (function(){
    function loadClarity(){
      try { if (localStorage.getItem('aanloop_cookie_consent') !== 'all') return; } catch(e){ return; }
      if (window.clarity) return;
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
      })(window,document,"clarity","script","CLARITY_PROJECT_ID");
    }
    window.addEventListener('click', loadClarity, { once: true, passive: true });
    if ('requestIdleCallback' in window) {
      requestIdleCallback(function(){ setTimeout(loadClarity, 5000); });
    } else {
      setTimeout(loadClarity, 6000);
    }
  })();
</script>
```

Vervang `CLARITY_PROJECT_ID` met uw project ID uit het Clarity dashboard.

**CSP:** Voeg `*.clarity.ms` toe aan `script-src` en `connect-src` als u een strikte CSP header heeft.

### Top 10 pagina's voor heatmap-analyse

| Prio | Pagina | Reden |
|------|--------|-------|
| 1 | `/` (homepage) | Hoogste volume, primaire entry point |
| 2 | `/ai-roi-calculator/` | Tool-pagina — zie waar users afhaken bij sliders |
| 3 | `/demo-aanvragen/` | Conversie-pagina — form drop-off analyse |
| 4 | `/tarieven/` | Pricing — click-tracking op plan-knoppen |
| 5 | `/diensten/marco/` | Meest bezochte dienst-pagina |
| 6 | `/gratis-ai-scan/` | AI-scan wizard — stap-drop-off per vraag |
| 7 | `/aanvragen/` | Checkout — hoogste-waarde conversie-pagina |
| 8 | `/ai-receptionist-nederland/` | Pillar-page — funnel-entry analyse |
| 9 | `/contact/` | Form-pagina — field-niveau heatmaps |
| 10 | `/diensten/emma/` | WhatsApp product — scroll-diepte & engagement |

---

## 7. Implementatie-volgorde (ROI hoog naar laag)

| Stap | Actie | Bestand | Tijdsinvestering |
|------|-------|---------|-----------------|
| 1 | `window._track` helper + phone/WA delegation | BaseLayout.astro | 10 min |
| 2 | `generate_lead` in demo-form submit | demo-aanvragen.astro | 5 min |
| 3 | `purchase` in checkout submit | aanvragen.astro | 5 min |
| 4 | ROI calculator events (started + result_viewed) | ai-roi-calculator.astro | 15 min |
| 5 | Contact form `generate_lead` | contact.astro | 5 min |
| 6 | Events markeren als Conversions in GA4 Admin | GA4 UI | 10 min |
| 7 | Looker Studio dashboard aanmaken | Looker Studio UI | 60 min |
| 8 | Microsoft Clarity snippet + project aanmaken | BaseLayout.astro + UI | 15 min |

**Geen codemod nodig:** De patches in sectie 3 zijn kleine, gerichte injectie-punten in bestaande
event-handlers. Handmatig toevoegen is veiliger dan een geautomatiseerde AST-patch op Astro/TSX
bestanden met complexe inline scripts.

---

*Audit door Claude Sonnet 4.6 — 2026-05-06*
