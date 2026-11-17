import json, sys
import wm

import os
HERE = os.path.dirname(os.path.abspath(__file__))
cards = json.load(open(os.path.join(HERE, '..', '..', 'src', 'data', 'fifa-cards.json'), encoding='utf-8'))
players = cards['answers']
LANGS = ['en', 'es', 'mul', 'fr', 'de', 'pt', 'it']
found = {}
B = 40
for i in range(0, len(players), B):
    batch = players[i:i + B]
    values = ' '.join(json.dumps(p['name'], ensure_ascii=False) + '@' + l for p in batch for l in LANGS)
    q = '''SELECT ?name ?p ?sl ?img ?dob ?cl WHERE {
      VALUES ?name { %s }
      ?p rdfs:label|skos:altLabel ?name .
      ?p wdt:P106 wd:Q937857 ; wikibase:sitelinks ?sl .
      OPTIONAL { ?p wdt:P18 ?img }
      OPTIONAL { ?p wdt:P569 ?dob }
      OPTIONAL { ?p wdt:P27 ?c . ?c rdfs:label ?cl FILTER(lang(?cl) = "en") }
    }''' % values
    rows = wm.sparql(q)
    for r in rows:
        name = r['name']['value']
        qid = r['p']['value'].rsplit('/', 1)[1]
        d = found.setdefault(name, {}).setdefault(qid, {'qid': qid, 'sl': int(r['sl']['value']), 'img': None, 'dob': None, 'nats': set()})
        if 'img' in r: d['img'] = d['img'] or r['img']['value']
        if 'dob' in r: d['dob'] = r['dob']['value'][:10]
        if 'cl' in r: d['nats'].add(r['cl']['value'])
    print('lote', i // B + 1, len(rows), 'filas', flush=True)

out = {}
for p in players:
    cands = sorted(found.get(p['name'], {}).values(), key=lambda d: -d['sl'])
    for c in cands: c['nats'] = sorted(c['nats'])
    out[p['id']] = {'name': p['name'], 'nat': p['nat'], 'clubs': sorted({c['club'] for c in p['cards']})[:3],
                    'eds': [p['cards'][0]['v'], p['cards'][-1]['v']], 'cands': cands[:4]}
json.dump(out, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(out), 'jugadores;', sum(1 for v in out.values() if v['cands']), 'con ficha;',
      sum(1 for v in out.values() if v['cands'] and v['cands'][0]['img']), 'con imagen')
