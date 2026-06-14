import glob, re, os, csv

FILES = glob.glob(r"C:\Users\Hallo\OneDrive\Claude\AGA\aanloop\marketing\PILOT-TARGETLIJST-*.md")
ENRICHED = r"C:\Users\Hallo\OneDrive\Claude\AGA\aanloop\marketing\PROSPECTS-MASTER-ENRICHED.csv"
OUT = r"C:\Users\Hallo\OneDrive\Claude\AGA\aanloop\marketing\.prioA-worklist.csv"

DONE = {
 "loodgieter rotterdam oost","loodgieterram","momza loodgieter","loodgietersbedrijf am",
 "rp loodgieters","rp loodgieters & installatie","024drive rijschool","fix fysiotherapie",
 "fysio013","fysio013 tilburg centrum","tandzorg arnhem","loodgietersbedrijf passon",
 "optimus service","de loodgieter almere","loodgieter breda expert","ontstoppingsdienst arnhem",
 "omw rijschool","rijschool souldrive","fysiotherapieryanhaafkens","fysiotherapie ryan haafkens",
 "tapa zwolle","loodgieters apeldoorn","moltmaker installatiebedrijf",
}
def norm(s): return re.sub(r"\s+"," ",s.strip().lower())

web = {}
for r in csv.reader(open(ENRICHED, encoding="utf-8"), delimiter=";"):
    if len(r) > 8 and r[2]:
        web[norm(r[2])] = (r[4], r[8])

phone_re = re.compile(r"\+31[\d\s]+\d")
rows = []
seen = set()
for fp in FILES:
    fname = os.path.basename(fp)
    cur_city = ""
    in_A = False
    for line in open(fp, encoding="utf-8"):
        l = line.rstrip("\n")
        if l.startswith("## ") and "Prioriteit" not in l and "Aanpak" not in l:
            cur_city = l.lstrip("# ").split("—")[0].strip()
        if l.startswith("###"):
            in_A = "prioriteit a" in l.lower()
            continue
        if in_A and l.startswith("|"):
            cells = [c.strip() for c in l.strip("|").split("|")]
            if not cells: continue
            b = cells[0]
            if b.lower() in ("bedrijf","#","") or set(b) <= set("-: "): continue
            ph = ""
            for c in cells:
                m = phone_re.search(c)
                if m: ph = m.group(0); break
            key = norm(b)
            if key in DONE or key in seen: continue
            seen.add(key)
            w,e = web.get(key, ("",""))
            rows.append([cur_city, b, ph, w, e, fname])

with open(OUT,"w",encoding="utf-8",newline="") as f:
    cw = csv.writer(f, delimiter=";")
    cw.writerow(["Stad","Bedrijf","Telefoon","Website","Email","Bron"])
    cw.writerows(rows)
print(f"prioA_remaining={len(rows)}")
with_site = sum(1 for r in rows if r[3])
print(f"with_website={with_site}  zonder_website={len(rows)-with_site}")
