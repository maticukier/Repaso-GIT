"""Baja metadatos (licencia, autor, miniatura) de las fotos de Commons y las miniaturas."""
import html, json, os, re, sys, urllib.parse
import wm

SP = sys.argv[1]
players = json.load(open(os.path.join(SP, 'players-wd.json'), encoding='utf-8'))
title_of = {}
for pid, p in players.items():
    name = urllib.parse.unquote(p['img'].rsplit('/Special:FilePath/', 1)[1])
    title_of[pid] = 'File:' + name.replace('_', ' ')

titles = sorted(set(title_of.values()))
meta = {}
for i in range(0, len(titles), 40):
    batch = titles[i:i + 40]
    data = wm.api('commons.wikimedia.org', action='query', titles='|'.join(batch), prop='imageinfo',
                  iiprop='extmetadata|url|size', iiurlwidth='330', iiextmetadatafilter='Artist|LicenseShortName|LicenseUrl|Credit|AttributionRequired')
    norm = {n['to']: n['from'] for n in data['query'].get('normalized', [])}
    for page in data['query']['pages'].values():
        t = norm.get(page['title'], page['title'])
        ii = (page.get('imageinfo') or [None])[0]
        if not ii:
            print('SIN INFO', t); continue
        em = ii.get('extmetadata', {})
        def clean(k):
            v = em.get(k, {}).get('value', '')
            v = re.sub(r'<[^>]+>', '', html.unescape(v))
            return re.sub(r'\s+', ' ', v).strip()
        meta[t] = {'thumb': ii.get('thumburl'), 'w': ii.get('thumbwidth'), 'h': ii.get('thumbheight'),
                   'page': ii.get('descriptionurl'), 'artist': clean('Artist'), 'license': clean('LicenseShortName'),
                   'license_url': em.get('LicenseUrl', {}).get('value', ''), 'credit': clean('Credit')}
    print('lote', i // 40 + 1, 'ok', len(meta), flush=True)

out = {}
os.makedirs(os.path.join(SP, 'photos-raw'), exist_ok=True)
for pid, p in players.items():
    m = meta.get(title_of[pid])
    if not m or not m['thumb']:
        print('FALTA', p['name'], title_of[pid]); continue
    dest = os.path.join(SP, 'photos-raw', pid + os.path.splitext(m['thumb'].split('?')[0])[1].lower())
    if not dest.endswith(('.jpg', '.jpeg', '.png', '.webp')): dest += '.jpg'
    if not os.path.exists(dest):
        try:
            url = m['thumb'].split('?')[0].replace('//thumb.wikimedia.org/', '//upload.wikimedia.org/')
            data = wm.fetch(url, binary=True, min_gap=1.5)
            open(dest, 'wb').write(data)
        except Exception as e:
            print('ERR descarga', p['name'], e); continue
    out[pid] = dict(m, name=p['name'], qid=p['qid'], file=title_of[pid], local=dest)
json.dump(out, open(os.path.join(SP, 'photos-meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(out), 'fotos descargadas de', len(players))
