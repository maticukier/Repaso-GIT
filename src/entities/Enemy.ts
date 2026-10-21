import Phaser from 'phaser';
import { COLORS, DEPTH, MINION } from '../data/tuning';
import type { HordeContext } from '../systems/HordeContext';
import { TEX } from '../utils/textures';

export type EnemyKind = 'static' | 'patrol';

export interface EnemyDef {
  kind: EnemyKind;
  x: number;
  y: number;
  radius: number;
  /** Cada minion que lo toca muere y le saca 1 de HP. */
  hp: number;
  patrol?: { minX: number; maxX: number; speed: number };
}

const HIT_FLASH = 0.06;
const HP_BAR_W = 64;

/** Defensor: elimina minions al contacto (círculo vs. punto con radio). */
export class Enemy {
  x: number;
  readonly y: number;
  readonly radius: number;
  hp: number;
  readonly maxHp: number;
  private readonly def: EnemyDef;
  private dir = 1;
  private flash = 0;

  private readonly sprite: Phaser.GameObjects.Image;
  private readonly hpBg: Phaser.GameObjects.Image;
  private readonly hpFill: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, def: EnemyDef) {
    this.def = def;
    this.x = def.x;
    this.y = def.y;
    this.radius = def.radius;
    this.hp = def.hp;
    this.maxHp = def.hp;

    const tex = def.kind === 'static' ? TEX.enemyStatic : TEX.enemyPatrol;
    this.sprite = scene.add.image(def.x, def.y, tex).setDepth(DEPTH.enemy);
    // La textura incluye púas/patas; el radio de contacto es el cuerpo.
    this.sprite.setScale((def.radius * 2) / (def.kind === 'static' ? 72 : 62));
    this.hpBg = scene.add.image(0, 0, TEX.px).setOrigin(0, 0.5).setDisplaySize(HP_BAR_W, 8).setTint(COLORS.hpBarBg).setDepth(DEPTH.enemy);
    this.hpFill = scene.add.image(0, 0, TEX.px).setOrigin(0, 0.5).setTint(COLORS.hpBar).setDepth(DEPTH.enemy);
    this.layout();
  }

  get alive(): boolean {
    return this.hp > 0;
  }

  update(dt: number): void {
    if (!this.alive) return;
    const p = this.def.patrol;
    if (p) {
      this.x += p.speed * this.dir * dt;
      if (this.x > p.maxX) {
        this.x = p.maxX;
        this.dir = -1;
      } else if (this.x < p.minX) {
        this.x = p.minX;
        this.dir = 1;
      }
      this.sprite.setFlipX(this.dir < 0);
    }
    if (this.flash > 0) {
      this.flash -= dt;
      if (this.flash <= 0) this.sprite.clearTint();
    }
    this.layout();
  }

  resolve(ctx: HordeContext): void {
    if (!this.alive) return;
    const { pool, grid, scratchA } = ctx;
    const reach = this.radius + MINION.radius;
    const reach2 = reach * reach;
    const cx = this.x;
    const cy = this.y;

    let hits = 0;
    const n = grid.queryRect(cx - reach, cy - reach, cx + reach, cy + reach, scratchA);
    for (let k = 0; k < n; k++) {
      const id = scratchA[k];
      if (!pool.isAlive(id)) continue;
      const dx = pool.x[id] - cx;
      const dy = pool.y[id] - cy;
      if (dx * dx + dy * dy > reach2) continue;
      pool.release(id);
      hits++;
      if (!ctx.invulnerable && hits >= this.hp) break;
    }

    if (hits === 0) return;
    if (!ctx.invulnerable) this.hp -= hits;
    this.flash = HIT_FLASH;
    this.sprite.setTintFill(0xffffff);
    if (!this.alive) this.die();
  }

  private die(): void {
    this.sprite.setVisible(false);
    this.hpBg.setVisible(false);
    this.hpFill.setVisible(false);
  }

  private layout(): void {
    this.sprite.x = this.x;
    const bx = this.x - HP_BAR_W / 2;
    const by = this.y - this.radius - 16;
    this.hpBg.setPosition(bx, by);
    this.hpFill.setPosition(bx, by).setDisplaySize(Math.max(1, (HP_BAR_W * this.hp) / this.maxHp), 8);
  }
}
