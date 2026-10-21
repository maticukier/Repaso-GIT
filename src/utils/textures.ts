import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, LANE, MINION } from '../data/tuning';

export const TEX = {
  lane: 'lane',
  minion: 'minion',
  cannonBase: 'cannon-base',
  cannonBarrel: 'cannon-barrel',
  enemyStatic: 'enemy-static',
  enemyPatrol: 'enemy-patrol',
  tower: 'tower',
  /** Blanco 4x4: barras de progreso/HP escaladas y tinteadas, sin redibujar. */
  px: 'px',
} as const;

/** Fuente bitmap para todos los números del juego (labels, flotantes, HUD). */
export const NUM_FONT = {
  key: 'num',
  chars: '0123456789+-x',
  cellW: 34,
  cellH: 50,
} as const;

export const TOWER_TEX = { width: LANE.right - LANE.left + 16, height: 230 } as const;

/** Nombres de frames del spritesheet de minion (squash / stretch). */
export const MINION_FRAMES = ['f0', 'f1'] as const;

/**
 * Todo el arte se genera por código en el arranque y se hornea a texturas.
 * Así en runtime sólo se dibujan quads texturizados (barato en WebGL);
 * nunca se re-tesela un Graphics por frame.
 */
export function generateTextures(scene: Phaser.Scene): void {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  drawLane(g);
  g.generateTexture(TEX.lane, GAME_WIDTH, GAME_HEIGHT);
  g.clear();

  drawMinionSheet(g);
  g.generateTexture(TEX.minion, MINION.size * 2, MINION.size);
  g.clear();
  const tex = scene.textures.get(TEX.minion);
  tex.add(MINION_FRAMES[0], 0, 0, 0, MINION.size, MINION.size);
  tex.add(MINION_FRAMES[1], 0, MINION.size, 0, MINION.size, MINION.size);

  drawCannonBase(g);
  g.generateTexture(TEX.cannonBase, 140, 110);
  g.clear();

  drawCannonBarrel(g);
  g.generateTexture(TEX.cannonBarrel, 56, 96);
  g.clear();

  drawEnemyStatic(g);
  g.generateTexture(TEX.enemyStatic, 96, 96);
  g.clear();

  drawEnemyPatrol(g);
  g.generateTexture(TEX.enemyPatrol, 84, 72);
  g.clear();

  drawTower(g);
  g.generateTexture(TEX.tower, TOWER_TEX.width, TOWER_TEX.height);
  g.clear();

  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 4, 4);
  g.generateTexture(TEX.px, 4, 4);

  g.destroy();

  generateNumberFont(scene);
}

/**
 * Rasteriza los glifos una sola vez a un canvas y lo registra como RetroFont.
 * Un Phaser.Text re-rasteriza y re-sube su textura en cada setText; un
 * BitmapText sólo arma quads, así que actualizar números es casi gratis.
 * Glifos blancos con borde oscuro: el color se da con tint.
 */
function generateNumberFont(scene: Phaser.Scene): void {
  const { key, chars, cellW, cellH } = NUM_FONT;
  const canvasTex = scene.textures.createCanvas(`${key}-tex`, cellW * chars.length, cellH);
  if (!canvasTex) throw new Error('No se pudo crear el canvas de la fuente');
  const ctx = canvasTex.getContext();
  ctx.font = '900 40px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#10121c';
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < chars.length; i++) {
    const cx = i * cellW + cellW / 2;
    const cy = cellH / 2 + 2;
    ctx.strokeText(chars[i], cx, cy);
    ctx.fillText(chars[i], cx, cy);
  }
  canvasTex.refresh();

  scene.cache.bitmapFont.add(
    key,
    Phaser.GameObjects.RetroFont.Parse(scene, {
      image: `${key}-tex`,
      width: cellW,
      height: cellH,
      chars,
      charsPerRow: chars.length,
      'offset.x': 0,
      'offset.y': 0,
      'spacing.x': 0,
      'spacing.y': 0,
      lineSpacing: 0,
    }),
  );
}

