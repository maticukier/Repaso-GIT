"""Planteles de Mundiales y Copas América: lee las categorías de Wikipedia como páginas HTML."""
import html as htmllib, json, os, sys
from bs4 import BeautifulSoup
import wm

SP = sys.argv[1]
COUNTRIES = {'ARG': 'Argentina', 'BRA': 'Brazil', 'URU': 'Uruguay', 'COL': 'Colombia', 'CHI': 'Chile', 'PAR': 'Paraguay',
             'PER': 'Peru', 'MEX': 'Mexico', 'ESP': 'Spain', 'FRA': 'France', 'ITA': 'Italy', 'GER': 'Germany',
             'POR': 'Portugal', 'NED': 'Netherlands', 'ENG': 'England', 'CRO': 'Croatia', 'BEL': 'Belgium'}
SQUADS = {f'mundial{y}': f'{y} FIFA World Cup players' for y in (2022, 2018, 2014, 2010, 2006, 2002, 1998, 1994, 1990, 1986, 1978, 2026, 1982)}
SQUADS.update({f'copaamerica{y}': f'{y} Copa América players' for y in (2021, 2024, 2015, 2011, 2007, 2019, 2004, 1993)})

def titles(cat):
    out = []
    url = 'https://en.wikipedia.org/wiki/Category:' + cat.replace(' ', '_').replace("'", '%27')
    for _ in range(40):
        soup = BeautifulSoup(wm.fetch(url, min_gap=6.0), 'lxml')
        pages = soup.find(id='mw-pages')
        if not pages:
            break
        out += [a.get('title') for a in pages.select('li a') if a.get('title')]
        nxt = [a['href'] for a in pages.find_all('a', href=True) if 'pagefrom=' in a['href']]
        if not nxt:
            break
        url = 'https://en.wikipedia.org' + htmllib.unescape(nxt[0]).split('#')[0]
    return sorted(set(out))

path = os.path.join(SP, 'kr', 'squads-titles.json')
data = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {'squads': {}, 'intl': {}}
jobs = [('squads', k, c) for k, c in SQUADS.items()] + [('intl', k, f"{c} men's international footballers") for k, c in COUNTRIES.items()]
for kind, key, cat in jobs:
    if data[kind].get(key):
        continue
    try:
        got = titles(cat)
    except Exception as e:
        print('ERR', key, str(e)[:100], flush=True); got = []
    print(f'{key:18s} {len(got):5d}  {cat}', flush=True)
    data[kind][key] = got
    json.dump(data, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
print('planteles listo')
