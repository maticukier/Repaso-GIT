"""Juego Ranking: extrae listas ordenadas (goles / partidos) de tablas de Wikipedia en inglés."""
import json, os, re, sys
import wp

SP = sys.argv[1]
MU, LIV, ARS, CHE = 'Manchester United', 'Liverpool', 'Arsenal', 'Chelsea'
def eng(club, page):
    return [('en', f'List of {page} players'), ('en', f'List of {page} players (25–99 appearances)')]

# id, título, pregunta, unidad, páginas, tabla (regex de caption o índice), columna nombre, columna valor
LISTS = [
 ('manutd-g', 'Goleadores históricos del Manchester United', 'el goleador histórico n.º {n} del Manchester United', 'goles', eng(MU, 'Manchester United F.C.'), r'players with', 'Name', 'Goals'),
 ('manutd-p', 'Más partidos en el Manchester United', 'el n.º {n} con más partidos en la historia del Manchester United', 'partidos', eng(MU, 'Manchester United F.C.')[:1], r'players with', 'Name', 'Total'),
 ('liverpool-g', 'Goleadores históricos del Liverpool', 'el goleador histórico n.º {n} del Liverpool', 'goles', eng(LIV, 'Liverpool F.C.'), r'players with', 'Player', 'Goals'),
 ('liverpool-p', 'Más partidos en el Liverpool', 'el n.º {n} con más partidos en la historia del Liverpool', 'partidos', eng(LIV, 'Liverpool F.C.')[:1], r'players with', 'Player', 'Total'),
 ('arsenal-g', 'Goleadores históricos del Arsenal', 'el goleador histórico n.º {n} del Arsenal', 'goles', eng(ARS, 'Arsenal F.C.'), r'players with', 'Player', 'Goals'),
 ('arsenal-p', 'Más partidos en el Arsenal', 'el n.º {n} con más partidos en la historia del Arsenal', 'partidos', eng(ARS, 'Arsenal F.C.')[:1], r'players with', 'Player', 'Total'),
 ('chelsea-g', 'Goleadores históricos del Chelsea', 'el goleador histórico n.º {n} del Chelsea', 'goles', eng(CHE, 'Chelsea F.C.'), r'players with', 'Player', 'Goals'),
 ('chelsea-p', 'Más partidos en el Chelsea', 'el n.º {n} con más partidos en la historia del Chelsea', 'partidos', eng(CHE, 'Chelsea F.C.')[:1], r'players with', 'Player', 'Total'),
 ('realmadrid-g', 'Goleadores históricos del Real Madrid', 'el goleador histórico n.º {n} del Real Madrid', 'goles', [('en', 'List of Real Madrid CF players')], 2, 'Player', 'G'),
 ('realmadrid-p', 'Más partidos en el Real Madrid', 'el n.º {n} con más partidos en la historia del Real Madrid', 'partidos', [('en', 'List of Real Madrid CF players')], 2, 'Player', 'M'),
 ('juventus-p', 'Más partidos en la Juventus', 'el n.º {n} con más partidos en la historia de la Juventus', 'partidos', [('en', 'List of Juventus FC players')], 0, 'Player', 'Appearances'),
 ('milan-p', 'Más partidos en el Milan', 'el n.º {n} con más partidos en la historia del Milan', 'partidos', [('en', 'List of AC Milan players')], r'at least 100', 'Player', 'Appearances'),
 ('inter-p', 'Más partidos en el Inter', 'el n.º {n} con más partidos en la historia del Inter', 'partidos', [('en', 'List of Inter Milan players')], r'at least 100', 'Player', 'Appearances'),
 ('champions-g', 'Goleadores históricos de la Champions League', 'el goleador n.º {n} en la historia de la Champions League', 'goles', [('en', 'List of UEFA Champions League top scorers')], 0, 'Player', 'Goals'),
 ('laliga-g', 'Goleadores históricos de la liga española', 'el goleador n.º {n} en la historia de la liga española', 'goles', [('en', 'List of La Liga top scorers')], 0, 'Player', 'Goals'),
 ('premier-g', 'Goleadores históricos de la Premier League', 'el goleador n.º {n} en la historia de la Premier League (desde 1992)', 'goles', [('en', 'List of footballers with 100 or more Premier League goals')], 0, 'Player', 'Goals'),
 ('seriea-g', 'Goleadores históricos de la Serie A', 'el goleador n.º {n} en la historia de la Serie A italiana', 'goles', [('en', 'List of Serie A players with 100 or more goals')], 0, 'Player', 'Goals'),
 ('bundesliga-g', 'Goleadores históricos de la Bundesliga', 'el goleador n.º {n} en la historia de la Bundesliga', 'goles', [('en', 'List of Bundesliga top scorers')], 0, 'Player', 'Goals'),
 ('selecciones-g', 'Máximos goleadores de selecciones', 'el n.º {n} entre los máximos goleadores de selecciones de la historia', 'goles', [('en', "List of men's footballers with 50 or more international goals")], 1, 'Player', 'Goals'),
 ('mundiales-g', 'Goleadores históricos de los Mundiales', 'el goleador n.º {n} en la historia de los Mundiales', 'goles', [('en', 'List of FIFA World Cup top goalscorers')], r'at least 5 goals', 'Player', 'Goals scored'),
 ('argentina-g', 'Goleadores históricos de la Selección Argentina', 'el goleador histórico n.º {n} de la Selección Argentina', 'goles', [('en', 'List of Argentina international footballers')], 1, 'Players', 'Goals'),
 ('argentina-p', 'Más partidos en la Selección Argentina', 'el n.º {n} con más partidos en la Selección Argentina', 'partidos', [('en', 'List of Argentina international footballers')], 1, 'Players', 'Caps'),
 ('brasil-p', 'Más partidos en la selección de Brasil', 'el n.º {n} con más partidos en la selección de Brasil', 'partidos', [('en', 'List of Brazil international footballers')], 1, 'Player', 'Caps'),
 ('uruguay-p', 'Más partidos en la selección de Uruguay', 'el n.º {n} con más partidos en la selección de Uruguay', 'partidos', [('en', 'List of Uruguay international footballers')], 1, 'Player', 'Caps'),
 ('primera-g', 'Goleadores históricos de la Primera División argentina', 'el goleador n.º {n} en la historia de la Primera División argentina', 'goles', [('en', 'List of Argentine Primera División top scorers')], 0, 'Player', 'Goals'),
 ('libertadores-g', 'Goleadores históricos de la Copa Libertadores', 'el goleador n.º {n} en la historia de la Copa Libertadores', 'goles', [('en', 'List of Copa Libertadores top scorers')], 1, 'Player', 'Goals'),
]

