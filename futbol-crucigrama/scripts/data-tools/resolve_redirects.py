"""Resuelve títulos de Wikipedia en inglés (incluidas redirecciones) a ítems de Wikidata."""
import json, os, sys, urllib.parse
import wm

SP = sys.argv[1]
miss = json.load(open(os.path.join(SP, 'kr', 'squads-missing.json'), encoding='utf-8'))
sq_path = os.path.join(SP, 'kr', 'squads-qids.json')
sq = json.load(open(sq_path, encoding='utf-8'))
found = {}
for i in range(0, len(miss), 50):
    part = miss[i:i + 50]
    url = 'https://en.wikipedia.org/w/api.php?format=json&action=query&redirects=1&prop=pageprops&ppprop=wikibase_item&' + \
        urllib.parse.urlencode({'titles': '|'.join(part)})
    q = json.loads(wm.fetch(url, min_gap=20.0))['query']
    chain = {n['from']: n['to'] for n in q.get('normalized', [])}
    chain.update({r['from']: r['to'] for r in q.get('redirects', [])})
    item = {p['title']: p.get('pageprops', {}).get('wikibase_item') for p in q['pages'].values()}
    for t in part:
        cur = t
        for _ in range(4):
            cur = chain.get(cur, cur)
        if item.get(cur):
            found[t] = item[cur]
    print(f'{min(i + 50, len(miss))}/{len(miss)}', flush=True)
sq.update(found)
json.dump(sq, open(sq_path, 'w', encoding='utf-8'), ensure_ascii=False)
print('resueltos', len(found), 'de', len(miss), '| sin resolver:', [t for t in miss if t not in found])
