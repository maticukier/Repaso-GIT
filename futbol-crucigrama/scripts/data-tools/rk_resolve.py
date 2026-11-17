"""Resuelve los títulos de Wikipedia de las listas de ranking a ítems de Wikidata."""
import json, os, sys
import wm

SP = sys.argv[1]
DEPTH = 60
lists = json.load(open(os.path.join(SP, 'rk', 'lists-raw.json'), encoding='utf-8'))
titles = sorted({r['link'] for l in lists for r in l['rows'][:DEPTH] if r['link']})
print(len(titles), 'títulos a resolver', flush=True)
resolved = {}
for i in range(0, len(titles), 120):
    batch = titles[i:i + 120]
    values = ' '.join(json.dumps(t, ensure_ascii=False) + '@en' for t in batch)
    rows = wm.sparql('''SELECT ?title ?item WHERE {
      VALUES ?title { %s }
      ?art schema:name ?title ; schema:isPartOf <https://en.wikipedia.org/> ; schema:about ?item .
    }''' % values)
    for r in rows:
        resolved[r['title']['value']] = r['item']['value'].rsplit('/', 1)[1]
    print('lote', i // 120 + 1, len(resolved), flush=True)
missing = [t for t in titles if t not in resolved]
print('sin resolver (redirecciones):', len(missing))
json.dump({'resolved': resolved, 'missing': missing}, open(os.path.join(SP, 'rk', 'resolved.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(missing[:60])