def clean_name(text):
    text = re.sub(r'\s*\((c|captain|list)\)\s*', ' ', text, flags=re.I)
    text = re.sub(r'[\*†‡§¤#^~♦‹›«»]+', '', text)
    return re.sub(r'\s+', ' ', text).strip(' ,;:')

out = []
for lid, title, question, unit, pages, tsel, name_h, val_h in LISTS:
    rows = {}
    for lang, page in pages:
        ts = wp.tables(wp.page(lang, page))
        if isinstance(tsel, int):
            cap, grid = ts[tsel]
        else:
            cap, grid = next((c, g) for c, g in ts if re.search(tsel, c, re.I))
        nh = 0
        while nh < len(grid) and all(c[2] == 'th' for c in grid[nh]):
            nh += 1
        nh = max(nh, 1)
        heads = grid[:nh]
        def col(h):
            for hr in reversed(heads):
                for i, c in enumerate(hr):
                    if c[0].strip().lower() == h.lower():
                        return i
            raise KeyError(f'{lid}: sin columna {h} en {[c[0] for c in heads[-1]]}')
        ni, vi = col(name_h), col(val_h)
        for r in grid[nh:]:
            if len(r) <= max(ni, vi):
                continue
            text, link, _, atext = r[ni]
            digits = re.sub(r'[^\d]', '', r[vi][0].split('(')[0])
            if not digits:
                continue
            name = clean_name(atext or text)
            if link and re.search(r'List of|goals scored', link): link = None
            if not name or name.lower() in ('player', 'name', 'total'):
                continue
            key = link or ('~' + name)
            v = int(digits)
            if key not in rows or v > rows[key]['v']:
                rows[key] = {'name': name, 'link': link, 'v': v}
    ranked = sorted(rows.values(), key=lambda r: (-r['v'], r['name']))
    out.append({'id': lid, 'title': title, 'question': question, 'unit': unit, 'source': [p for _, p in pages], 'rows': ranked})
    print(f"{lid:16s} {len(ranked):4d}  " + ', '.join(f"{r['name']} {r['v']}" for r in ranked[:4]), flush=True)
json.dump(out, open(os.path.join(SP, 'rk', 'lists-raw.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
