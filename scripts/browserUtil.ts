/**
 * Utilidades compartidas por los scripts que usan un navegador real:
 * levantar el build de producción (vite preview) y abrir Chromium.
 */
import { type Browser, chromium } from 'playwright';
import { preview, type PreviewServer } from 'vite';

export const GAME_W = 720;
export const GAME_H = 1280;

export async function startPreview(port = 4173): Promise<{ server: PreviewServer; url: string }> {
  const server = await preview({ preview: { port, strictPort: true, host: '127.0.0.1' }, logLevel: 'warn' });
  return { server, url: `http://127.0.0.1:${port}/` };
}

/**
 * Chromium de Playwright. Sin GPU (CI, contenedores) se usa SwiftShader:
 * el render por software limita los FPS, así que esos números son un piso.
 */
export function launchBrowser(): Promise<Browser> {
  return chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
