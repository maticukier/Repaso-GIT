"""Helpers para consultar Wikidata / Wikipedia / Commons con caché y reintentos."""
import hashlib, json, os, subprocess, time, urllib.parse

UA = 'FutboleroTrivia/1.0 (hobby football quiz app)'
CACHE = os.environ.get('WM_CACHE', os.path.join(os.path.dirname(os.path.abspath(__file__)), '.cache'))
_last = [0.0]

def fetch(url, binary=False, min_gap=3.0, tries=10):
    """GET con caché en disco; respeta Retry-After cuando el servidor devuelve 429."""
    key = hashlib.sha1(url.encode()).hexdigest()
    path = os.path.join(CACHE, key + ('.bin' if binary else '.txt'))
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return open(path, 'rb').read() if binary else open(path, encoding='utf-8').read()
    code = '?'
    for attempt in range(tries):
        wait = min_gap - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        tmp, hdr = path + '.tmp', path + '.hdr'
        r = subprocess.run(['curl', '-s', '-L', '--max-time', '90', '-A', UA, '-D', hdr, '-o', tmp, '-w', '%{http_code}', url],
                           capture_output=True, text=True)
        _last[0] = time.time()
        code = r.stdout.strip()
        if code == '200' and os.path.exists(tmp) and os.path.getsize(tmp) > 0:
            os.replace(tmp, path)
            return open(path, 'rb').read() if binary else open(path, encoding='utf-8').read()
        if code in ('403', '404'):
            raise RuntimeError(code + ': ' + url[:150])
        retry = 10 + attempt * 10
        try:
            for line in open(hdr, encoding='utf-8', errors='replace'):
                if line.lower().startswith('retry-after:'):
                    retry = min(180, int(line.split(':', 1)[1].strip()) + 3)
        except Exception:
            pass
        time.sleep(retry)
    raise RuntimeError(f'fetch failed ({code}): {url[:150]}')

def api(host, **params):
    params.setdefault('format', 'json')
    return json.loads(fetch(f'https://{host}/w/api.php?' + urllib.parse.urlencode(params)))

def sparql(query, tries=6, gap=6.0):
    key = hashlib.sha1(('sparql:' + query).encode()).hexdigest()
    path = os.path.join(CACHE, key + '.json')
    if os.path.exists(path):
        return json.load(open(path, encoding='utf-8'))['results']['bindings']
    code = '?'
    for attempt in range(tries):
        wait = gap - (time.time() - _last[0])
        if wait > 0:
            time.sleep(wait)
        tmp, hdr = path + '.tmp', path + '.hdr'
        r = subprocess.run(['curl', '-s', '--max-time', '90', '-A', UA, '-H', 'Accept: application/sparql-results+json',
                            '--data-urlencode', 'query=' + query, '-D', hdr, '-o', tmp, '-w', '%{http_code}',
                            'https://query.wikidata.org/sparql'], capture_output=True, text=True)
        _last[0] = time.time()
        code = r.stdout.strip()
        if code == '200':
            try:
                data = json.load(open(tmp, encoding='utf-8'))
                os.replace(tmp, path)
                return data['results']['bindings']
            except Exception:
                raise RuntimeError('sparql: respuesta incompleta (timeout del servidor)')
        if code in ('400', '500'):
            raise RuntimeError('sparql %s: %s' % (code, open(tmp, encoding='utf-8', errors='replace').read()[:400]))
        retry = 15 + attempt * 10
        try:
            for line in open(hdr, encoding='utf-8', errors='replace'):
                if line.lower().startswith('retry-after:'):
                    retry = min(1500, int(line.split(':', 1)[1].strip()) + 5)
        except Exception:
            pass
        print(f'    (servidor ocupado: espero {retry} s)', flush=True)
        time.sleep(retry)
    raise RuntimeError('sparql failed (%s)' % code)
