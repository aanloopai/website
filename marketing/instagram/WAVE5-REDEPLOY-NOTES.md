# Wave 5 — Redeploy Checklist

Notes voor het canli krijgen van Wave 5 wijzigingen op productie. Doelgroep:
Mustafa / operator.

## Wat is er veranderd?

1. **Nieuwe DM-bot keywords** (`HORECA`, `ZORG`, `PROMPT`, `AVG`, `EMMA`, `FOUNDER`,
   `CIJFERS`, `AIDUUR`, `MARCO`). Elk keyword route naar specifieke DM-template
   met PDF-link.
2. **Bot code refactor** (`scripts/ig-dm-bot.mjs`): `pickTemplate()` heeft nu een
   optionele `keyword` parameter. `handleComment()` geeft matched keyword door.
   Backwards-compat: zonder keyword valt het terug op generic 'comment' template.
3. **5 nieuwe PDF lead-magnets** in `public/dl/`:
   - `horeca-faq.pdf`
   - `zorg-compliance-checklist.pdf`
   - `prompt-framework.pdf`
   - `avg-ai-checklist.pdf`
   - `mkb-ai-cijfers-2026.pdf`
4. **Schedules Week 1 + Week 2** (carousels/reels/stories) klaar voor cron.

## Wat moet jij doen?

### A. Cloudflare Pages deploy bevestigen

PDFs in `public/dl/` worden door de site-build meegenomen. Het deploy-script
gebruikt `wrangler versions upload` (preview-only). Check op dashboard
(Cloudflare Pages → aanloopai-website project → Deployments) dat de laatste
preview live is gepromoteerd zodat `aanloopai.nl/dl/horeca-faq.pdf` werkt.

Test in browser:
```
https://aanloopai.nl/dl/horeca-faq.pdf
https://aanloopai.nl/dl/zorg-compliance-checklist.pdf
https://aanloopai.nl/dl/prompt-framework.pdf
https://aanloopai.nl/dl/avg-ai-checklist.pdf
https://aanloopai.nl/dl/mkb-ai-cijfers-2026.pdf
```

Allemaal moeten een 200 + PDF-render geven.

### B. Hetzner DM-bot redeploy

De DM-bot draait op Hetzner (`ig-dm.aanloopai.nl`, `178.104.100.94`). Twee opties:

**Optie 1 — Automatisch (push trigger):**
De workflow `.github/workflows/ig-dm-deploy.yml` rsynct de bot bij elke push
naar master. Na de Wave 5-commits is hij dus al opnieuw gedeployed. Check
de Actions-tab voor de groene vinkje op de laatste run.

**Optie 2 — Handmatig (als de auto-deploy gefaald is):**
```bash
ssh root@178.104.100.94
cd /opt/ig-dm
git pull origin master
bash deploy/ig-dm/install.sh
sudo systemctl restart aanloop-ig-dm
sudo systemctl status aanloop-ig-dm  # check 'active (running)'
```

### C. Verifieer keyword routing

Stuur vanaf een test-account een DM met de tekst:
```
HORECA
```

Verwachting binnen 7 seconden:
- DM-bericht uit `dm_assets.HORECA` (2 varianten roteren)
- Bevat link: `aanloopai.nl/dl/horeca-faq.pdf?utm_source=ig-dm&utm_campaign=horeca`

Herhaal voor: `ZORG`, `PROMPT`, `AVG`, `EMMA`, `FOUNDER`, `CIJFERS`, `AIDUUR`, `MARCO`.

Als test faalt:
```bash
ssh root@178.104.100.94 'journalctl -u aanloop-ig-dm -n 50 --no-pager'
```

### D. Wave 5 Week 1 launch (Maandag 2026-05-26)

Geen actie nodig — cron-workflows draaien:
- `ig-publish.yml` 09:00 + 17:00 CET (carousels + reels via mediatype detection)
- `ig-reels-publish.yml` 09:00 CET op Mon/Wed/Fri (separate reels publisher)
- `ig-stories-publish.yml` 11:00 + 19:00 CET (NEW — pre-check eerste cron-runs)

Pre-check eerste run:
```bash
# Bevestig dat het workflow stond op de juiste plek
gh workflow list
gh workflow view ig-stories-publish.yml
gh run list --workflow=ig-stories-publish.yml --limit 5
```

### E. IG-app stickers handmatig erop zetten

De Story-PNG's zijn backgrounds — sticker (poll/quiz/slider/etc.) moet manueel
in de IG-app erop gezet worden binnen 5-10 min na publish. De PNG heeft een
hint (oranje `[ STICKER HIER ]`) op de plek waar de sticker valt.

Verifieer Story-instellingen in IG-app:
- Sticker tap → kies juiste type (poll/quiz/slider/question/countdown)
- Verplaats over de hint, schaal en lijn uit
- Wegklikken zodra sticker actief is

## Rollback

Als iets misgaat:
1. `git revert <commit-sha>` voor de Wave 5-commits
2. `git push origin master`
3. Cloudflare Pages: oude versie promoten (Deployments → vorige → Promote)
4. Hetzner: `git pull` + `systemctl restart` (oude templates komen mee)

## Monitoring eerste 72u

- IG Insights → Reach, Comments, Saves, Sends, Profile-visits per post
- DM-bot logs: `journalctl -u aanloop-ig-dm -f` (live tail)
- Cloudflare Analytics: clicks op `/dl/*.pdf`-paden (UTM-tagged per keyword)
- Brevo dashboard: nieuwe lead-captures via /demo-inplannen formulier

Doel-baseline (eerste 72u):
- 1+ comment-trigger per keyword (HORECA/ZORG meest waarschijnlijk hot)
- 3-5x save rate op carousels vs Wave 3 baseline
- 1-2 booked calls uit DM-funnel
