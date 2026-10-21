import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

/**
 * Flags de compilación de Phaser. Su código fuente pregunta
 * `if (typeof WEBGL_DEBUG)`, así que hay que reemplazar la expresión
 * `typeof X` entera (como hace el build oficial con DefinePlugin): el
 * `define` de Vite no admite esa forma, por eso este plugin.
 */
const PHASER_FLAGS: Record<string, boolean> = {
  WEBGL_RENDERER: true,
  CANVAS_RENDERER: false,
  WEBGL_DEBUG: false,
  FEATURE_SOUND: false,
  PLUGIN_CAMERA3D: false,
  PLUGIN_FBINSTANT: false,
};

function phaserFlags(): Plugin {
  const re = new RegExp(`typeof (${Object.keys(PHASER_FLAGS).join('|')})\\b`, 'g');
  return {
    name: 'phaser-flags',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('/node_modules/phaser/src/') || !re.test(code)) return null;
      re.lastIndex = 0;
      return { code: code.replace(re, (_, flag: string) => String(PHASER_FLAGS[flag])), map: null };
    },
  };
}

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig(({ command }) => ({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: { host: true, port: 5173 },
  // Producción: Phaser a medida (sólo lo que usa el juego). Ver src/utils/phaser-build.js.
  plugins: command === 'build' ? [phaserFlags()] : [],
  resolve: {
    alias:
      command === 'build'
        ? [{ find: /^phaser$/, replacement: fileURLToPath(new URL('./src/utils/phaser-build.js', import.meta.url)) }]
        : [],
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
  },
}));
