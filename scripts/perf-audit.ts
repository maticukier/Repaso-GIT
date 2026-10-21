/**
 * Auditoría de rendimiento sobre el build de producción: npm run perf
 * (correr antes `npm run build`).
 *
 * Emula un Android de gama media en Chromium: viewport 412x915, DPR 2.625,
 * táctil y CPU x4 más lenta. Mide:
 *  - arranque (navegación -> canvas del menú visible)
 *  - FPS / frame p95 / long tasks jugando con input táctil real
 *  - el test de estrés (?stress=500) en el jefe final
 *  - heap de JS y crecimiento tras 20 entradas/salidas de nivel (fugas)
 *
 * No usa hooks de desarrollo: sólo lo que ve un jugador más métricas de CDP.
 */
import type { CDPSession, Page } from 'playwright';
import { launchBrowser, sleep, startPreview } from './browserUtil';

const CPU_THROTTLE = Number(process.env.CPU_THROTTLE ?? 4);
const VIEW = { width: 412, height: 915 };

interface FrameStats {
  fps: number;
  p50: number;
  p95: number;
  worst: number;
  longTasks: number;
}

/**
 * Código que corre en la página, como string: tsx/esbuild agrega helpers
 * (__name) a las funciones serializadas y la página no los tiene.
 */
const FRAME_PROBE = `(ms) => new Promise((resolve) => {
  let longTasks = 0;
  const obs = new PerformanceObserver((l) => { longTasks += l.getEntries().length; });
  try { obs.observe({ type: 'longtask', buffered: false }); } catch (e) {}
  const times = [];
  let last = performance.now();
  const start = last;
  const tick = (now) => {
    times.push(now - last);
    last = now;
    if (now - start < ms) { requestAnimationFrame(tick); return; }
    obs.disconnect();
    const s = times.slice().sort((a, b) => a - b);
    const r = (v) => Math.round(v * 10) / 10;
    resolve({ fps: r((times.length / (now - start)) * 1000), p50: r(s[s.length >> 1]), p95: r(s[Math.floor(s.length * 0.95)]), worst: r(s[s.length - 1]), longTasks });
  };
  requestAnimationFrame(tick);
})`;

/** Mide frames con requestAnimationFrame durante `ms`. */
async function measureFrames(page: Page, ms: number): Promise<FrameStats> {
  return page.evaluate(`(${FRAME_PROBE})(${ms})`) as Promise<FrameStats>;
}

async function heapMB(cdp: CDPSession): Promise<number> {
  await cdp.send('HeapProfiler.collectGarbage');
  const { metrics } = await cdp.send('Performance.getMetrics');
  const used = metrics.find((m) => m.name === 'JSHeapUsedSize')?.value ?? 0;
  return Math.round((used / 1048576) * 10) / 10;
}

/** Coordenadas de juego (720x1280) -> píxeles de la página (FIT centrado). */
function toPage(gx: number, gy: number): [number, number] {
  const s = Math.min(VIEW.width / 720, VIEW.height / 1280);
  const ox = (VIEW.width - 720 * s) / 2;
  const oy = (VIEW.height - 1280 * s) / 2;
  return [ox + gx * s, oy + gy * s];
}

async function main(): Promise<void> {
  const { server, url } = await startPreview();
  const browser = await launchBrowser();
  const ctx = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE });
  const report: Record<string, unknown> = { cpuThrottle: `x${CPU_THROTTLE}`, viewport: '412x915 @2.625' };

  // Arranque.
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForSelector('canvas');
  await page.waitForFunction(() => {
    const c = document.querySelector('canvas');
    return !!c && c.width > 0;
  });
  await sleep(500);
  report.startupMs = Date.now() - t0;
  report.heapMenuMB = await heapMB(cdp);
  report.menuIdle = await measureFrames(page, 3000);

  // Partida real: nivel 11 manteniendo el dedo y moviéndolo.
  await page.goto(`${url}?level=11`);
  await sleep(1500);
  const [x, y] = toPage(300, 1000);
  await page.mouse.move(x, y);
  await page.mouse.down();
  const sweep = (async () => {
    for (let i = 0; i < 80; i++) {
      await page.mouse.move(x + Math.sin(i / 6) * 60, y);
      await sleep(60);
    }
  })();
  await sleep(1500);
  report.gameplayLevel11 = await measureFrames(page, 4000);
  await sweep;
  await page.mouse.up();
  report.heapGameplayMB = await heapMB(cdp);

  // Estrés en el jefe final (puertas, enemigos y efectos activos).
  await page.goto(`${url}?level=30&stress=500`);
  await sleep(2500);
  report.stress500Level30 = await measureFrames(page, 5000);
  report.heapStressMB = await heapMB(cdp);

  // Fugas: entrar a un nivel y salir 20 veces por la UI real.
  await page.goto(`${url}?level=5`);
  await sleep(1500);
  const before = await heapMB(cdp);
  for (let i = 0; i < 20; i++) {
    await page.mouse.click(...toPage(52, 52)); // ‹ pausa
    await sleep(250);
    await page.mouse.click(...toPage(360, 760)); // salir a niveles
    await sleep(350);
    await page.mouse.click(...toPage(104, 290)); // nivel 1 (siempre desbloqueado)
    await sleep(400);
  }
  const after = await heapMB(cdp);
  report.leakTest = { heapBeforeMB: before, heapAfter20MB: after, growthMB: Math.round((after - before) * 10) / 10 };
  report.errors = errors;

  console.log(JSON.stringify(report, null, 2));
  await browser.close();
  await server.close();
}

await main();
