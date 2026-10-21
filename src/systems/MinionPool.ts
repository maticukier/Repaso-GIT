import Phaser from 'phaser';
import { MINION } from '../data/tuning';

/**
 * Blitter con lista de render fija.
 *
 * El Blitter de Phaser regenera `renderList` con `Array.filter()` cada vez que
 * un Bob cambia de visibilidad: con cientos de spawns/despawns por segundo eso
 * es una allocation por frame. Acá devolvemos siempre la lista de hijos
 * (pre-creada) y los Bobs inactivos se esconden con alpha 0, que el renderer
 * saltea con un `continue`. Resultado: cero allocs y un único batch de quads.
 */
class PoolBlitter extends Phaser.GameObjects.Blitter {
  override getRenderList(): Phaser.GameObjects.Bob[] {
    return this.children.list;
  }
}

/**
 * Pool de minions con capacidad fija, en layout Structure-of-Arrays.
 *
 * - Estado en typed arrays (x, y, vx, vy, fase de animación).
 * - Free-list en un Int32Array (pila) para spawn O(1).
 * - Lista densa de activos con swap-remove para iterar sólo lo vivo y
 *   liberar en O(1) sin huecos.
 * Nada de esto reserva memoria después del constructor.
 */
export class MinionPool {
  readonly capacity: number;

  readonly x: Float32Array;
  readonly y: Float32Array;
  readonly vx: Float32Array;
  readonly vy: Float32Array;
  private readonly phase: Float32Array;

  /** Índices de minions vivos, densos en [0, activeCount). */
  readonly active: Int32Array;
  private _activeCount = 0;
  /** Posición de cada minion dentro de `active` (-1 si está libre). */
  private readonly slotOf: Int32Array;

  private readonly free: Int32Array;
  private freeTop: number;

  private readonly bobs: Phaser.GameObjects.Bob[];
  private readonly frames: Phaser.Textures.Frame[];
  private readonly half: number;

  constructor(scene: Phaser.Scene, textureKey: string, frameNames: readonly string[], capacity: number) {
    this.capacity = capacity;
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.phase = new Float32Array(capacity);
    this.active = new Int32Array(capacity);
    this.slotOf = new Int32Array(capacity).fill(-1);
    this.free = new Int32Array(capacity);
    this.freeTop = capacity;

    const texture = scene.textures.get(textureKey);
    this.frames = frameNames.map((name) => texture.get(name));
    this.half = MINION.size / 2;

    const blitter = new PoolBlitter(scene, 0, 0, textureKey, frameNames[0]);
    scene.add.existing(blitter);

    this.bobs = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      // Se apilan al revés para que el primer spawn use el índice 0.
      this.free[i] = capacity - 1 - i;
      const bob = blitter.create(-100, -100, this.frames[0], true);
      bob.alpha = 0;
      this.bobs[i] = bob;
    }
  }

  get activeCount(): number {
    return this._activeCount;
  }

  /** Devuelve el índice del minion, o -1 si el pool está lleno. */
  spawn(x: number, y: number, vx: number, vy: number): number {
    if (this.freeTop === 0) return -1;
    const id = this.free[--this.freeTop];

    this.x[id] = x;
    this.y[id] = y;
    this.vx[id] = vx;
    this.vy[id] = vy;
    this.phase[id] = Math.random() * 2;

    const slot = this._activeCount++;
    this.active[slot] = id;
    this.slotOf[id] = slot;

    const bob = this.bobs[id];
    bob.x = x - this.half;
    bob.y = y - this.half;
    bob.alpha = 1;
    return id;
  }

  release(id: number): void {
    const slot = this.slotOf[id];
    if (slot < 0) return;

    const last = --this._activeCount;
    const movedId = this.active[last];
    this.active[slot] = movedId;
    this.slotOf[movedId] = slot;
    this.slotOf[id] = -1;

    this.free[this.freeTop++] = id;
    this.bobs[id].alpha = 0;
  }

  /**
   * Integra movimiento y sincroniza los Bobs. Rebota contra los bordes del
   * carril y libera los que salen por arriba.
   */
  update(dt: number, minX: number, maxX: number, despawnY: number): void {
    const { x, y, vx, vy, phase, active, bobs, frames, half } = this;
    const lateralKeep = Math.max(0, 1 - MINION.lateralDamping * dt);
    const animStep = MINION.animFps * dt;

    let i = 0;
    while (i < this._activeCount) {
      const id = active[i];

      let nx = x[id] + vx[id] * dt;
      const ny = y[id] + vy[id] * dt;

      if (ny < despawnY) {
        // swap-remove: el último activo pasa a la posición i, no avanzamos.
        this.release(id);
        continue;
      }

      if (nx < minX) {
        nx = minX;
        vx[id] = -vx[id];
      } else if (nx > maxX) {
        nx = maxX;
        vx[id] = -vx[id];
      }
      vx[id] *= lateralKeep;

      x[id] = nx;
      y[id] = ny;

      let p = phase[id] + animStep;
      if (p >= 2) p -= 2;
      phase[id] = p;

      const bob = bobs[id];
      bob.x = nx - half;
      bob.y = ny - half;
      bob.setFrame(frames[p < 1 ? 0 : 1]);

      i++;
    }
  }
}
