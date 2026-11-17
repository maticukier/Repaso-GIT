"""Atributos de Wikidata para una lista de ítems: fama (sitelinks), nacimiento, nacionalidad y nombres."""
import json, os, sys, time
import wm

QUERY = '''SELECT ?item ?k ?v WHERE {
  VALUES ?item { %s }
  { ?item wikibase:sitelinks ?v . BIND("sl" AS ?k) }
  UNION { ?item wdt:P569 ?v . BIND("dob" AS ?k) }
  UNION { ?item wdt:P27 ?v . BIND("cit" AS ?k) }
  UNION { ?item wdt:P1532 ?v . BIND("sport" AS ?k) }
  UNION { ?a schema:about ?item ; schema:isPartOf <https://es.wikipedia.org/> ; schema:name ?v . BIND("es" AS ?k) }
  UNION { ?b schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?v . BIND("en" AS ?k) }
}'''

def fetch_attrs(qids, batch=400, log=True):
    out = {}
    qids = sorted(set(qids), key=lambda q: int(q[1:]))
    for i in range(0, len(qids), batch):
        part = qids[i:i + batch]
        rows = wm.sparql(QUERY % ' '.join('wd:' + q for q in part))
        for r in rows:
            q = r['item']['value'].rsplit('/', 1)[1]
            k = r['k']['value']; v = r['v']['value']
            if v.startswith('http://www.wikidata.org/entity/'):
                v = v.rsplit('/', 1)[1]
            d = out.setdefault(q, {})
            if k in ('sl',): d[k] = int(v)
            elif k in ('dob', 'es', 'en'): d.setdefault(k, v)
            else: d.setdefault(k, []).append(v)
        if log: print(f'  attrs {min(i + batch, len(qids))}/{len(qids)}', flush=True)
    return out

def fetch_missing(SP, attrs, qids, label):
    path = os.path.join(SP, 'attrs.json')
    todo = sorted(set(qids) - set(attrs), key=lambda q: int(q[1:]))
    print(f'{label}: {len(set(qids))} ítems; {len(todo)} por bajar', flush=True)
    for i in range(0, len(todo), 2000):
        attrs.update(fetch_attrs(todo[i:i + 2000], batch=500, log=False))
        for q in todo[i:i + 2000]:
            attrs.setdefault(q, {})  # sin datos: se marca para no volver a pedirlo
        json.dump(attrs, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
        print(f'  {min(i + 2000, len(todo))}/{len(todo)}', time.strftime('%T'), flush=True)

def squad_titles(SP):
    """Títulos (Wikipedia en inglés) de los convocados de cada selección a cada torneo."""
    path = os.path.join(SP, 'kr', 'squads-titles.json')
    if not os.path.exists(path):
        return {}
    data = json.load(open(path, encoding='utf-8'))
    out = {}
    for key, titles in data['squads'].items():
        for code, intl in data['intl'].items():
            both = sorted(set(titles) & set(intl))
            if both:
                out[f'{key}:{code}'] = both
    return out

if __name__ == '__main__':
    SP = sys.argv[1]
    path = os.path.join(SP, 'attrs.json')
    attrs = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
    qids = set()
    members = json.load(open(os.path.join(SP, 'kr', 'members.json'), encoding='utf-8'))
    extra_path = os.path.join(SP, 'kr', 'extra.json')
    extra = json.load(open(extra_path, encoding='utf-8')) if os.path.exists(extra_path) else {}
    for src in (members, extra):
        for kind in ('clubs', 'awards'):
            for e in src.get(kind, {}).values():
                qids.update(e['members'])
    resolved = json.load(open(os.path.join(SP, 'rk', 'resolved.json'), encoding='utf-8'))
    qids.update(resolved['resolved'].values())
    fetch_missing(SP, attrs, qids, 'clubes, premios y rankings')

    # Planteles: los títulos que no correspondan a un jugador ya conocido se resuelven en Wikidata.
    squads = squad_titles(SP)
    needed = {t for ts in squads.values() for t in ts}
    known = {a['en']: q for q, a in attrs.items() if a.get('en')}
    sq_path = os.path.join(SP, 'kr', 'squads-qids.json')
    sq = json.load(open(sq_path, encoding='utf-8')) if os.path.exists(sq_path) else {}
    todo = sorted(needed - set(known) - set(sq))
    print(f'planteles: {len(needed)} jugadores; {len(todo)} títulos por resolver', flush=True)
    for i in range(0, len(todo), 120):
        part = todo[i:i + 120]
        values = ' '.join(json.dumps(t, ensure_ascii=False) + '@en' for t in part)
        rows = wm.sparql('''SELECT ?title ?item WHERE {
          VALUES ?title { %s }
          ?art schema:name ?title ; schema:isPartOf <https://en.wikipedia.org/> ; schema:about ?item .
        }''' % values)
        for t in part:
            sq.setdefault(t, None)
        for r in rows:
            sq[r['title']['value']] = r['item']['value'].rsplit('/', 1)[1]
        json.dump(sq, open(sq_path, 'w', encoding='utf-8'), ensure_ascii=False)
    fetch_missing(SP, attrs, [q for q in sq.values() if q], 'planteles')
    print('listo', len(attrs), time.strftime('%T'))