function drawLane(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(COLORS.grass, 1);
  g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Textura "moteada" a los costados, determinística.
  g.fillStyle(COLORS.grassDots, 1);
  for (let i = 0; i < 140; i++) {
    const side = i % 2 === 0;
    const x = side ? (i * 37) % (LANE.left - 16) + 6 : LANE.right + 8 + ((i * 53) % (GAME_WIDTH - LANE.right - 16));
    const y = (i * 97) % GAME_HEIGHT;
    g.fillCircle(x, y, 3 + (i % 3));
  }

  const w = LANE.right - LANE.left;
  g.fillStyle(COLORS.lane, 1);
  g.fillRect(LANE.left, 0, w, GAME_HEIGHT);

  g.fillStyle(COLORS.laneStripe, 1);
  for (let y = 20; y < GAME_HEIGHT; y += 90) {
    g.fillRoundedRect(GAME_WIDTH / 2 - 6, y, 12, 46, 6);
  }

  g.fillStyle(COLORS.laneEdge, 1);
  g.fillRect(LANE.left - 8, 0, 8, GAME_HEIGHT);
  g.fillRect(LANE.right, 0, 8, GAME_HEIGHT);
}

function drawMinionSheet(g: Phaser.GameObjects.Graphics): void {
  const s = MINION.size;
  // Frame 0: redondo. Frame 1: un poco aplastado (squash) para el "trote".
  drawMinion(g, s / 2, s / 2, 12, 12);
  drawMinion(g, s + s / 2, s / 2 + 1, 13.5, 10.5);
}

function drawMinion(g: Phaser.GameObjects.Graphics, cx: number, cy: number, rx: number, ry: number): void {
  g.fillStyle(COLORS.minionShade, 1);
  g.fillEllipse(cx, cy + 2, rx * 2, ry * 2);
  g.fillStyle(COLORS.minion, 1);
  g.fillEllipse(cx, cy, rx * 2 - 2, ry * 2 - 3);
  g.fillStyle(0xffffff, 0.55);
  g.fillEllipse(cx - rx * 0.35, cy - ry * 0.45, rx * 0.6, ry * 0.4);
  g.fillStyle(COLORS.minionEye, 1);
  g.fillCircle(cx - 4, cy - 2, 2);
  g.fillCircle(cx + 4, cy - 2, 2);
}

function drawCannonBase(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(COLORS.cannonShade, 1);
  g.fillRoundedRect(4, 30, 132, 76, 26);
  g.fillStyle(COLORS.cannonBase, 1);
  g.fillRoundedRect(4, 22, 132, 72, 26);
  g.fillStyle(0xffffff, 0.25);
  g.fillRoundedRect(18, 30, 70, 14, 7);
  g.fillStyle(COLORS.cannonShade, 1);
  g.fillCircle(36, 74, 9);
  g.fillCircle(104, 74, 9);
}

function drawCannonBarrel(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(COLORS.cannonBarrelShade, 1);
  g.fillRoundedRect(4, 6, 48, 88, 16);
  g.fillStyle(COLORS.cannonBarrel, 1);
  g.fillRoundedRect(8, 2, 40, 84, 14);
  g.fillStyle(COLORS.cannonBarrelShade, 1);
  g.fillRoundedRect(2, 0, 52, 16, 8);
  g.fillStyle(0xffffff, 0.35);
  g.fillRoundedRect(14, 22, 8, 50, 4);
}

