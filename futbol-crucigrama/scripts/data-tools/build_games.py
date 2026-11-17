"""Arma los datos de Rebuscado y Ranking: players.json, rebuscado.json y rankings.json.

Entradas (generadas por los otros scripts de esta carpeta):
  kr/members.json, kr/extra.json  jugadores de cada club / premio / plantel (categorías de Wikipedia)
  attrs.json                      fama, nacimiento, nacionalidad y nombres (Wikidata)
  rk/lists-raw.json, rk/resolved.json  rankings de Wikipedia y sus ítems de Wikidata
"""
import json, os, re, sys
from itertools import combinations
import wm

SP, OUT = sys.argv[1], sys.argv[2]
DEPTH = 60  # jugadores guardados por ranking

def load(*parts):
    with open(os.path.join(SP, *parts), encoding='utf-8') as f:
        return json.load(f)

members = load('kr', 'members.json')
if os.path.exists(os.path.join(SP, 'kr', 'extra.json')):
    extra = load('kr', 'extra.json')
    for kind in ('awards', 'squads'):
        members.setdefault(kind, {}).update({k: v for k, v in extra.get(kind, {}).items() if v['members']})
attrs = load('attrs.json')
lists = load('rk', 'lists-raw.json')
resolved = load('rk', 'resolved.json')['resolved']

# --- Nacionalidades -------------------------------------------------------
# código: (ítem de Wikidata, gentilicio plural)
NATIONS = {
    'ARG': ('Q414', 'Argentinos'), 'BRA': ('Q155', 'Brasileños'), 'URU': ('Q77', 'Uruguayos'),
    'COL': ('Q739', 'Colombianos'), 'CHI': ('Q298', 'Chilenos'), 'PAR': ('Q733', 'Paraguayos'),
    'PER': ('Q419', 'Peruanos'), 'MEX': ('Q96', 'Mexicanos'), 'ESP': ('Q29', 'Españoles'),
    'FRA': ('Q142', 'Franceses'), 'ITA': ('Q38', 'Italianos'), 'GER': ('Q183', 'Alemanes'),
    'POR': ('Q45', 'Portugueses'), 'NED': ('Q55', 'Holandeses'), 'ENG': ('Q21', 'Ingleses'),
    'CRO': ('Q224', 'Croatas'), 'BEL': ('Q31', 'Belgas'),
}
SOUTH_AMERICA = {'ARG', 'BRA', 'URU', 'COL', 'CHI', 'PAR', 'PER'}
# Estados históricos que cuentan como el país actual.
ALIAS = {
    'Q29999': 'Q55', 'Q172579': 'Q38', 'Q43287': 'Q183', 'Q41304': 'Q183', 'Q7318': 'Q183', 'Q713750': 'Q183',
    'Q16957': 'Q183', 'Q13474305': 'Q29', 'Q178038': 'Q29', 'Q70802': 'Q142', 'Q71084': 'Q142',
    'Q217230': 'Q155', 'Q5848654': 'Q155', 'Q2578692': 'Q155',
}
QID_TO_CODE = {q: code for code, (q, _) in NATIONS.items()}

def nat_qids(q):
    a = attrs.get(q, {})
    vals = a.get('sport') or a.get('cit') or []
    out = []
    for v in vals:
        v = ALIAS.get(v, v)
        if v not in out:
            out.append(v)
    return out

def nat_codes(q):
    return {QID_TO_CODE[v] for v in nat_qids(q) if v in QID_TO_CODE}

def fame(q):
    return attrs.get(q, {}).get('sl', 0)

def is_person(q):
    a = attrs.get(q, {})
    return bool(a.get('dob') or a.get('sport') or a.get('cit')) and bool(a.get('es') or a.get('en'))

def strip_paren(t):
    return re.sub(r'\s*\([^)]*\)\s*$', '', t).strip()

def title_name(q, fallback=None):
    # El título de Wikipedia en inglés suele ser el nombre más usado ("Sergio Agüero", "Raúl").
    a = attrs.get(q, {})
    return strip_paren(a.get('en') or a.get('es') or fallback or q)

def alt_name(q):
    # El título en español, si es distinto, sirve para el buscador ("Kun Agüero").
    a = attrs.get(q, {})
    if a.get('en') and a.get('es'):
        alt = strip_paren(a['es'])
        if alt.lower() != strip_paren(a['en']).lower():
            return alt
    return None

# --- Categorías de Rebuscado ------------------------------------------------
clubs = {cid: dict(c, set={q for q in c['members'] if is_person(q)}) for cid, c in members['clubs'].items() if c['members']}
awards = {k: {q for q in v['members'] if is_person(q)} for k, v in members.get('awards', {}).items() if v['members']}

