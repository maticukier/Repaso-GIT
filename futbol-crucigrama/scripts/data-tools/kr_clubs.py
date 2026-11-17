"""Paso 1 del juego Rebuscado: jugadores de cada club según las categorías de Wikipedia en inglés."""
import json, os, sys
import wm

SP = sys.argv[1]
# id: (nombre en español con artículo para "en ...", país, [categorías candidatas])
CLUBS = {
 'liverpool': ('el Liverpool', 'ENG', ['Liverpool F.C. players']),
 'manutd': ('el Manchester United', 'ENG', ['Manchester United F.C. players']),
 'mancity': ('el Manchester City', 'ENG', ['Manchester City F.C. players']),
 'chelsea': ('el Chelsea', 'ENG', ['Chelsea F.C. players']),
 'arsenal': ('el Arsenal', 'ENG', ['Arsenal F.C. players']),
 'tottenham': ('el Tottenham', 'ENG', ['Tottenham Hotspur F.C. players']),
 'newcastle': ('el Newcastle', 'ENG', ['Newcastle United F.C. players']),
 'westham': ('el West Ham', 'ENG', ['West Ham United F.C. players']),
 'everton': ('el Everton', 'ENG', ['Everton F.C. players']),
 'astonvilla': ('el Aston Villa', 'ENG', ['Aston Villa F.C. players']),
 'realmadrid': ('el Real Madrid', 'ESP', ['Real Madrid CF players']),
 'barcelona': ('el Barcelona', 'ESP', ['FC Barcelona players']),
 'atletico': ('el Atlético de Madrid', 'ESP', ['Atlético Madrid footballers', 'Atlético Madrid players']),
 'sevilla': ('el Sevilla', 'ESP', ['Sevilla FC players']),
 'valencia': ('el Valencia', 'ESP', ['Valencia CF players']),
 'villarreal': ('el Villarreal', 'ESP', ['Villarreal CF players']),
 'betis': ('el Betis', 'ESP', ['Real Betis players']),
 'juventus': ('la Juventus', 'ITA', ['Juventus FC players', 'Juventus F.C. players']),
 'milan': ('el Milan', 'ITA', ['AC Milan players', 'A.C. Milan players']),
 'inter': ('el Inter', 'ITA', ['Inter Milan players']),
 'napoli': ('el Napoli', 'ITA', ['SSC Napoli players', 'S.S.C. Napoli players']),
 'roma': ('la Roma', 'ITA', ['AS Roma players', 'A.S. Roma players']),
 'lazio': ('la Lazio', 'ITA', ['SS Lazio players', 'S.S. Lazio players']),
 'fiorentina': ('la Fiorentina', 'ITA', ['ACF Fiorentina players']),
 'bayern': ('el Bayern Múnich', 'GER', ['FC Bayern Munich footballers', 'FC Bayern Munich players']),
 'dortmund': ('el Borussia Dortmund', 'GER', ['Borussia Dortmund players']),
 'leverkusen': ('el Bayer Leverkusen', 'GER', ['Bayer 04 Leverkusen players']),
 'psg': ('el PSG', 'FRA', ['Paris Saint-Germain FC players', 'Paris Saint-Germain F.C. players']),
 'marseille': ('el Olympique de Marsella', 'FRA', ['Olympique de Marseille players']),
 'monaco': ('el Mónaco', 'FRA', ['AS Monaco FC players']),
 'lyon': ('el Lyon', 'FRA', ['Olympique Lyonnais players']),
 'ajax': ('el Ajax', 'NED', ['AFC Ajax players']),
 'psv': ('el PSV', 'NED', ['PSV Eindhoven players']),
 'porto': ('el Porto', 'POR', ['FC Porto players']),
 'benfica': ('el Benfica', 'POR', ['SL Benfica footballers', 'S.L. Benfica footballers']),
 'sporting': ('el Sporting de Lisboa', 'POR', ['Sporting CP footballers']),
 'boca': ('Boca', 'ARG', ['Boca Juniors footballers', 'Boca Juniors players']),
 'river': ('River', 'ARG', ['Club Atlético River Plate footballers', 'River Plate footballers']),
 'racing': ('Racing', 'ARG', ['Racing Club de Avellaneda footballers']),
 'independiente': ('Independiente', 'ARG', ['Club Atlético Independiente footballers']),
 'sanlorenzo': ('San Lorenzo', 'ARG', ['San Lorenzo de Almagro footballers']),
 'estudiantes': ('Estudiantes de La Plata', 'ARG', ['Estudiantes de La Plata footballers']),
 'velez': ('Vélez', 'ARG', ['Club Atlético Vélez Sarsfield footballers']),
 'newells': ("Newell's", 'ARG', ["Newell's Old Boys footballers"]),
 'central': ('Rosario Central', 'ARG', ['Rosario Central footballers']),
 'argentinos': ('Argentinos Juniors', 'ARG', ['Argentinos Juniors footballers']),
 'huracan': ('Huracán', 'ARG', ['Club Atlético Huracán footballers']),
 'lanus': ('Lanús', 'ARG', ['Club Atlético Lanús footballers']),
 'gimnasia': ('Gimnasia de La Plata', 'ARG', ['Club de Gimnasia y Esgrima La Plata footballers']),
 'banfield': ('Banfield', 'ARG', ['Club Atlético Banfield footballers']),
 'talleres': ('Talleres', 'ARG', ['Talleres de Córdoba footballers']),
 'flamengo': ('el Flamengo', 'BRA', ['CR Flamengo footballers']),
 'santos': ('el Santos', 'BRA', ['Santos FC players']),
 'saopaulo': ('el San Pablo', 'BRA', ['São Paulo FC players']),
 'palmeiras': ('el Palmeiras', 'BRA', ['Sociedade Esportiva Palmeiras players']),
 'corinthians': ('el Corinthians', 'BRA', ['Sport Club Corinthians Paulista players']),
 'penarol': ('Peñarol', 'URU', ['Peñarol players']),
 'nacional': ('Nacional de Uruguay', 'URU', ['Club Nacional de Football players']),
 'colocolo': ('Colo-Colo', 'CHI', ['Colo-Colo footballers']),
 'intermiami': ('el Inter Miami', 'USA', ['Inter Miami CF players']),
}
AWARDS = {
 'mundial': ['FIFA World Cup-winning players'],
 'champions': ['UEFA Champions League winning players', 'UEFA Champions League-winning players'],
 'libertadores': ['Copa Libertadores-winning players', 'Copa Libertadores winning players'],
 'copaamerica': ['Copa América-winning players'],
 'eurocopa': ['UEFA European Championship-winning players'],
 'balondeoro': ["Ballon d'Or winners"],
 'botadeoro': ['European Golden Shoe winners'],
 'pichichi': ['Pichichi Trophy winners'],
 'premiergoleador': ['Premier League Golden Boot winners'],
 'mundialclubes': ['FIFA Club World Cup-winning players', 'FIFA Club World Cup winning players'],
}

