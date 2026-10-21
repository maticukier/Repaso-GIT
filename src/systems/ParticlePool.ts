import Phaser from 'phaser';
import { PoolBlitter } from '../utils/PoolBlitter';

export type ParticleShape = 'dot' | 'chunk';

const GRAVITY = 900;
const DRAG = 1.8;

/**
 * Partículas con capacidad fija: mismo esquema que el pool de minions
 * (typed arrays + free-list + lista densa de activos + un Blitter con lista
 * de render fija). Si se llena, las nuevas se descartan: nunca reserva
 * memoria durante la partida.
 */
export class ParticlePool {
  readonly capacity: number;
  private readonly x: Float32Array;
  private readonly y: Float32Array;
  private readonly vx: Float32Array;
  private readonly vy: Float32Array;
  private readonly life: Float32Array;
  private readonly maxLife: Float32Array;
  private readonly half: Float32Array;

  private readonly active: Int32Array;
  private activeCount = 0;
  private readonly free: Int32Array;
  private freeTop: number;

  readonly blitter: Phaser.GameObjects.Blitter;
  private readonly bobs: Phaser.GameObjects.Bob[];
  private readonly frames: Record<ParticleShape, Phaser.Textures.Frame>;

  constructor(scene: Phaser.Scene, textureKey: string, capacity: number) {
    this.capacity = capacity;
    this.x = new Float32Array(capacity);
    this.y = new Float32Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.half = new Float32Array(capacity);
    this.active = new Int32Array(capacity);
    this.free = new Int32Array(capacity);
    this.freeTop = capacity;

    const tex = scene.textures.get(textureKey);
    this.frames = { dot: tex.get('dot'), chunk: tex.get('chunk') };
    this.blitter = new PoolBlitter(scene, 0, 0, textureKey, 'dot');
    scene.add.existing(this.blitter);
    this.bobs = new Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.free[i] = capacity - 1 - i;
      const bob = this.blitter.create(-50, -50, this.frames.dot, true);
      bob.alpha = 0;
      this.bobs[i] = bob;
    }
  }

  get count(): number {
    return this.activeCount;
  }

  /**
   * Ráfaga radial. `up` > 0 sesga las velocidades hacia arriba (explosiones);
   * la gravedad las hace caer.
   */
  burst(x: number, y: number, n: number, color: number, speedMin: number, speedMax: number, life: number, shape: ParticleShape = 'dot', spreadX = 0, up = 0): void {
    const frame = this.frames[shape];
    const half = frame.width / 2;
    for (let k = 0; k < n; k++) {
      if (this.freeTop === 0) return;
      const id = this.free[--this.freeTop];
      const a = Math.random() * Math.PI * 2;
      const sp = speedMin + Math.random() * (speedMax - speedMin);
      this.x[id] = x + (Math.random() - 0.5) * spreadX;
      this.y[id] = y;
      this.vx[id] = Math.cos(a) * sp;
      this.vy[id] = Math.sin(a) * sp - up;
      const l = life * (0.6 + Math.random() * 0.4);
      this.life[id] = l;
      this.maxLife[id] = l;
      this.half[id] = half;
      this.active[this.activeCount++] = id;
      const bob = this.bobs[id];
      bob.setFrame(frame);
      bob.tint = color;
      bob.alpha = 1;
      bob.x = x - half;
      bob.y = y - half;
    }
  }

  update(dt: number): void {
    const { x, y, vx, vy, life, maxLife, half, active, bobs } = this;
    const drag = Math.max(0, 1 - DRAG * dt);
    let i = 0;
    while (i < this.activeCount) {
      const id = active[i];
      const l = life[id] - dt;
      if (l <= 0) {
        bobs[id].alpha = 0;
        this.free[this.freeTop++] = id;
        active[i] = active[--this.activeCount];
        continue;
      }
      life[id] = l;
      vx[id] *= drag;
      vy[id] = vy[id] * drag + GRAVITY * dt;
      x[id] += vx[id] * dt;
      y[id] += vy[id] * dt;
      const bob = bobs[id];
      bob.x = x[id] - half[id];
      bob.y = y[id] - half[id];
      const k = l / maxLife[id];
      bob.alpha = k < 0.5 ? k * 2 : 1;
      i++;
    }
  }
}