TIER1 = {'realmadrid', 'barcelona', 'atletico', 'manutd', 'liverpool', 'chelsea', 'arsenal', 'mancity', 'tottenham',
         'juventus', 'milan', 'inter', 'napoli', 'roma', 'bayern', 'dortmund', 'psg', 'ajax', 'porto', 'benfica',
         'boca', 'river', 'racing', 'independiente', 'sanlorenzo'}

categories = []
seen_titles = set()

def add(title, group, answers, min_n=5, max_n=70, min_famous=3, famous_at=30):
    answers = sorted(set(answers), key=lambda q: -fame(q))
    if not (min_n <= len(answers) <= max_n):
        return False
    if sum(1 for q in answers if fame(q) >= famous_at) < min_famous:
        return False
    if title in seen_titles:
        return False
    seen_titles.add(title)
    categories.append({'t': title, 'g': group, 'a': answers})
    return True

by_nat = {}
for cid, c in clubs.items():
    for q in c['set']:
        for code in nat_codes(q):
            by_nat.setdefault((cid, code), set()).add(q)

# 1) Nacionalidad x club (solo extranjeros)
for cid, c in clubs.items():
    for code, (_, dem) in NATIONS.items():
        if code == c['country']:
            continue
        arg = code == 'ARG' or c['country'] == 'ARG'
        add(f"{dem} que jugaron en {c['es']}", 'arg' if arg else 'nac', by_nat.get((cid, code), ()),
            famous_at=20 if c['country'] in ('ARG', 'BRA', 'URU', 'CHI') else 30)

# 2) Pasaron por los dos clubes
for a, b in combinations(clubs, 2):
    both_arg = clubs[a]['country'] == 'ARG' and clubs[b]['country'] == 'ARG'
    if not ((a in TIER1 and b in TIER1) or both_arg):
        continue
    add(f"Jugaron en {clubs[a]['es']} y en {clubs[b]['es']}", 'par', clubs[a]['set'] & clubs[b]['set'],
        min_n=4, max_n=60, famous_at=20 if both_arg else 30)

# 3) Campeones y premios
BY_NATION = {
    'mundial': 'campeones del mundo', 'champions': 'campeones de la Champions League',
    'libertadores': 'campeones de la Copa Libertadores', 'copaamerica': 'campeones de la Copa América',
    'eurocopa': 'campeones de la Eurocopa',
}
for key, phrase in BY_NATION.items():
    for code, (_, dem) in NATIONS.items():
        ans = [q for q in awards.get(key, ()) if code in nat_codes(q)]
        add(f'{dem} {phrase}', 'arg' if code == 'ARG' else 'tit', ans, max_n=90)
ALONE = {
    'balondeoro': 'Ganadores del Balón de Oro', 'pichichi': 'Ganadores del Pichichi (goleador de la liga española)',
    'sudamericano': 'Elegidos Futbolista del Año de Sudamérica', 'goldenboy': 'Ganadores del premio Golden Boy',
    'fifaplayer': 'Ganadores del FIFA World Player',
}
for key, title in ALONE.items():
    add(title, 'tit', awards.get(key, ()), max_n=90)
BY_CLUB = {
    'mundial': 'Campeones del mundo que jugaron en', 'balondeoro': 'Ganadores del Balón de Oro que jugaron en',
    'champions': 'Campeones de la Champions League que jugaron en',
    'libertadores': 'Campeones de la Copa Libertadores que jugaron en',
}
EUROPE = {'ENG', 'ESP', 'ITA', 'GER', 'FRA', 'NED', 'POR'}
for key, phrase in BY_CLUB.items():
    for cid, c in clubs.items():
        # Champions en clubes europeos y Libertadores en sudamericanos serían casi el plantel campeón: se saltean.
        if key == 'champions' and c['country'] in EUROPE:
            continue
        if key == 'libertadores' and c['country'] not in EUROPE and c['country'] != 'USA':
            continue
        add(f"{phrase} {c['es']}", 'arg' if c['country'] == 'ARG' else 'tit', awards.get(key, set()) & c['set'], max_n=60)

# 4) Planteles de Mundiales y Copas América (convocados de cada selección)
from wd_attrs import squad_titles
en_to_qid = {a['en']: q for q, a in attrs.items() if a.get('en')}
sq_path = os.path.join(SP, 'kr', 'squads-qids.json')
if os.path.exists(sq_path):
    en_to_qid.update({t: q for t, q in load('kr', 'squads-qids.json').items() if q})
