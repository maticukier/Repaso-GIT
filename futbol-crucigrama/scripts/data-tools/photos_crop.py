"""Recorta las fotos a un cuadrado centrado arriba (donde suele estar la cara) y arma una hoja de contactos."""
import json, os, sys
from PIL import Image, ImageDraw, ImageOps

SP = sys.argv[1]
SIZE = 160
meta = json.load(open(os.path.join(SP, 'photos-meta.json'), encoding='utf-8'))
tile = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'photo-crops.json')))  # [cx, cy, zoom] relativos al recorte por defecto
os.makedirs(os.path.join(SP, 'photos'), exist_ok=True)
tiles = []
for pid, m in meta.items():
    im = ImageOps.exif_transpose(Image.open(m['local'])).convert('RGB')
    w, h = im.size
    side = min(w, h)
    top = int((h - side) * 0.12) if h > w else (h - side) // 2
    left = (w - side) // 2
    if pid in tile:
        cx, cy, zoom = tile[pid]
        small = int(side * zoom)
        left = int(left + cx * side - small / 2); top = int(top + cy * side - small / 2)
        side = small
    left = max(0, min(w - side, left)); top = max(0, min(h - side, top))
    out = im.crop((left, top, left + side, top + side)).resize((SIZE, SIZE), Image.LANCZOS)
    out.save(os.path.join(SP, 'photos', pid + '.jpg'), quality=72, optimize=True)
    if pid in tile: tiles.append((pid, m['name'], out))
cols = 9
per = 54
for page in range(0, len(tiles), per):
    chunk = tiles[page:page + per]
    rows = (len(chunk) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * 170, rows * 190), 'white')
    d = ImageDraw.Draw(sheet)
    for i, (pid, name, im) in enumerate(chunk):
        x, y = (i % cols) * 170 + 5, (i // cols) * 190 + 5
        sheet.paste(im, (x, y))
        d.text((x, y + 162), name[:24], fill='black')
        d.text((x, y + 174), pid, fill='gray')
    sheet.save(os.path.join(SP, f'contact-{page // per + 1}.jpg'), quality=80)
total = sum(os.path.getsize(os.path.join(SP, 'photos', p + '.jpg')) for p in meta)
print(len(meta), 'fotos,', total // 1024, 'KB en total')
