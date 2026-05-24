# IG DM Assets — Lead Magnets Library

Asset library for keyword-triggered DM auto-replies (via `scripts/ig-dm-bot.mjs`).
Wave 5 introduces 9 new commenting-keywords each mapping to a downloadable PDF
or hosted landing page. The bot quotes the link in the DM reply.

## Keyword → Asset map (Wave 5)

| Keyword (uppercase) | Asset | Source / URL slug |
|--------------------|-------|-------------------|
| `HORECA` | Horeca FAQ PDF (8 Q&A + sector-pricing) | `dm-assets/horeca-faq.pdf` → `aanloopai.nl/dl/horeca-faq` |
| `ZORG` | AVG + NEN 7510 + DPIA checklist (1 A4) | `dm-assets/zorg-compliance-checklist.pdf` → `aanloopai.nl/dl/zorg-checklist` |
| `PROMPT` | 7-prompt-regels framework + 12 voorbeeld-prompts MKB | `dm-assets/prompt-framework.pdf` → `aanloopai.nl/dl/prompt-framework` |
| `AVG` | AVG-AI 1-A4 compliance-checklist | `dm-assets/avg-ai-checklist.pdf` → `aanloopai.nl/dl/avg-checklist` |
| `EMMA` | Emma 14-dagen implementatie-roadmap | `dm-assets/emma-roadmap.pdf` → `aanloopai.nl/dl/emma-roadmap` |
| `FOUNDER` | Wekelijkse founder-notities subscriptie + huidige editie | DM-only (geen PDF) |
| `CIJFERS` | MKB-AI cijfer-rapport 2026 (5 CBS/KvK/Salesforce stats + bronnen) | `dm-assets/mkb-ai-cijfers-2026.pdf` → `aanloopai.nl/dl/mkb-ai-cijfers` |
| `AI-DUUR` | Waarom MKB AI uitstelt — 1-pager analyse | `dm-assets/waarom-ai-uitstel.pdf` → `aanloopai.nl/dl/waarom-uitstel` |
| `MARCO` | Marco demo + Calendly intake-link | Direct link, geen PDF |
| `AUDIT` | Gratis 15-min AI-audit Calendly | Direct link |
| `DEMO` | Marco/Emma demo-video + Calendly | Direct link |

## Asset production workflow

1. **Draft**: 1-A4 / 4-page PDF per keyword. Brand-strict (Navy + Pearl + Inter).
2. **Source-grounded**: elke stat = bron-link (CBS, KvK, Meta, Salesforce, EU AI Act).
3. **CTA per asset**: einde van elke PDF heeft 1 specifieke CTA naar
   `aanloopai.nl/demo-inplannen?utm_source=ig-dm&utm_campaign=<keyword>`.
4. **Hosting**: PDF's bewaard in `public/dl/<slug>.pdf` voor stable URLs.
5. **Tracking**: UTM `utm_source=ig-dm&utm_medium=keyword&utm_campaign=<KW>`
   in elke DM-link. PostHog/Plausible registreert conversie per keyword.

## Bot configuration

Update `scripts/ig-dm-bot.mjs` env:

```
COMMENT_KEYWORDS=HORECA,ZORG,PROMPT,AVG,EMMA,FOUNDER,CIJFERS,AI-DUUR,MARCO,AUDIT,DEMO,BILGI,INFO
```

Templates extended in `marketing/instagram/dm-templates.json` — keyword-specific
section `dm_assets[<KEYWORD>]` with rotation (3 variants each to avoid
spam-pattern detection). Bot code refactor required to read `dm_assets`
section (current implementation uses single `comment` template for all keywords).

## Voice-note follow-up (msg 6+)

After 5-6 text exchanges, switch to a 20-sec voice note. 90% open rate vs 70%
text (industry benchmark 2026). Scripts library:
`scripts/dm-voice-note-library.md`.

## Wave 5 priority assets (Week 1)

Must-build by 2026-05-26 (Mon launch):

- [ ] `horeca-faq.pdf` — already exists in part as kennisbank content; package as PDF
- [ ] `zorg-compliance-checklist.pdf` — 1 A4, NEN 7510 + AVG + DPIA
- [ ] `prompt-framework.pdf` — 7 regels uit `wave-5-schedule.json#w5-c02` + 12 prompts
- [ ] `avg-ai-checklist.pdf` — 1 A4 compliance
- [ ] `mkb-ai-cijfers-2026.pdf` — data uit `w5-c07-data-viz-mkb-stats`

Optional Week 2+:

- `emma-roadmap.pdf`, `waarom-ai-uitstel.pdf`

## Verification

Pre-launch test: send DM to bot with each keyword from a test account, verify
the asset link is delivered. Track: open-rate, click-through to Calendly,
booked-call conversion per keyword.