for key, titles in sorted(squad_titles(SP).items()):
    tournament, code = key.split(':')
    m = re.match(r'(mundial|copaamerica)(\d{4})', tournament)
    kind, year = m.group(1), m.group(2)
    if kind == 'copaamerica' and code not in SOUTH_AMERICA | {'MEX'}:
        continue
    qs = [en_to_qid[t] for t in titles if t in en_to_qid]
    # Se descarta a quien jugó para otra selección (por ejemplo, tras cambiar de nacionalidad deportiva).
    ans = [q for q in qs if is_person(q) and (not attrs[q].get('sport') or code in nat_codes(q))]
    dem = NATIONS[code][1]
    where = f'al Mundial {year}' if kind == 'mundial' else f'a la Copa América {year}'
    add(f'{dem} convocados {where}', 'arg' if code == 'ARG' else 'tit', ans, min_n=18, max_n=28, famous_at=25)

# --- Rankings ---------------------------------------------------------------
def row_key(r):
    return resolved.get(r['link']) if r['link'] else None

ranking_out = []
ranking_players = {}
for l in lists:
    rows = l['rows'][:DEPTH]
    out_rows = []
    for r in rows:
        q = row_key(r)
        pid = q or ('x:' + r['name'])
        ranking_players[pid] = r['name']
        out_rows.append((pid, r['v']))
    n = len(out_rows)
    max_target = min(30, n - 10) if n >= 25 else max(3, n - 8)
    targets = []
    for t in range(1, max_target + 1):
        v = out_rows[t - 1][1]
        if sum(1 for _, x in out_rows if x == v) <= 3:
            targets.append(t)
    ranking_out.append({'id': l['id'], 't': l['title'], 'q': l['question'], 'u': l['unit'], 'targets': targets, 'r': out_rows})

# --- Tabla de jugadores -----------------------------------------------------
used = {q for c in categories for q in c['a']} | set(ranking_players)
country_qids = sorted({v for q in used if not q.startswith('x:') for v in nat_qids(q)[:1]})
labels = {}
for i in range(0, len(country_qids), 300):
    part = country_qids[i:i + 300]
    for r in wm.sparql('SELECT ?c ?l WHERE { VALUES ?c { %s } ?c rdfs:label ?l FILTER(lang(?l) = "es") }' % ' '.join('wd:' + c for c in part)):
        labels[r['c']['value'].rsplit('/', 1)[1]] = r['l']['value']
countries = sorted(set(labels.values()))
country_index = {c: i for i, c in enumerate(countries)}

def player_row(pid):
    if pid.startswith('x:'):
        return [ranking_players[pid], 0, -1, 0]
    a = attrs.get(pid, {})
    year = int(a['dob'][:4]) if a.get('dob') and a['dob'][:4].isdigit() else 0
    nq = nat_qids(pid)
    country = country_index.get(labels.get(nq[0]), -1) if nq else -1
    row = [title_name(pid, ranking_players.get(pid)), year, country, fame(pid)]
    if alt_name(pid):
        row.append(alt_name(pid))
    return row

order = sorted(used, key=lambda pid: (-(0 if pid.startswith('x:') else fame(pid)), pid))
index = {pid: i for i, pid in enumerate(order)}
players = [player_row(pid) for pid in order]

def dump(name, obj):
    path = os.path.join(OUT, name)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
    return os.path.getsize(path) // 1024

kb = [
    dump('players.json', {'countries': countries, 'p': players}),
    dump('rebuscado.json', {'c': [{'t': c['t'], 'g': c['g'], 'a': [index[q] for q in c['a']]} for c in categories]}),
    dump('rankings.json', {'l': [dict(l, r=[[index[pid], v] for pid, v in l['r']]) for l in ranking_out]}),
]
with open(os.path.join(SP, 'build-ids.json'), 'w', encoding='utf-8') as f:
    json.dump(order, f)

from collections import Counter
print(f'{len(players)} jugadores ({kb[0]} KB), {len(categories)} categorías ({kb[1]} KB), {len(ranking_out)} rankings ({kb[2]} KB)')
print('grupos:', dict(Counter(c['g'] for c in categories)))
print('preguntas de ranking posibles:', sum(len(l['targets']) for l in ranking_out))
for probe in ('Argentinos que jugaron en el Liverpool', 'Jugaron en Boca y en River', 'Argentinos campeones del mundo',
              'Ingleses que jugaron en el Real Madrid', 'Uruguayos que jugaron en el Real Madrid', 'Argentinos convocados al Mundial 2006',
              'Ganadores del Balón de Oro', 'Brasileños que jugaron en el Barcelona'):
    c = next((c for c in categories if c['t'] == probe), None)
    if c:
        print(f"\n{probe} ({len(c['a'])}):", ', '.join(f'{title_name(q)} {fame(q)}' for q in c['a'][:45]))
    else:
        print(f'\n{probe}: NO GENERADA')
