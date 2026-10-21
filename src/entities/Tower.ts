import Phaser from 'phaser';
import { COLORS, DEPTH, GAME_WIDTH, LANE } from '../data/tuning';
import type { HordeContext } from '../systems/HordeContext';
import { BOSS_TOWER_TEX, NUM_FONT, TEX, TOWER_TEX } from '../utils/textures';

const BAR_W = 300;
const BAR_H = 20;

/**
 * Torre enemiga al final del carril. Su muralla cierra todo el ancho: cada
 * minion que llega a `lineY` se consume y le resta 1 de HP.
 */
export class Tower {
  hp: number;
  readonly maxHp: number;
  readonly lineY: number;
  private readonly height: number;
  private shake = 0;

  private readonly sprite: Phaser.GameObjects.Image;
  private readonly barFill: Phaser.GameObjects.Image;
  private readonly hpText: Phaser.GameObjects.BitmapText;
  private shownHp = -1;

  constructor(scene: Phaser.Scene, hp: number, lineY: number, boss: boolean) {
    this.hp = hp;
    this.maxHp = hp;
    this.lineY = lineY;
    this.height = (boss ? BOSS_TOWER_TEX : TOWER_TEX).height;

    this.sprite = scene.add
      .image(GAME_WIDTH / 2, lineY + 10, boss ? TEX.towerBoss : TEX.tower)
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.tower);

    const bx = GAME_WIDTH / 2 - BAR_W / 2;
    const by = lineY - this.height + 4;
    scene.add.image(bx - 4, by, TEX.px).setOrigin(0, 0.5).setDisplaySize(BAR_W + 8, BAR_H + 8).setTint(0x10121c).setDepth(DEPTH.hud);
    scene.add.image(bx, by, TEX.px).setOrigin(0, 0.5).setDisplaySize(BAR_W, BAR_H).setTint(COLORS.hpBarBg).setDepth(DEPTH.hud);
    this.barFill = scene.add.image(bx, by, TEX.px).setOrigin(0, 0.5).setTint(COLORS.hpBar).setDepth(DEPTH.hud);
    this.hpText = scene.add
      .bitmapText(GAME_WIDTH / 2, by + 1, NUM_FONT.key, '', 26)
      .setLetterSpacing(-5)
      .setOrigin(0.5)
      .setDepth(DEPTH.hud);
    this.syncBar();
  }

  get destroyed(): boolean {
    return this.hp <= 0;
  }

  resolve(ctx: HordeContext): void {
    const { pool, grid, scratchA } = ctx;
    const n = grid.queryRect(LANE.left, -200, LANE.right, this.lineY, scratchA);
    let hits = 0;
    for (let k = 0; k < n; k++) {
      const id = scratchA[k];
      if (!pool.isAlive(id) || pool.y[id] > this.lineY) continue;
      pool.release(id);
      hits++;
    }
    if (hits === 0 || this.destroyed) return;
    if (!ctx.invulnerable) this.hp = Math.max(0, this.hp - hits * ctx.damage);
    this.shake = 0.08;
    if (this.destroyed) ctx.fx.towerDestroyed(this.lineY, this.height);
    else ctx.fx.towerHit(this.lineY, hits);
  }

  update(dt: number): void {
    if (this.shake > 0) {
      this.shake -= dt;
      this.sprite.x = GAME_WIDTH / 2 + (this.shake > 0 ? (Math.random() - 0.5) * 6 : 0);
    }
    this.syncBar();
  }

  private syncBar(): void {
    // Con daño fraccional el HP no es entero: se muestra redondeado hacia arriba.
    const shown = Math.ceil(this.hp);
    if (shown === this.shownHp) return;
    this.shownHp = shown;
    this.barFill.setDisplaySize(Math.max(0.01, (BAR_W * this.hp) / this.maxHp), BAR_H);
    this.hpText.setText(`${shown}`);
    if (this.hp <= 0) this.sprite.setAlpha(0.35);
  }
}