def members(cat):
    q = '''SELECT ?item WHERE {
      SERVICE wikibase:mwapi {
        bd:serviceParam wikibase:endpoint "en.wikipedia.org"; wikibase:api "Generator"; mwapi:generator "categorymembers";
          mwapi:gcmtitle %s; mwapi:gcmlimit "max"; mwapi:gcmnamespace "0"; wikibase:limit 9000 .
        ?item wikibase:apiOutputItem mwapi:item .
      }
    }''' % json.dumps('Category:' + cat, ensure_ascii=False)
    return sorted({r['item']['value'].rsplit('/', 1)[1] for r in wm.sparql(q) if 'item' in r})

out = {'clubs': {}, 'awards': {}}
for kind, table in (('clubs', CLUBS), ('awards', AWARDS)):
    for cid, spec in table.items():
        cats = spec[2] if kind == 'clubs' else spec
        got, used = [], None
        for cat in cats:
            try:
                got = members(cat)
            except Exception as e:
                print('ERR', cid, cat, str(e)[:120], flush=True); got = []
            if got:
                used = cat; break
        print(f'{cid:16s} {len(got):5d}  {used}', flush=True)
        entry = {'category': used, 'members': got}
        if kind == 'clubs':
            entry.update(es=spec[0], country=spec[1])
        out[kind][cid] = entry
json.dump(out, open(os.path.join(SP, 'kr', 'members.json'), 'w', encoding='utf-8'), ensure_ascii=False)
