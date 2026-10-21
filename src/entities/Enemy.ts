import Phaser from 'phaser';
import type { EnemyDef, EnemyKind } from '../data/levelFormat';
import { COLORS, DEPTH, MINION } from '../data/tuning';
import type { HordeContext } from '../systems/HordeContext';
import { TEX } from '../utils/textures';

const HIT_FLASH = 0.06;
const HP_BAR_W = 64;

/** Textura y diámetro del cuerpo dentro de ella (púas/patas quedan afuera del radio). */
const LOOK: Record<EnemyKind, { tex: string; body: number; color: number }> = {
  static: { tex: TEX.enemyStatic, body: 72, color: COLORS.enemyStatic },
  patrol: { tex: TEX.enemyPatrol, body: 62, color: COLORS.enemyPatrol },
  brute: { tex: TEX.enemyBrute, body: 100, color: COLORS.enemyBrute },
  orbiter: { tex: TEX.enemyOrbiter, body: 60, color: COLORS.enemyOrbiter },
};

/** Defensor: elimina minions al contacto (círculo vs. punto con radio). */
export class Enemy {
  x: number;
  y: number;
  readonly radius: number;
  hp: number;
  readonly maxHp: number;
  private readonly def: EnemyDef;
  private dir = 1;
  private flash = 0;
  private angle = 0;
  private hpShown = -1;

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

    const look = LOOK[def.kind];
    this.sprite = scene.add.image(def.x, def.y, look.tex).setDepth(DEPTH.enemy);
    // La textura incluye púas/patas; el radio de contacto es el cuerpo.
    this.sprite.setScale((def.radius * 2) / look.body);
    if (def.orbit) {
      this.angle = def.orbit.phase;
      this.placeOnOrbit();
    }
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
    const o = this.def.orbit;
    if (o) {
      this.angle += o.speed * dt;
      this.placeOnOrbit();
      this.sprite.rotation = this.angle;
    }
    if (this.def.regenPerSec > 0 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.def.regenPerSec * dt);
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
      // Con más daño por minion hacen falta menos contactos para matarlo.
      if (!ctx.invulnerable && hits * ctx.damage >= this.hp) break;
    }

    if (hits === 0) return;
    if (!ctx.invulnerable) this.hp = Math.max(0, this.hp - hits * ctx.damage);
    this.flash = HIT_FLASH;
    this.sprite.setTintFill(0xffffff);
    const color = LOOK[this.def.kind].color;
    if (this.alive) {
      ctx.fx.enemyHit(this.x, this.y, color, hits);
    } else {
      ctx.fx.enemyKilled(this.x, this.y, color, this.radius);
      this.die();
    }
  }

  private placeOnOrbit(): void {
    const o = this.def.orbit;
    if (!o) return;
    this.x = this.def.x + Math.cos(this.angle) * o.radius;
    this.y = this.def.y + Math.sin(this.angle) * o.radius;
  }

  private die(): void {
    this.sprite.setVisible(false);
    this.hpBg.setVisible(false);
    this.hpFill.setVisible(false);
  }

  private layout(): void {
    this.sprite.setPosition(this.x, this.y);
    const bx = this.x - HP_BAR_W / 2;
    const by = this.y - this.radius - 16;
    this.hpBg.setPosition(bx, by);
    this.hpFill.setPosition(bx, by);
    // El brute regenera HP fraccional: la barra se redimensiona sólo si cambia el entero.
    const shown = Math.ceil(this.hp);
    if (shown !== this.hpShown) {
      this.hpShown = shown;
      this.hpFill.setDisplaySize(Math.max(1, (HP_BAR_W * shown) / this.maxHp), 8);
    }
  }
}
