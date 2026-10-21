/**
 * Capturas para Google Play a partir de partidas REALES: npm run screenshots
 * (correr antes `npm run build`).
 *
 * - Build de producción (vite preview), guardado vacío, sin panel de debug.
 * - Se juega con input real (arrastre del dedo/mouse); nada se dibuja ni se
 *   edita encima. Los niveles 11 y 20 se abren con ?level=N (mismo nivel y
 *   mismas reglas que desde el menú; sólo saltea la selección).
 * - Falla si la página tira cualquier error.
 *
 * Salida: store/screenshots/*.png en 1080x1920 (vertical 9:16).
 */
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page } from 'playwright';
import { GAME_H, GAME_W, launchBrowser, sleep, startPreview } from './browserUtil';

const out = join(dirname(fileURLToPath(import.meta.url)), '../store/screenshots');
const VIEW = { width: 720, height: 1280 };
const DPR = 1.5;

/** Coordenadas del juego (720x1280) -> página. Con este viewport coinciden 1:1. */
const at = (x: number, y: number): [number, number] => [(x * VIEW.width) / GAME_W, (y * VIEW.height) / GAME_H];

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: join(out, `${name}.png`) });
  console.log(`  ✔ ${name}.png`);
}

/**
 * Mantiene el dedo apretado apuntando a `aimX` (el cañón arranca en 360 y se
 * mueve por arrastre relativo) durante `ms`, con un leve vaivén humano.
 * `onMid` se llama una vez, a los `midAt` ms (la captura durante el juego).
 */
async function play(page: Page, aimX: number, ms: number, midAt: number, onMid?: () => Promise<void>): Promise<void> {
  const y = 1000;
  await page.mouse.move(...at(360, y));
  await page.mouse.down();
  await page.mouse.move(...at(aimX, y), { steps: 8 });
  const t0 = Date.now();
  let midDone = false;
  while (Date.now() - t0 < ms) {
    const wobble = Math.sin((Date.now() - t0) / 400) * 12;
    await page.mouse.move(...at(aimX + wobble, y));
    if (onMid && !midDone && Date.now() - t0 > midAt) {
      midDone = true;
      await onMid();
    }
    await sleep(80);
  }
  await page.mouse.up();
}

async function main(): Promise<void> {
  mkdirSync(out, { recursive: true });
  const { server, url } = await startPreview();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: DPR, hasTouch: true });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  console.log('Capturando partidas reales...');
  await page.goto(url);
  await sleep(1500);
  await shot(page, '01-menu');

  // Menú -> Jugar -> nivel 1, jugado de verdad hasta ganar.
  await page.mouse.click(...at(360, 760));
  await sleep(700);
  await page.mouse.click(...at(104, 290));
  await sleep(900);
  await play(page, 360, 9000, 1600, () => shot(page, '02-nivel-1'));
  await sleep(2600); // pantalla de resultado (con el conteo de monedas)
  await shot(page, '03-victoria');

  // Siguiente -> nivel 2 (puerta x2).
  await page.mouse.click(...at(360, 710));
  await sleep(900);
  await play(page, 360, 7000, 2200, () => shot(page, '04-puerta-x2'));
  await sleep(2600);

  // Nivel 11: puertas dinámicas, defensores y patrullero.
  await page.goto(`${url}?level=11`);
  await sleep(1200);
  await play(page, 290, 9000, 4000, () => shot(page, '05-horda'));

  // Nivel 20 (jefe).
  await page.goto(`${url}?level=20`);
  await sleep(1200);
  await play(page, 290, 8000, 4000, () => shot(page, '06-jefe'));

  // Selección de niveles y mejoras con el progreso real de esta sesión.
  await page.goto(url);
  await sleep(1200);
  await page.mouse.click(...at(360, 760));
  await sleep(800);
  await shot(page, '07-niveles');
  await page.mouse.click(...at(360, GAME_H - 70));
  await sleep(800);
  await shot(page, '08-mejoras');

  await browser.close();
  await server.close();
  if (errors.length > 0) {
    console.error('✖ Errores en la página:\n' + errors.join('\n'));
    process.exit(1);
  }
  console.log(`✔ Capturas en ${out}`);
}

await main();
