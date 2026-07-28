# ElevenLabs — vraag over widget-branding (L6)

Status: **verstuurd?** ☐ — datum: ______ · antwoord ontvangen: ☐

Waarom deze vraag: de ConvAI-widget rendert een badge "Powered by ElevenAgents"
met een link naar `elevenlabs.io/agents`. `src/layouts/BaseLayout.astro` verbergt
die badge met CSS in de shadow root. In de ToS (EEA), de ElevenAgents Terms en de
OEM Terms staat geen attributieplicht en ook geen verbod op verbergen — maar de
licentiebepaling (§5(b) ToS EEA) is breed geformuleerd. Zie de analyse in
`QA-AUDIT-2026-07-25.md`. Doel van deze mail: schriftelijke bevestiging, zodat de
grijze zone dicht is.

**Waarheen:** `team@elevenlabs.io`, of via <https://help.elevenlabs.io/hc/en-us/requests/new>
(mail vanaf het adres dat aan het ElevenLabs-account hangt).

**Onderwerp:** Permission to hide the "Powered by ElevenAgents" badge in the embedded widget

---

Hello,

I run a small Dutch business (KvK 88606902) and use the ElevenAgents ConvAI widget
on my website aanloopai.nl, embedded through
`@elevenlabs/convai-widget-embed` (agent ID available on request).

The widget renders a "Powered by ElevenAgents" badge linking to elevenlabs.io/agents.
I would like to confirm in writing whether it is permitted to hide that badge on my
site, and if so under which conditions.

Three specific questions:

1. Do your terms require the badge to stay visible? I could not find an attribution
   or co-branding obligation in the Terms of Service (EEA), the ElevenAgents Terms,
   or the OEM Terms — unlike the Music API Terms, which do contain an explicit
   "powered by ElevenLabs" co-branding clause. I want to be sure I am not missing a
   requirement stated elsewhere, for example in the widget documentation.

2. Is there a supported way to remove or disable the badge — a setting in the
   dashboard or a widget attribute — rather than hiding it with CSS on my side?

3. If badge removal is tied to a specific plan, which plan is required? Please let
   me know what my current plan allows.

To be transparent about the current situation: the badge is at this moment hidden
with CSS on my site. If that is not allowed, I will restore it immediately — please
just say so and I will change it the same day.

Thank you,

Mustafa Agah Dogan
AanloopAI — aanloopai.nl
KvK 88606902

---

## Na het antwoord

- **Mag het niet** → verwijder het `attachShadow`-blok in `src/layouts/BaseLayout.astro`
  (rond regel 557) volledig, build, deploy, en noteer het in de audit.
- **Mag het wel** → antwoord hier plakken als bewijs, en het `attachShadow`-blok
  alsnog technisch inperken: het patcht nu de prototype-methode globaal, dus élke
  shadow root op de pagina krijgt de CSS én een MutationObserver. Beperken tot de
  `elevenlabs-convai`-host en de brede selectors (`[class*="powered"]`,
  `[class*="branding"]`) laten vallen.
- **Alleen op een hoger plan** → afweging: kosten van dat plan tegen de waarde van
  een schone widget.
