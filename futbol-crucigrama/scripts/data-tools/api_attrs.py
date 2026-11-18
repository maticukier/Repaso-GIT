"""Completa attrs.json con la API wbgetentities (otro límite que el servicio SPARQL).

Pide de a 50: los ítems que faltan de clubes/rankings y los títulos de los planteles.
"""
import json, os, sys, time, urllib.parse
import wm
from wd_attrs import squad_titles

SP = sys.argv[1]
path = os.path.join(SP, 'attrs.json')
attrs = json.load(open(path, encoding='utf-8'))

def parse(ent):
    claims = ent.get('claims', {})
    def ids(p):
        out = []
        for c in claims.get(p, []):
            v = c.get('mainsnak', {}).get('datavalue', {}).get('value')
            if isinstance(v, dict) and v.get('id') and v['id'] not in out:
                out.append(v['id'])
        return out
    d = {'sl': len(ent.get('sitelinks', {}))}
    for c in claims.get('P569', []):
        t = c.get('mainsnak', {}).get('datavalue', {}).get('value', {}).get('time')
        if t:
            d['dob'] = t[1:]; break
    if ids('P27'): d['cit'] = ids('P27')
    if ids('P1532'): d['sport'] = ids('P1532')
    sl = ent.get('sitelinks', {})
    if 'enwiki' in sl: d['en'] = sl['enwiki']['title']
    if 'eswiki' in sl: d['es'] = sl['eswiki']['title']
    return d

def get(params):
    url = 'https://www.wikidata.org/w/api.php?format=json&action=wbgetentities&props=sitelinks%7Cclaims&' + urllib.parse.urlencode(params)
    return json.loads(wm.fetch(url, min_gap=18.0))['entities']

# 1) Ítems de clubes, premios y rankings que faltan.
qids = set()
members = json.load(open(os.path.join(SP, 'kr', 'members.json'), encoding='utf-8'))
for kind in ('clubs', 'awards'):
    for e in members.get(kind, {}).values():
        qids.update(e['members'])
resolved = json.load(open(os.path.join(SP, 'rk', 'resolved.json'), encoding='utf-8'))
qids.update(resolved['resolved'].values())
todo = sorted(qids - set(attrs), key=lambda q: int(q[1:]))
print('ítems por bajar:', len(todo), flush=True)
for i in range(0, len(todo), 50):
    for q, ent in get({'ids': '|'.join(todo[i:i + 50])}).items():
        attrs[q] = parse(ent) if 'missing' not in ent else {}
    json.dump(attrs, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'  {min(i + 50, len(todo))}/{len(todo)}', time.strftime('%T'), flush=True)

# 2) Convocados a Mundiales que todavía no conocemos (por título de Wikipedia).
known = {v['en'] for v in attrs.values() if v.get('en')}
titles = sorted({t for k, ts in squad_titles(SP).items() for t in ts} - known)
sq_path = os.path.join(SP, 'kr', 'squads-qids.json')
sq = json.load(open(sq_path, encoding='utf-8')) if os.path.exists(sq_path) else {}
titles = [t for t in titles if t not in sq]
print('convocados por resolver:', len(titles), flush=True)
for i in range(0, len(titles), 50):
    part = titles[i:i + 50]
    ents = get({'sites': 'enwiki', 'titles': '|'.join(part)})
    for q, ent in ents.items():
        if 'missing' in ent or not q.startswith('Q'):
            continue
        d = parse(ent)
        attrs[q] = d
        if d.get('en'):
            sq[d['en']] = q
    for t in part:
        sq.setdefault(t, None)
    json.dump(attrs, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump(sq, open(sq_path, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'  {min(i + 50, len(titles))}/{len(titles)}', time.strftime('%T'), flush=True)
# 3) Ítems de convocados resueltos por redirección que todavía no tienen datos.
extra = sorted({q for q in sq.values() if q and q not in attrs}, key=lambda q: int(q[1:]))
print('convocados sin datos:', len(extra), flush=True)
for i in range(0, len(extra), 50):
    for q, ent in get({'ids': '|'.join(extra[i:i + 50])}).items():
        attrs[q] = parse(ent) if 'missing' not in ent else {}
    json.dump(attrs, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'  {min(i + 50, len(extra))}/{len(extra)}', time.strftime('%T'), flush=True)
print('listo', len(attrs))
