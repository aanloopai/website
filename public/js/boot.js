/* Gedeelde front-end bootstrap voor alle BaseLayout-pagina's.
 *
 * Deze blokken stonden inline in BaseLayout.astro en ExitIntentModal.astro en
 * reisden dus op alle 253 pagina's mee (~10 KB ruw, ~4 KB gzip per pagina).
 * Hier staan ze één keer, en de browser cachet het bestand over de hele site.
 *
 * Alles hieronder start zichzelf en wordt door geen enkel ander script
 * aangeroepen. De API's waar andere scripts wél op leunen — gtag(),
 * window.__aanloopConsent en window._track — blijven bewust inline in de <head>
 * staan, omdat inline page-scripts die tijdens het parsen al kunnen raken.
 *
 * Wordt geladen met defer, dus draait na het parsen: alle element-id's die
 * hieronder opgezocht worden bestaan dan.
 */
(function () {
  'use strict';

  /* ---- Click-tracking: telefoon en WhatsApp -----------------------------
   * Gedelegeerd op document, zodat het ook werkt voor DOM die later wordt
   * geïnjecteerd (zoals de ElevenLabs-widget). */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href^="tel:"]') : null;
    if (a && window._track) window._track('phone_click', { link_url: a.href, link_text: (a.textContent || '').trim() });
  });
  document.addEventListener('click', function (e) {
    /* De CTA's wijzen sinds 2026-08 naar /whatsapp (302 naar wa.me, zie
     * src/worker.js). wa.me blijft in de selector staan voor links die nog
     * rechtstreeks gaan, bijvoorbeeld in geïnjecteerde widget-DOM. */
    var a = e.target && e.target.closest ? e.target.closest('a[href*="wa.me"], a[href^="/whatsapp"]') : null;
    if (a && window._track) window._track('whatsapp_click', { link_url: a.href });
  });

  /* ---- GA4 / gtag.js -----------------------------------------------------
   * De consent-gate zit in __aanloopConsent.onGrant: zonder "alles accepteren"
   * wordt gtag.js nooit opgehaald, dus vertrekt er ook geen verzoek naar Google.
   * Daarna pas ophalen na eerste interactie of idle, zodat de TBT-winst
   * (~1500 ms op desktop) behouden blijft voor wie wél accepteert. */
  (function () {
    var loaded = false;
    function injectGTM() {
      if (loaded) return; loaded = true;
      var s = document.createElement('script');
      s.src = 'https://www.googletagmanager.com/gtag/js?id=G-VS8SZZ6W45';
      s.async = true;
      document.head.appendChild(s);
    }
    window.__aanloopConsent.onGrant(function () {
      var fired = false;
      function loadGTM() { if (fired) return; fired = true; injectGTM(); }
      ['scroll', 'mousemove', 'touchstart', 'keydown', 'click'].forEach(function (ev) {
        window.addEventListener(ev, loadGTM, { once: true, passive: true });
      });
      if ('requestIdleCallback' in window) {
        requestIdleCallback(function () { setTimeout(loadGTM, 3000); });
      } else {
        setTimeout(loadGTM, 4000);
      }
    });
  })();

  /* ---- "Powered by ElevenAgents"-badge verbergen -------------------------
   * Of dit mag staat open bij ElevenLabs — zie docs/elevenlabs-branding-vraag.md.
   *
   * attachShadow wordt gepatcht omdat de widget zijn shadow root zelf aanmaakt
   * en de CSS erin moet zitten vóór hij rendert. De patch doet alleen iets voor
   * de <elevenlabs-convai>-host: eerder kreeg élke shadow root op de pagina de
   * CSS plus een eigen MutationObserver, waardoor een later toegevoegd web
   * component ongemerkt elementen kon kwijtraken.
   *
   * Moet vóór de widget-bootstrap hieronder staan: die laadt het widget-script. */
  (function () {
    var WIDGET_HOST = 'ELEVENLABS-CONVAI';
    var _origAttachShadow = Element.prototype.attachShadow;
    Element.prototype.attachShadow = function (init) {
      var root = _origAttachShadow.call(this, init);
      if (this.tagName !== WIDGET_HOST) return root;
      var style = document.createElement('style');
      style.setAttribute('data-hide-pb', '1');
      /* De badge is <p>Powered by ElevenAgents<a href="…elevenlabs.io…"></a></p>.
         Alleen de <a> verbergen laat "Powered by" staan, dus de <p> eromheen gaat
         weg — niet de overlay-container erboven, want daar zit de rest van de
         widget in. */
      style.textContent = 'p:has(> a[href*="elevenlabs.io"]) { display:none!important; }';
      root.appendChild(style);
      /* Vangnet voor late render en voor browsers zonder :has(). */
      new MutationObserver(function () {
        root.querySelectorAll('a[href*="elevenlabs.io"]').forEach(function (link) {
          if (link.parentElement) link.parentElement.style.setProperty('display', 'none', 'important');
        });
      }).observe(root, { childList: true, subtree: true });
      return root;
    };
  })();

  /* ---- ElevenLabs ConvAI-widget -----------------------------------------
   * Versie gepind: unpkg zonder pin serveert altijd de nieuwste build, die dan
   * ongezien in productie draait. */
  (function () {
    var AGENT_ID = 'agent_9701kqeqntncevw9dwe3fyc8ddpr';
    var SRC = 'https://unpkg.com/@elevenlabs/convai-widget-embed@0.14.12/dist/index.js';
    var launcher = document.getElementById('emma-launcher');
    var disclosure = document.querySelector('.emma-ai-disclosure');
    var loaded = false;

    function loadWidget() {
      if (loaded) return; loaded = true;
      if (launcher) launcher.hidden = true;
      if (disclosure) disclosure.hidden = false;
      var el = document.createElement('elevenlabs-convai');
      el.setAttribute('agent-id', AGENT_ID);
      document.body.appendChild(el);
      var s = document.createElement('script');
      s.src = SRC;
      s.async = true;
      s.type = 'text/javascript';
      document.body.appendChild(s);
    }

    if (launcher) launcher.addEventListener('click', loadWidget);
    window.__aanloopConsent.onGrant(loadWidget);
  })();

  /* ---- Exit-intent modal -------------------------------------------------
   * Geen timer: die maakte er een tijdgestuurde interstitial van die ook opdook
   * terwijl de bezoeker zat te lezen — op /tarieven/ boven op de prijstabel. */
  (function () {
    var KEY = 'aanloop_exit_shown';
    /* Naast conversie- en portal-pagina's ook overslaan op prijs- en juridische
       pagina's: daar dekte de modal de prijstabel respectievelijk de voorwaarden af. */
    var SKIP = /\/(aanvragen|demo-inplannen|demo-aanvragen|demo-bevestigd|demo-herplannen|bedankt|demo-bedankt|portal|admin|contact|gratis-ai-scan|start|tarieven|privacy|cookies|voorwaarden|disclaimer)/;
    if (SKIP.test(location.pathname)) return;
    /* Alleen op apparaten met een muis: op touch bestaat "cursor verlaat het
       venster" niet, dus daar zou alleen een timer overblijven — precies het
       intrusive-interstitial-patroon dat Google op mobiel afstraft. */
    try {
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    } catch (e) { return; }
    try { if (localStorage.getItem(KEY)) return; } catch (e) {}
    var modal = document.getElementById('exit-modal');
    if (!modal) return;
    var close = document.getElementById('exit-modal-close');
    var dismiss = document.getElementById('exit-modal-dismiss');
    var cta = document.getElementById('exit-modal-cta');
    var shown = false;
    function show() {
      if (shown) return; shown = true;
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
      modal.classList.remove('hidden'); modal.classList.add('flex');
      if (window._track) window._track('exit_intent_shown', {});
    }
    function hide() { modal.classList.add('hidden'); modal.classList.remove('flex'); }
    document.addEventListener('mouseout', function (e) { if (!e.relatedTarget && e.clientY <= 0) show(); });
    if (close) close.addEventListener('click', hide);
    if (dismiss) dismiss.addEventListener('click', hide);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
    modal.addEventListener('click', function (e) { if (e.target === modal) hide(); });
    if (cta) cta.addEventListener('click', function () { if (window._track) window._track('exit_intent_cta_click', {}); });
  })();

  /* ---- Mobiele sticky CTA-balk ------------------------------------------
   * Verbergen zolang de cookiebanner in beeld staat, anders overlappen ze.
   * De banner in Footer.astro schuift in beeld via de class "show" en draagt
   * nooit "hidden" — die check keek eerder naar "hidden" en concludeerde dus
   * altijd "banner zichtbaar", waardoor de balk op elke pagina verborgen bleef. */
  (function () {
    var bar = document.getElementById('sticky-cta-bar');
    var banner = document.getElementById('cookie-banner');
    if (!bar || !banner) return;
    function sync() {
      bar.style.display = banner.classList.contains('show') ? 'none' : '';
    }
    sync();
    new MutationObserver(sync).observe(banner, { attributes: true, attributeFilter: ['class'] });
  })();
})();
