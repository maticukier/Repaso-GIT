"""Genera src/data/fifa-cards.json para el juego "¿Quién es la carta?".

Fuente: https://github.com/mzafram2001/ea-fc (licencia MIT), datos de SoFIFA.
Uso:
    git clone --depth 1 https://github.com/mzafram2001/ea-fc.git /tmp/ea-fc
    python3 scripts/build-fifa-data.py /tmp/ea-fc/data
"""

import csv
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

# Ediciones del juego: FIFA 14 a FIFA 23 y EA FC 24 a 26.
EDITIONS = [(f'dataset_fifa_{n}.csv', n) for n in range(14, 24)] + [
    (f'dataset_ea_fc_{n}.csv', n) for n in range(24, 27)
]
ANSWER_MIN = 86  # para ser respuesta, haber tenido al menos esta media
CARD_MIN = 80  # solo cartas de ediciones en las que era conocido
SEARCH_MIN = 80  # jugadores que aparecen en el buscador
STATS = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical']

data_dir = Path(sys.argv[1])
players = {}
cards = defaultdict(list)
best = defaultdict(int)

for filename, edition in EDITIONS:
    with open(data_dir / filename, encoding='utf-8-sig') as f:
        for row in csv.DictReader(f):
            pid = int(row['sofifa_id'])
            overall = int(row['overall'])
            best[pid] = max(best[pid], overall)
            # Nos quedamos con el nombre y la nacionalidad más recientes.
            short = row['alias'] or row['short_name']
            # "G. Buffon" se muestra como "Gianluigi Buffon"; "Pepe" o "Xavi" quedan así.
            name = row['long_name'] if re.match(r'^\w{1,2}\. ', short) else short
            players[pid] = {'name': name, 'nat': row['nationality']}
            if overall >= CARD_MIN:
                cards[pid].append({
                    'v': edition,
                    'club': row['club_name'],
                    'pos': row['positions'].split(',')[0].strip(),
                    'ovr': overall,
                    's': [int(row[s]) for s in STATS],
                })

answers = [
    {'id': pid, **players[pid], 'cards': cards[pid]}
    for pid in sorted(best)
    if best[pid] >= ANSWER_MIN
]
search = [
    [pid, players[pid]['name'], players[pid]['nat']]
    for pid in sorted(best)
    if best[pid] >= SEARCH_MIN
]

out = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'fifa-cards.json'
out.write_text(
    json.dumps({'answers': answers, 'search': search}, ensure_ascii=False, separators=(',', ':')),
    encoding='utf-8',
)
print(f'{len(answers)} respuestas, {len(search)} en el buscador, {out.stat().st_size // 1024} KB')
