import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, LANE, MINION } from '../data/tuning';

export const TEX = {
  lane: 'lane',
  minion: 'minion',
  cannonBase: 'cannon-base',
  cannonBarrel: 'cannon-barrel',
} as const;

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

  g.destroy();
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
