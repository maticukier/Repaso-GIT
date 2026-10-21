import Phaser from 'phaser';
import type { GateDef, GateDynamic, GateValue } from '../data/levelFormat';
import { COLORS, DEPTH, GATE, MINION } from '../data/tuning';
import type { FloatingTextPool } from '../systems/FloatingTextPool';
import type { HordeContext } from '../systems/HordeContext';
import { clamp, randRange } from '../utils/math';
import { NUM_FONT, TEX } from '../utils/textures';

/** Bonus de la mejora "puertas potenciadas". */
export interface GateBonus {
  /** Se suma a las puertas de suma. */
  add: number;
  /** Se descuenta (en módulo) de las puertas de resta. */
  sub: number;
  /** Probabilidad de un clon extra en multiplicadores. */
  extraCloneChance: number;
}

export const NO_GATE_BONUS: GateBonus = { add: 0, sub: 0, extraCloneChance: 0 };

/** Valor efectivo con el bonus aplicado (una resta nunca llega a 0 ni pasa a sumar). */
export function boostedValue(v: GateValue, bonus: GateBonus): GateValue {
  if (v.op !== 'add') return v;
  return { op: 'add', n: v.n > 0 ? v.n + bonus.add : Math.min(-1, v.n + bonus.sub) };
}

export function gateLabel(v: GateValue): string {
  if (v.op === 'mul') return `x${v.n}`;
  return v.n >= 0 ? `+${v.n}` : `${v.n}`;
}

export function gateColor(v: GateValue): number {
  if (v.op === 'mul') return COLORS.gateMul;
  return v.n >= 0 ? COLORS.gateAdd : COLORS.gateNeg;
}

/** Margen de la textura alrededor del rect de la puerta (postes). */
const POST_PAD_X = 10;
const POST_PAD_Y = 17;

function gateTextureKey(width: number, color: number): string {
  return `gate-${width}-${color.toString(16)}`;
}

/**
 * Hornea el cuerpo de la puerta a una textura (una vez por variante).
 * Un Graphics en vivo re-tesela sus formas cada frame: con varias puertas
 * de rects redondeados eso costaba ~10 ms/frame con CPU x4.
 */
function ensureGateTexture(scene: Phaser.Scene, width: number, color: number): void {
  const key = gateTextureKey(width, color);
  if (scene.textures.exists(key)) return;
  const w = width;
  const h = GATE.height;
  const ox = POST_PAD_X;
  const oy = POST_PAD_Y;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(color, 0.28);
  g.fillRect(ox, oy, w, h);
  g.fillStyle(color, 0.9);
  g.fillRect(ox, oy, w, 5);
  g.fillRect(ox, oy + h - 5, w, 5);
  g.fillStyle(0x10121c, 1);
  g.fillRoundedRect(ox - 9, oy - 16, 18, h + 26, 7);
  g.fillRoundedRect(ox + w - 9, oy - 16, 18, h + 26, 7);
  g.fillStyle(color, 1);
  g.fillRoundedRect(ox - 6, oy - 13, 12, h + 20, 5);
  g.fillRoundedRect(ox + w - 6, oy - 13, 12, h + 20, 5);
  // Alto simétrico respecto del centro, así la Image se centra en (x, y).
  g.generateTexture(key, w + ox * 2, h + oy * 2);
  g.destroy();
}

export class Gate {
  readonly bit: number;
  x: number;
  readonly y: number;
  readonly width: number;
  private readonly def: GateDef;
  private readonly dynamic: GateDynamic;
  private readonly hitsPerStep: number;

  private valueIndex = 0;
  private hits = 0;
  private dir = 1;

  /** Unidades netas (+/-) desde el último número flotante. */
  private pendingDelta = 0;
  private pendingTimer = 0;

  private readonly body: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.BitmapText;
  private readonly progressBg: Phaser.GameObjects.Image | null = null;
  private readonly progressFill: Phaser.GameObjects.Image | null = null;

  constructor(
    scene: Phaser.Scene,
    def: GateDef,
    index: number,
    private readonly floating: FloatingTextPool,
    private readonly bonus: GateBonus = NO_GATE_BONUS,
  ) {
    if (index > 31) throw new Error('Máximo 32 puertas (máscara de 32 bits)');
    this.bit = 1 << index;
    this.def = def;
    this.x = def.x;
    this.y = def.y;
    this.width = def.width;
    this.dynamic = def.dynamic;
    this.hitsPerStep = def.hitsPerStep;

    // Una textura horneada por variante (ancho x color); cambiar de valor = setTexture.
    for (const v of def.values) ensureGateTexture(scene, def.width, gateColor(v));
    this.body = scene.add.image(0, 0, gateTextureKey(def.width, gateColor(def.values[0]))).setDepth(DEPTH.gate);
    this.label = scene.add.bitmapText(0, 0, NUM_FONT.key, '').setLetterSpacing(-8).setOrigin(0.5).setDepth(DEPTH.gateLabel);

    if (this.dynamic !== 'none' && def.values.length > 1) {
      this.progressBg = scene.add
        .image(0, 0, TEX.px)
        .setOrigin(0, 0.5)
        .setDisplaySize(def.width - 40, 8)
        .setTint(0x10121c)
        .setAlpha(0.7)
        .setDepth(DEPTH.gateLabel);
      this.progressFill = scene.add.image(0, 0, TEX.px).setOrigin(0, 0.5).setDepth(DEPTH.gateLabel);
    }

    this.redraw();
    this.layout();
  }

