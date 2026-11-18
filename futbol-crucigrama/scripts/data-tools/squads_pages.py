"""Planteles completos desde las páginas "<año> FIFA World Cup squads" / "<año> Copa América squads".

Guarda kr/squads-pages.json: {"mundial2022:ARG": [títulos de Wikipedia en inglés], ...}.
"""
import json, os, re, sys, urllib.parse
import wp

SP = sys.argv[1]
COUNTRIES = {'ARG': 'Argentina', 'BRA': 'Brazil', 'URU': 'Uruguay', 'COL': 'Colombia', 'CHI': 'Chile', 'PAR': 'Paraguay',
             'PER': 'Peru', 'MEX': 'Mexico', 'ESP': 'Spain', 'FRA': 'France', 'ITA': 'Italy', 'GER': 'Germany',
             'POR': 'Portugal', 'NED': 'Netherlands', 'ENG': 'England', 'CRO': 'Croatia', 'BEL': 'Belgium'}
ALIASES = {'GER': ('Germany', 'West Germany')}
PAGES = {f'mundial{y}': f'{y} FIFA World Cup squads' for y in (1978, 1982, 1986, 1990, 1994, 1998, 2002, 2006, 2010, 2014, 2018, 2022, 2026)}
PAGES.update({f'copaamerica{y}': f'{y} Copa América squads' for y in (1993, 2004, 2007, 2011, 2015, 2019, 2021, 2024)})

def link_title(cell):
    for a in cell.find_all('a', href=True):
        m = re.match(r'^(?:https?://en\.wikipedia\.org)?/wiki/([^?#]+)', a['href']) or re.match(r'^\./([^?#]+)', a['href'])
        if m and ':' not in m.group(1) and 'new' not in a.get('class', []):
            return urllib.parse.unquote(m.group(1)).replace('_', ' ')
    return None

out = {}
for key, title in PAGES.items():
    try:
        soup = wp.page('en', title)
    except Exception as e:
        print('ERR', title, str(e)[:80], flush=True); continue
    for code, name in COUNTRIES.items():
        names = ALIASES.get(code, (name,))
        head = next((h for h in soup.find_all(['h3', 'h4']) if h.get_text(strip=True) in names), None)
        if not head:
            continue
        table = head.find_next('table')
        hdr = [c.get_text(' ', strip=True) for c in table.find('tr').find_all(['th', 'td'])]
        col = next((i for i, h in enumerate(hdr) if h.lower().startswith('player')), None)
        if col is None:
            print('  sin columna Player:', key, code, hdr); continue
        titles, rows = [], 0
        for tr in table.find_all('tr')[1:]:
            cells = tr.find_all(['th', 'td'])
            if len(cells) > col and cells[col].get_text(strip=True):
                rows += 1
                t = link_title(cells[col])
                if t:
                    titles.append(t)
        # Solo se usa el plantel si todos los convocados tienen artículo (si no, quedaría incompleto).
        if rows and len(titles) == rows:
            out[f'{key}:{code}'] = titles
        else:
            print('  incompleto, se descarta:', key, code, len(titles), 'de', rows)
    print(f'{key:16s}', {k.split(':')[1]: len(v) for k, v in out.items() if k.startswith(key + ':')}, flush=True)
json.dump(out, open(os.path.join(SP, 'kr', 'squads-pages.json'), 'w', encoding='utf-8'), ensure_ascii=False)