/** Defensor estático: bloque con púas. Textura de 96x96, centro (48,48). */
function drawEnemyStatic(g: Phaser.GameObjects.Graphics): void {
  const c = 48;
  g.fillStyle(COLORS.enemyStaticShade, 1);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const a1 = a - 0.22;
    const a2 = a + 0.22;
    g.fillTriangle(
      c + Math.cos(a) * 46, c + Math.sin(a) * 46,
      c + Math.cos(a1) * 30, c + Math.sin(a1) * 30,
      c + Math.cos(a2) * 30, c + Math.sin(a2) * 30,
    );
  }
  g.fillCircle(c, c + 3, 33);
  g.fillStyle(COLORS.enemyStatic, 1);
  g.fillCircle(c, c, 31);
  g.fillStyle(0xffffff, 0.25);
  g.fillEllipse(c - 10, c - 13, 22, 12);
  // Ceño enojado.
  g.fillStyle(0x1a0b12, 1);
  g.fillTriangle(c - 18, c - 6, c - 4, c - 1, c - 18, c + 2);
  g.fillTriangle(c + 18, c - 6, c + 4, c - 1, c + 18, c + 2);
  g.fillRoundedRect(c - 10, c + 12, 20, 6, 3);
}

/** Defensor patrullero: escarabajo. Textura de 84x72, centro (42,36). */
function drawEnemyPatrol(g: Phaser.GameObjects.Graphics): void {
  const cx = 42;
  const cy = 36;
  g.fillStyle(COLORS.enemyPatrolShade, 1);
  g.fillRect(cx - 38, cy - 4, 76, 8);
  g.fillRect(cx - 34, cy - 16, 68, 6);
  g.fillRect(cx - 34, cy + 10, 68, 6);
  g.fillEllipse(cx, cy + 3, 58, 62);
  g.fillStyle(COLORS.enemyPatrol, 1);
  g.fillEllipse(cx, cy, 54, 58);
  g.fillStyle(COLORS.enemyPatrolShade, 1);
  g.fillRect(cx - 1.5, cy - 20, 3, 46);
  g.fillStyle(0xffffff, 0.3);
  g.fillEllipse(cx - 11, cy - 14, 16, 10);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(cx - 10, cy - 22, 7);
  g.fillCircle(cx + 10, cy - 22, 7);
  g.fillStyle(0x140a20, 1);
  g.fillCircle(cx - 10, cy - 24, 3.5);
  g.fillCircle(cx + 10, cy - 24, 3.5);
}

/** Torre enemiga: torreón central + muralla que cierra todo el carril. */
function drawTower(g: Phaser.GameObjects.Graphics): void {
  const w = TOWER_TEX.width;
  const h = TOWER_TEX.height;
  const cx = w / 2;

  // Muralla a lo ancho (franja inferior).
  const wallTop = h - 70;
  g.fillStyle(COLORS.towerShade, 1);
  g.fillRect(0, wallTop + 8, w, 62);
  g.fillStyle(COLORS.tower, 1);
  g.fillRect(0, wallTop, w, 56);
  for (let x = 0; x < w; x += 44) {
    g.fillRect(x, wallTop - 16, 26, 18);
  }
  g.fillStyle(COLORS.towerShade, 1);
  for (let x = 14; x < w; x += 58) {
    g.fillRect(x, wallTop + 18, 30, 6);
  }

  // Torreón.
  const kw = 200;
  const kTop = 34;
  g.fillStyle(COLORS.towerShade, 1);
  g.fillRect(cx - kw / 2, kTop + 10, kw, h - kTop - 10);
  g.fillStyle(COLORS.tower, 1);
  g.fillRect(cx - kw / 2 + 4, kTop, kw - 8, h - kTop - 14);
  for (let i = 0; i < 5; i++) {
    g.fillRect(cx - kw / 2 + 4 + i * 42, kTop - 20, 26, 22);
  }
  g.fillStyle(0xffffff, 0.12);
  g.fillRect(cx - kw / 2 + 14, kTop + 10, 20, h - kTop - 40);
  // Ventana y puerta.
  g.fillStyle(0x140f24, 1);
  g.fillRoundedRect(cx - 16, kTop + 26, 32, 40, 14);
  g.fillRoundedRect(cx - 34, h - 84, 68, 70, { tl: 34, tr: 34, bl: 0, br: 0 });
  g.fillStyle(COLORS.towerRoof, 1);
  g.fillTriangle(cx + 50, 0, cx + 50, 26, cx + 86, 13);
  g.fillRect(cx + 46, 0, 5, kTop);
}
