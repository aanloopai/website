import csv, re

CONTACT = r"C:\Users\Hallo\OneDrive\Claude\AGA\aanloop\marketing\CONTACTPERSONEN-PRIOA.csv"
ENRICHED = r"C:\Users\Hallo\OneDrive\Claude\AGA\aanloop\marketing\PROSPECTS-MASTER-ENRICHED.csv"
BEL = r"C:\Users\Hallo\OneDrive\Claude\AGA\aanloop\marketing\BEL-LIJST-TOP10.md"

def norm(s):
    s = re.sub(r"\(.*?\)", "", s)
    s = re.sub(r"[^a-z0-9]", "", s.lower())
    return s

emap = {}
for r in csv.reader(open(ENRICHED, encoding="utf-8"), delimiter=";"):
    if len(r) > 8 and r[2]:
        emap.setdefault(norm(r[2]), (r[0], r[3], r[8]))

rows = []
for r in csv.reader(open(CONTACT, encoding="utf-8"), delimiter=";"):
    if len(r) < 5 or r[4].strip() != "bevestigd": continue
    bedrijf, naam, functie, linkedin = r[0], r[1], r[2], r[3]
    stad, tel, email = emap.get(norm(bedrijf), ("", "", ""))
    li = f"[link]({linkedin})" if linkedin else ""
    rows.append((stad, bedrijf, naam, functie, tel, email, li))

rows.sort(key=lambda x: (x[0], x[1]))

lines = []
lines.append("\n## Uitgebreide bel-lijst — Prio-A met bevestigde contactpersoon\n")
lines.append(f"> {len(rows)} bedrijven met geverifieerde naam (handmatig webonderzoek). Gebruik in opening: *\"Spreek ik met [naam]?\"*. Telefoon/e-mail uit enrichment-data; leeg = niet in master of geen site. AVG: publieke bron, zakelijke benadering, honoreer opt-out.\n")
lines.append("| Stad | Bedrijf | Contactpersoon | Functie | Telefoon | E-mail | LinkedIn |")
lines.append("|---|---|---|---|---|---|---|")
for stad, bedrijf, naam, functie, tel, email, li in rows:
    lines.append(f"| {stad} | {bedrijf} | **{naam}** | {functie} | {tel} | {email} | {li} |")
lines.append("")

with open(BEL, "a", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"bevestigd appended={len(rows)}")
matched = sum(1 for r in rows if r[4])
print(f"met telefoon={matched}  zonder telefoon={len(rows)-matched}")
