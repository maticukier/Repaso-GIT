import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, LANE, MINION } from '../data/tuning';

export const TEX = {
  lane: 'lane',
  minion: 'minion',
  cannonBase: 'cannon-base',
  cannonBarrel: 'cannon-barrel',
  enemyStatic: 'enemy-static',
  enemyPatrol: 'enemy-patrol',
  enemyBrute: 'enemy-brute',
  enemyOrbiter: 'enemy-orbiter',
  tower: 'tower',
  towerBoss: 'tower-boss',
  star: 'star',
  lock: 'lock',
  /** Partículas: frames 'dot' (10px) y 'chunk' (16px), blancas para tintear. */
  fx: 'fx',
  coin: 'coin',
  /** Rect redondeado blanco para NineSlice: botones y paneles de cualquier tamaño. */
  panel: 'panel',
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
export const BOSS_TOWER_TEX = { width: TOWER_TEX.width, height: 280 } as const;
export const PANEL_SLICE = 22;

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

  drawTower(g, TOWER_TEX.width, TOWER_TEX.height, false);
  g.generateTexture(TEX.tower, TOWER_TEX.width, TOWER_TEX.height);
  g.clear();

  drawTower(g, BOSS_TOWER_TEX.width, BOSS_TOWER_TEX.height, true);
  g.generateTexture(TEX.towerBoss, BOSS_TOWER_TEX.width, BOSS_TOWER_TEX.height);
  g.clear();

  drawEnemyBrute(g);
  g.generateTexture(TEX.enemyBrute, 128, 128);
  g.clear();

  drawEnemyOrbiter(g);
  g.generateTexture(TEX.enemyOrbiter, 80, 80);
  g.clear();

  drawStar(g, 32, 32, 30, 13);
  g.generateTexture(TEX.star, 64, 64);
  g.clear();

  drawLock(g);
  g.generateTexture(TEX.lock, 48, 56);
  g.clear();

  g.fillStyle(0xffffff, 1);
  g.fillCircle(5, 5, 5);
  g.fillRoundedRect(12, 0, 16, 16, 4);
  g.generateTexture(TEX.fx, 28, 16);
  g.clear();
  const fx = scene.textures.get(TEX.fx);
  fx.add('dot', 0, 0, 0, 10, 10);
  fx.add('chunk', 0, 12, 0, 16, 16);

  drawCoin(g);
  g.generateTexture(TEX.coin, 48, 48);
  g.clear();

  g.fillStyle(0xffffff, 1);
  g.fillRoundedRect(0, 0, PANEL_SLICE * 3, PANEL_SLICE * 3, 20);
  g.generateTexture(TEX.panel, PANEL_SLICE * 3, PANEL_SLICE * 3);
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

/**
 * Torre enemiga: torreón central + muralla que cierra todo el carril.
 * La versión jefe es más alta y ancha, con dos torres laterales y corona.
 */
function drawTower(g: Phaser.GameObjects.Graphics, w: number, h: number, boss: boolean): void {
  const cx = w / 2;
  const body = boss ? COLORS.towerBoss : COLORS.tower;
  const shade = boss ? COLORS.towerBossShade : COLORS.towerShade;

  // Muralla a lo ancho (franja inferior).
  const wallTop = h - 70;
  g.fillStyle(shade, 1);
  g.fillRect(0, wallTop + 8, w, 62);
  g.fillStyle(body, 1);
  g.fillRect(0, wallTop, w, 56);
  for (let x = 0; x < w; x += 44) {
    g.fillRect(x, wallTop - 16, 26, 18);
  }
  g.fillStyle(shade, 1);
  for (let x = 14; x < w; x += 58) {
    g.fillRect(x, wallTop + 18, 30, 6);
  }

  if (boss) {
    // Torres laterales.
    for (const tx of [70, w - 70]) {
      g.fillStyle(shade, 1);
      g.fillRect(tx - 42, 96, 84, h - 96);
      g.fillStyle(body, 1);
      g.fillRect(tx - 38, 90, 76, h - 104);
      for (let i = 0; i < 3; i++) g.fillRect(tx - 38 + i * 28, 74, 20, 18);
      g.fillStyle(0x140f24, 1);
      g.fillRoundedRect(tx - 10, 120, 20, 30, 10);
    }
  }

  // Torreón.
  const kw = boss ? 240 : 200;
  const kTop = 34;
  g.fillStyle(shade, 1);
  g.fillRect(cx - kw / 2, kTop + 10, kw, h - kTop - 10);
  g.fillStyle(body, 1);
  g.fillRect(cx - kw / 2 + 4, kTop, kw - 8, h - kTop - 14);
  const merlons = boss ? 6 : 5;
  for (let i = 0; i < merlons; i++) {
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
  if (boss) {
    // Corona sobre la ventana.
    g.fillStyle(COLORS.crown, 1);
    g.fillRect(cx - 30, kTop + 74, 60, 14);
    g.fillTriangle(cx - 30, kTop + 74, cx - 30, kTop + 52, cx - 14, kTop + 74);
    g.fillTriangle(cx - 12, kTop + 74, cx, kTop + 48, cx + 12, kTop + 74);
    g.fillTriangle(cx + 30, kTop + 74, cx + 30, kTop + 52, cx + 14, kTop + 74);
  }
}

/** Defensor jefe "brute": bloque acorazado con remaches. Textura 128x128, cuerpo ~100. */
function drawEnemyBrute(g: Phaser.GameObjects.Graphics): void {
  const c = 64;
  g.fillStyle(COLORS.enemyBruteShade, 1);
  g.fillRoundedRect(c - 56, c - 50, 112, 108, 30);
  g.fillStyle(COLORS.enemyBrute, 1);
  g.fillRoundedRect(c - 52, c - 54, 104, 100, 28);
  g.fillStyle(COLORS.crown, 1);
  g.fillRoundedRect(c - 52, c - 18, 104, 14, 6);
  for (const [dx, dy] of [[-38, -40], [38, -40], [-38, 32], [38, 32]]) g.fillCircle(c + dx, c + dy, 5);
  g.fillStyle(0xffffff, 0.2);
  g.fillRoundedRect(c - 40, c - 48, 46, 14, 7);
  g.fillStyle(0x1a0b12, 1);
  g.fillRect(c - 30, c + 4, 22, 9);
  g.fillRect(c + 8, c + 4, 22, 9);
  g.fillStyle(COLORS.hpBar, 1);
  g.fillRect(c - 24, c + 6, 8, 5);
  g.fillRect(c + 16, c + 6, 8, 5);
}

/** Defensor jefe "orbiter": esfera con aspas que gira. Textura 80x80, cuerpo ~60. */
function drawEnemyOrbiter(g: Phaser.GameObjects.Graphics): void {
  const c = 40;
  g.fillStyle(COLORS.enemyOrbiterShade, 1);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    g.fillTriangle(
      c + Math.cos(a) * 39, c + Math.sin(a) * 39,
      c + Math.cos(a + 0.9) * 24, c + Math.sin(a + 0.9) * 24,
      c + Math.cos(a - 0.3) * 24, c + Math.sin(a - 0.3) * 24,
    );
  }
  g.fillCircle(c, c, 30);
  g.fillStyle(COLORS.enemyOrbiter, 1);
  g.fillCircle(c, c, 27);
  g.fillStyle(0xffffff, 0.35);
  g.fillCircle(c - 8, c - 9, 8);
  g.fillStyle(0x0b1420, 1);
  g.fillCircle(c, c + 2, 9);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(c + 3, c - 1, 3);
}

function drawStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, outer: number, inner: number): void {
  const pts: Phaser.Types.Math.Vector2Like[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  g.fillStyle(0xffffff, 1);
  g.fillPoints(pts, true);
}

function drawLock(g: Phaser.GameObjects.Graphics): void {
  g.lineStyle(7, 0xffffff, 1);
  g.beginPath();
  g.arc(24, 22, 13, Math.PI, 0);
  g.strokePath();
  g.fillStyle(0xffffff, 1);
  g.fillRect(10.5, 21, 7, 6);
  g.fillRect(30.5, 21, 7, 6);
  g.fillRoundedRect(4, 24, 40, 30, 7);
}

function drawCoin(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(COLORS.coinShade, 1);
  g.fillCircle(24, 26, 21);
  g.fillStyle(COLORS.coin, 1);
  g.fillCircle(24, 23, 21);
  g.fillStyle(COLORS.coinShade, 1);
  g.fillCircle(24, 23, 14);
  g.fillStyle(COLORS.coin, 1);
  g.fillCircle(24, 23, 11);
  g.fillStyle(0xffffff, 0.55);
  g.fillEllipse(17, 15, 10, 6);
}