  get value(): GateValue {
    return this.def.values[this.valueIndex];
  }

  private get hasNext(): boolean {
    return this.valueIndex < this.def.values.length - 1;
  }

  update(dt: number): void {
    const m = this.def.move;
    if (m) {
      this.x += m.speed * this.dir * dt;
      if (this.x > m.maxX) {
        this.x = m.maxX;
        this.dir = -1;
      } else if (this.x < m.minX) {
        this.x = m.minX;
        this.dir = 1;
      }
      this.layout();
    }

    this.pendingTimer += dt;
    if (this.pendingTimer >= GATE.floatInterval) {
      this.pendingTimer = 0;
      const d = this.pendingDelta;
      if (d !== 0) {
        this.floating.show(
          this.x + randRange(-30, 30),
          this.y - 50,
          d > 0 ? `+${d}` : `${d}`,
          d > 0 ? gateColor(this.value) : COLORS.gateNeg,
        );
        this.pendingDelta = 0;
      }
    }
  }

  /** Aplica la puerta a todos los minions que la estén cruzando este frame. */
  resolve(ctx: HordeContext): void {
    const { pool, grid, scratchA } = ctx;
    const half = this.width / 2;
    const left = this.x - half;
    const right = this.x + half;
    const top = this.y - GATE.height / 2;
    const bottom = this.y + GATE.height / 2;
    const bit = this.bit;

    const n = grid.queryRect(left, top, right, bottom, scratchA);
    for (let k = 0; k < n; k++) {
      const id = scratchA[k];
      if (!pool.isAlive(id) || (pool.gateMask[id] & bit) !== 0) continue;
      const mx = pool.x[id];
      const my = pool.y[id];
      if (mx < left || mx > right || my < top || my > bottom) continue;

      pool.gateMask[id] |= bit;
      this.apply(ctx, id, mx, left, right, top);
      this.countHit();
    }
  }

  private apply(ctx: HordeContext, id: number, mx: number, left: number, right: number, top: number): void {
    const { pool } = ctx;
    const v = boostedValue(this.value, this.bonus);

    if (v.op === 'add' && v.n < 0) {
      ctx.fx.gateCrossed(mx, this.y, false, COLORS.gateNeg);
      this.pendingDelta -= this.killAround(ctx, id, -v.n);
      return;
    }

    ctx.fx.gateCrossed(mx, this.y, true, gateColor(v));
    let clones = v.op === 'mul' ? v.n - 1 : v.n;
    if (v.op === 'mul' && Math.random() < this.bonus.extraCloneChance) clones++;
    const mask = pool.gateMask[id];
    const vy = pool.vy[id];
    // Los clones nacen sobre la puerta, abiertos en abanico.
    const spreadX = Math.min(60, (right - left) / 2);
    let made = 0;
    for (let c = 0; c < clones; c++) {
      const sid = pool.spawn(
        clamp(mx + randRange(-spreadX, spreadX), left + 4, right - 4),
        top - randRange(2, 10 + clones * 1.5),
        randRange(-MINION.spreadVx, MINION.spreadVx),
        vy * randRange(0.92, 1.08),
        mask,
      );
      if (sid === -1) break;
      made++;
    }
    this.pendingDelta += made;
  }

  /** Mata al minion que cruzó y hasta `total - 1` vecinos. Devuelve cuántos murieron. */
  private killAround(ctx: HordeContext, id: number, total: number): number {
    const { pool, grid, scratchB } = ctx;
    const cx = pool.x[id];
    const cy = pool.y[id];
    pool.release(id);
    let killed = 1;

    const r = GATE.negativeRadius;
    const r2 = r * r;
    const n = grid.queryRect(cx - r, cy - r, cx + r, cy + r, scratchB);
    for (let k = 0; k < n && killed < total; k++) {
      const other = scratchB[k];
      if (!pool.isAlive(other)) continue;
      const dx = pool.x[other] - cx;
      const dy = pool.y[other] - cy;
      if (dx * dx + dy * dy > r2) continue;
      pool.release(other);
      killed++;
    }
    return killed;
  }

  private countHit(): void {
    if (this.dynamic === 'none' || !this.hasNext) return;
    this.hits++;
    if (this.hits >= this.hitsPerStep) {
      this.hits = 0;
      this.valueIndex++;
      this.redraw();
    }
    this.layoutProgress();
  }

  private redraw(): void {
    const v = this.value;
    this.body.setTexture(gateTextureKey(this.width, gateColor(v)));

    this.label.setText(gateLabel(boostedValue(v, this.bonus)));
    if (this.progressFill) {
      const visible = this.hasNext;
      this.progressFill.setVisible(visible);
      this.progressBg?.setVisible(visible);
      if (visible) this.progressFill.setTint(gateColor(this.def.values[this.valueIndex + 1]));
    }
  }

  private layout(): void {
    this.body.x = this.x;
    this.body.y = this.y;
    this.label.setPosition(this.x, this.y - 2);
    this.layoutProgress();
  }

  private layoutProgress(): void {
    if (!this.progressFill || !this.progressBg) return;
    const w = this.width - 40;
    const x = this.x - w / 2;
    const y = this.y + GATE.height / 2 + 14;
    this.progressBg.setPosition(x, y);
    this.progressFill.setPosition(x, y).setDisplaySize(Math.max(1, (w * this.hits) / this.hitsPerStep), 8);
  }
}
