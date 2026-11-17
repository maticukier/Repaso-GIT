"""Segunda fuente para Rebuscado: jugadores de cada club según Wikidata (propiedad P54).

Se une con las categorías de Wikipedia: alcanza con que una de las dos fuentes
registre que el jugador pasó por el club. Guarda kr/wd-clubs.json.
"""
import json, os, sys, time
import wm

SP = sys.argv[1]
# Artículo de Wikipedia en inglés de cada club.
TITLES = {
    'liverpool': 'Liverpool F.C.', 'manutd': 'Manchester United F.C.', 'mancity': 'Manchester City F.C.',
    'chelsea': 'Chelsea F.C.', 'arsenal': 'Arsenal F.C.', 'tottenham': 'Tottenham Hotspur F.C.',
    'newcastle': 'Newcastle United F.C.', 'westham': 'West Ham United F.C.', 'everton': 'Everton F.C.',
    'astonvilla': 'Aston Villa F.C.', 'realmadrid': 'Real Madrid CF', 'barcelona': 'FC Barcelona',
    'atletico': 'Atlético Madrid', 'sevilla': 'Sevilla FC', 'valencia': 'Valencia CF', 'villarreal': 'Villarreal CF',
    'betis': 'Real Betis', 'juventus': 'Juventus FC', 'milan': 'AC Milan', 'inter': 'Inter Milan',
    'napoli': 'SSC Napoli', 'roma': 'AS Roma', 'lazio': 'SS Lazio', 'fiorentina': 'ACF Fiorentina',
    'bayern': 'FC Bayern Munich', 'dortmund': 'Borussia Dortmund', 'leverkusen': 'Bayer 04 Leverkusen',
    'psg': 'Paris Saint-Germain FC', 'marseille': 'Olympique de Marseille', 'monaco': 'AS Monaco FC',
    'lyon': 'Olympique Lyonnais', 'ajax': 'AFC Ajax', 'psv': 'PSV Eindhoven', 'porto': 'FC Porto',
    'benfica': 'S.L. Benfica', 'sporting': 'Sporting CP', 'boca': 'Boca Juniors',
    'river': 'Club Atlético River Plate', 'racing': 'Racing Club de Avellaneda',
    'independiente': 'Club Atlético Independiente', 'sanlorenzo': 'San Lorenzo de Almagro',
    'estudiantes': 'Estudiantes de La Plata', 'velez': 'Club Atlético Vélez Sarsfield',
    'newells': "Newell's Old Boys", 'central': 'Rosario Central', 'argentinos': 'Argentinos Juniors',
    'huracan': 'Club Atlético Huracán', 'lanus': 'Club Atlético Lanús',
    'gimnasia': 'Club de Gimnasia y Esgrima La Plata', 'banfield': 'Club Atlético Banfield',
    'talleres': 'Talleres de Córdoba', 'flamengo': 'CR Flamengo', 'santos': 'Santos FC',
    'saopaulo': 'São Paulo FC', 'palmeiras': 'SE Palmeiras', 'corinthians': 'Sport Club Corinthians Paulista',
    'penarol': 'Peñarol', 'nacional': 'Club Nacional de Football', 'colocolo': 'Colo-Colo',
    'intermiami': 'Inter Miami CF',
}

path = os.path.join(SP, 'kr', 'wd-clubs.json')
out = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}

values = ' '.join(json.dumps(t, ensure_ascii=False) + '@en' for t in TITLES.values())
rows = wm.sparql('''SELECT ?title ?club WHERE {
  VALUES ?title { %s }
  ?a schema:name ?title ; schema:isPartOf <https://en.wikipedia.org/> ; schema:about ?club .
}''' % values, gap=90.0)
club_qid = {r['title']['value']: r['club']['value'].rsplit('/', 1)[1] for r in rows}
print('clubes encontrados:', len(club_qid), 'de', len(TITLES), flush=True)

for cid, title in TITLES.items():
    if cid in out or title not in club_qid:
        if title not in club_qid:
            print('  sin ítem:', cid, title)
        continue
    q = club_qid[title]
    rows = wm.sparql('SELECT DISTINCT ?p WHERE { ?p p:P54/ps:P54 wd:%s . ?p wdt:P31 wd:Q5 . }' % q, gap=90.0)
    out[cid] = {'club': q, 'members': sorted({r['p']['value'].rsplit('/', 1)[1] for r in rows})}
    json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'{cid:14s} {len(out[cid]["members"]):5d}', time.strftime('%T'), flush=True)
print('listo')
