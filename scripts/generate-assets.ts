/**
 * Genera íconos, splash y gráficos de tienda a partir de SVG armados en
 * código (sin imágenes externas): npm run assets
 *
 * Escribe en:
 *  - android/app/src/main/res/  (mipmaps del ícono, foreground adaptativo, splash)
 *  - store/                      (ícono 512 y feature graphic 1024x500 para Google Play)
 *
 * Paleta y personaje son los mismos del juego (src/data/tuning.ts).
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { COLORS } from '../src/data/tuning';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const res = join(root, 'android/app/src/main/res');
const store = join(root, 'store');

const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;
const BG = hex(COLORS.background);
const BG2 = hex(COLORS.grass);
const MINION = hex(COLORS.minion);
const MINION_SHADE = hex(COLORS.minionShade);
const EYE = hex(COLORS.minionEye);
const TOWER = hex(COLORS.tower);
const ROOF = hex(COLORS.towerRoof);
const FONT = 'Inter, DejaVu Sans, Arial, sans-serif';

/** Un minion (blob) centrado en (cx, cy) con radio r. */
function blob(cx: number, cy: number, r: number): string {
  return `
    <ellipse cx="${cx}" cy="${cy + r * 0.12}" rx="${r}" ry="${r * 0.92}" fill="${MINION_SHADE}"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${r * 0.94}" ry="${r * 0.86}" fill="${MINION}"/>
    <ellipse cx="${cx - r * 0.34}" cy="${cy - r * 0.42}" rx="${r * 0.3}" ry="${r * 0.18}" fill="#ffffff" opacity="0.55"/>
    <circle cx="${cx - r * 0.32}" cy="${cy - r * 0.08}" r="${r * 0.14}" fill="${EYE}"/>
    <circle cx="${cx + r * 0.32}" cy="${cy - r * 0.08}" r="${r * 0.14}" fill="${EYE}"/>
    <path d="M ${cx - r * 0.22} ${cy + r * 0.28} Q ${cx} ${cy + r * 0.48} ${cx + r * 0.22} ${cy + r * 0.28}"
          stroke="${EYE}" stroke-width="${r * 0.08}" fill="none" stroke-linecap="round"/>`;
}

/** Personaje del ícono en un lienzo de 108x108 (unidades dp del ícono adaptativo). */
function iconArt(): string {
  // Zona segura del ícono adaptativo: círculo de 66dp centrado. El arte vive ahí.
  return `
    ${blob(30, 66, 9)}
    ${blob(78, 66, 9)}
    ${blob(54, 52, 22)}
    <path d="M 40 30 L 54 18 L 68 30" stroke="${ROOF}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function svg(w: number, h: number, body: string, viewBox = `0 0 ${w} ${h}`): Buffer {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${viewBox}">${body}</svg>`);
}

const background = `
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${BG2}"/><stop offset="1" stop-color="${BG}"/>
  </linearGradient></defs>
  <rect width="108" height="108" fill="url(#g)"/>`;

async function png(buf: Buffer, size: [number, number], out: string): Promise<void> {
  mkdirSync(dirname(out), { recursive: true });
  await sharp(buf, { density: 600 }).resize(size[0], size[1]).png().toFile(out);
}

const DENSITIES: [string, number][] = [
  ['mdpi', 1],
  ['hdpi', 1.5],
  ['xhdpi', 2],
  ['xxhdpi', 3],
  ['xxxhdpi', 4],
];

async function icons(): Promise<void> {
  const full = svg(108, 108, background + iconArt());
  const round = svg(108, 108, `<clipPath id="c"><circle cx="54" cy="54" r="54"/></clipPath><g clip-path="url(#c)">${background}${iconArt()}</g>`);
  const fg = svg(108, 108, iconArt());
  for (const [d, k] of DENSITIES) {
    const legacy = Math.round(48 * k);
    const adaptive = Math.round(108 * k);
    await png(full, [legacy, legacy], join(res, `mipmap-${d}/ic_launcher.png`));
    await png(round, [legacy, legacy], join(res, `mipmap-${d}/ic_launcher_round.png`));
    await png(fg, [adaptive, adaptive], join(res, `mipmap-${d}/ic_launcher_foreground.png`));
  }
  writeFileSync(
    join(res, 'values/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`,
  );
  // El foreground vectorial por defecto de Capacitor no se usa (el ícono adaptativo apunta al mipmap).
  rmSync(join(res, 'drawable-v24/ic_launcher_foreground.xml'), { force: true });
  rmSync(join(res, 'drawable/ic_launcher_background.xml'), { force: true });

  await png(full, [512, 512], join(store, 'icon-512.png'));
}

async function splashes(): Promise<void> {
  const sizes: [string, number, number][] = [
    ['drawable', 480, 320],
    ['drawable-port-mdpi', 320, 480],
    ['drawable-port-hdpi', 480, 800],
    ['drawable-port-xhdpi', 720, 1280],
    ['drawable-port-xxhdpi', 960, 1600],
    ['drawable-port-xxxhdpi', 1280, 1920],
    ['drawable-land-mdpi', 480, 320],
    ['drawable-land-hdpi', 800, 480],
    ['drawable-land-xhdpi', 1280, 720],
    ['drawable-land-xxhdpi', 1600, 960],
    ['drawable-land-xxxhdpi', 1920, 1280],
  ];
  for (const [dir, w, h] of sizes) {
    const s = Math.min(w, h) * 0.42;
    const body = `<rect width="${w}" height="${h}" fill="${BG}"/>
      <g transform="translate(${w / 2 - s / 2} ${h / 2 - s / 2}) scale(${s / 108})">${iconArt()}</g>`;
    await png(svg(w, h, body), [w, h], join(res, `${dir}/splash.png`));
  }
}

async function featureGraphic(): Promise<void> {
  const w = 1024;
  const h = 500;
  let row = '';
  for (let i = 0; i < 10; i++) row += blob(80 + i * 78, 420 + (i % 2) * 10, 22);
  const body = `
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${BG2}"/><stop offset="1" stop-color="${BG}"/>
    </linearGradient></defs>
    <rect width="${w}" height="${h}" fill="url(#g)"/>
    <rect x="880" y="120" width="130" height="220" fill="${TOWER}"/>
    <rect x="860" y="250" width="164" height="90" fill="${TOWER}"/>
    <polygon points="948,60 948,100 986,80" fill="${ROOF}"/>
    <rect x="944" y="60" width="6" height="60" fill="${ROOF}"/>
    ${row}
    <g transform="translate(70 70) scale(2.6)">${iconArt()}</g>
    <text x="330" y="220" font-family="${FONT}" font-weight="900" font-size="84" fill="${MINION}"
          stroke="#10121c" stroke-width="10" paint-order="stroke">Blobalanche</text>
    <text x="334" y="280" font-family="${FONT}" font-weight="700" font-size="36" fill="#c9c0ff">Llevá la horda hasta la torre</text>`;
  await png(svg(w, h, body), [w, h], join(store, 'feature-graphic-1024x500.png'));
}

await icons();
await splashes();
await featureGraphic();
console.log('✔ íconos, splash y gráficos de tienda generados');
