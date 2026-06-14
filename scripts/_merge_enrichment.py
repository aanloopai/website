import json, csv, io

JSON_PATH = r"C:\Users\Hallo\.claude\projects\C--Users-Hallo\ebf18935-fa7a-49b3-a44b-e75ebdd735db\tool-results\mcp-apify-get-dataset-items-1781443970260.txt"
CSV_IN = r"C:\Users\Hallo\OneDrive\Claude\AGA\aanloop\marketing\PROSPECTS-MASTER.csv"
CSV_OUT = r"C:\Users\Hallo\OneDrive\Claude\AGA\aanloop\marketing\PROSPECTS-MASTER-ENRICHED.csv"

def norm(u):
    if not u: return ""
    u = u.strip().lower()
    for p in ("https://","http://"): u = u[len(p):] if u.startswith(p) else u
    if u.startswith("www."): u = u[4:]
    return u.rstrip("/")

# load enrichment
data = json.load(open(JSON_PATH, encoding="utf-8"))
items = data["items"] if isinstance(data, dict) else data
emap = {}
for it in items:
    key = norm(it.get("originalStartUrl",""))
    if not key: continue
    def clean(lst):
        if not lst: return []
        return [x for x in lst if x]
    emap[key] = {
        "emails": clean(it.get("emails")),
        "phones": clean(it.get("phones")),
        "facebooks": clean(it.get("facebooks")),
        "instagrams": clean(it.get("instagrams")),
        "linkedIns": clean(it.get("linkedIns")),
    }

# read CSV (semicolon)
rows = list(csv.reader(open(CSV_IN, encoding="utf-8"), delimiter=";"))
header = rows[0] + ["Email","Telefoon (site)","Facebook","Instagram","LinkedIn"]
out = [header]
hit = 0
for r in rows[1:]:
    if not r or len(r) < 5:
        out.append(r); continue
    web = r[4]
    e = emap.get(norm(web))
    if e and (e["emails"] or e["facebooks"] or e["instagrams"] or e["linkedIns"]):
        hit += 1
        out.append(r + [
            ", ".join(e["emails"][:3]),
            ", ".join(e["phones"][:2]),
            e["facebooks"][0] if e["facebooks"] else "",
            e["instagrams"][0] if e["instagrams"] else "",
            e["linkedIns"][0] if e["linkedIns"] else "",
        ])
    else:
        out.append(r + ["","","","",""])

with open(CSV_OUT, "w", encoding="utf-8", newline="") as f:
    w = csv.writer(f, delimiter=";")
    w.writerows(out)

total = len(rows)-1
with_email = sum(1 for r in out[1:] if len(r)>8 and r[8])
print(f"rows={total} enriched_hit={hit} with_email={with_email} domains_in_dataset={len(emap)}")
