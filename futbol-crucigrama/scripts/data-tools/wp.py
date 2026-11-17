"""Baja el HTML de un artículo de Wikipedia (con caché) y extrae sus tablas."""
import re, urllib.parse
from bs4 import BeautifulSoup
import wm

def page(lang, title):
    url = f'https://{lang}.wikipedia.org/wiki/' + urllib.parse.quote(title.replace(' ', '_'), safe='()_,:\'')
    return BeautifulSoup(wm.fetch(url, min_gap=6.0), 'lxml')

def cell_text(td):
    for sup in td.find_all('sup'):
        sup.decompose()
    for s in td.find_all(style=re.compile('display: ?none')):
        s.decompose()
    return re.sub(r'\s+', ' ', td.get_text(' ', strip=True)).strip()

def tables(soup):
    """Devuelve [(caption, headers, rows)] con rowspan/colspan expandidos; cada celda = (texto, href|None)."""
    out = []
    for t in soup.find_all('table', class_=re.compile('wikitable')):
        grid, pending = [], {}
        for tr in t.find_all('tr'):
            row, col = [], 0
            cells = tr.find_all(['th', 'td'], recursive=False)
            ci = 0
            while ci < len(cells) or col in pending:
                if col in pending:
                    val, left = pending[col]
                    row.append(val)
                    if left > 1: pending[col] = (val, left - 1)
                    else: del pending[col]
                    col += 1
                    continue
                c = cells[ci]; ci += 1
                a = atext = None
                for link in c.find_all('a', href=True):
                    h = link['href']
                    m = re.match(r'^(?:https?://[a-z]+\.wikipedia\.org)?/wiki/([^?#]+)', h) or re.match(r'^\./([^?#]+)', h)
                    if m and ':' not in m.group(1) and not link.find('img') and 'new' not in link.get('class', []):
                        a = urllib.parse.unquote(m.group(1)).replace('_', ' ')
                        atext = re.sub(r'\s+', ' ', link.get_text(' ', strip=True)); break
                val = (cell_text(c), a, c.name, atext)
                rs = int(re.sub(r'\D', '', c.get('rowspan', '1')) or 1); cs = int(re.sub(r'\D', '', c.get('colspan', '1')) or 1)
                for k in range(cs):
                    row.append(val)
                    if rs > 1: pending[col] = (val, rs - 1)
                    col += 1
            if row: grid.append(row)
        cap = t.find('caption')
        out.append((cell_text(cap) if cap else '', grid))
    return out
