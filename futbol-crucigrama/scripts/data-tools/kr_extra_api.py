"""Categorías de campeones, premios y planteles, vía la API de Wikipedia en inglés."""
import json, os, sys, urllib.parse
import wm

SP = sys.argv[1]
AWARDS = {
 'copaamerica': 'Copa América–winning players',
 'eurocopa': 'UEFA European Championship–winning players',
 'sudamericano': 'South American Footballer of the Year winners',
 'goldenboy': 'Golden Boy winners',
 'fifaplayer': 'FIFA World Player of the Year winners',
}
SQUADS = {f'mundial{y}': f'{y} FIFA World Cup players' for y in (2022, 2018, 2014, 2010, 2006, 2002, 1998, 1994, 1990, 1986, 1978, 2026, 1982)}
SQUADS.update({f'copaamerica{y}': f'{y} Copa América players' for y in (2021, 2024, 2015, 2011, 2007, 2019, 2004, 1993)})

def members(cat):
    out, cont = set(), {}
    for _ in range(40):
        params = dict(action='query', generator='categorymembers', gcmtitle='Category:' + cat, gcmlimit='500',
                      gcmnamespace='0', prop='pageprops', ppprop='wikibase_item', **cont)
        data = json.loads(wm.fetch('https://en.wikipedia.org/w/api.php?format=json&' + urllib.parse.urlencode(params), min_gap=8.0))
        for pg in data.get('query', {}).get('pages', {}).values():
            q = pg.get('pageprops', {}).get('wikibase_item')
            if q: out.add(q)
        cont = data.get('continue')
        if not cont: break
    return sorted(out)

path = os.path.join(SP, 'kr', 'extra.json')
data = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {'awards': {}, 'squads': {}}
for kind, table in (('awards', AWARDS), ('squads', SQUADS)):
    for cid, cat in table.items():
        if data[kind].get(cid, {}).get('members'):
            continue
        try:
            got = members(cat)
        except Exception as e:
            print('ERR', cid, str(e)[:100], flush=True); got = []
        print(f'{cid:18s} {len(got):5d}  {cat}', flush=True)
        data[kind][cid] = {'category': cat if got else None, 'members': got}
        json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
print('extras listo')
