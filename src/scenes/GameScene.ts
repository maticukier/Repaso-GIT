import Phaser from 'phaser';
import { Cannon } from '../entities/Cannon';
import { Enemy } from '../entities/Enemy';
import { Gate } from '../entities/Gate';
import { Tower } from '../entities/Tower';
import { LEVEL } from '../data/level';
import {
  CANNON,
  DEPTH,
  FLOATING,
  GAME_HEIGHT,
  GAME_WIDTH,
  GRID,
  LANE,
  MAX_DT,
  MINION,
  POOL,
  STRESS,
} from '../data/tuning';
import { Ammo } from '../systems/Ammo';
import { DebugOverlay } from '../systems/DebugOverlay';
import { FloatingTextPool } from '../systems/FloatingTextPool';
import type { HordeContext } from '../systems/HordeContext';
import { Hud } from '../systems/Hud';
import { MinionPool } from '../systems/MinionPool';
import { SpatialGrid } from '../systems/SpatialGrid';
import { readFlags } from '../utils/flags';
import { randRange } from '../utils/math';
import { MINION_FRAMES, TEX } from '../utils/textures';

type State = 'playing' | 'won' | 'lost';

/** Tiempo real mínimo (ms) antes de aceptar el tap de reintento (evita reinicios accidentales). */
const RETRY_DELAY_MS = 800;

export class GameScene extends Phaser.Scene {
  private cannon!: Cannon;
  private pool!: MinionPool;
  private grid!: SpatialGrid;
  private ctx!: HordeContext;
  private gates: Gate[] = [];
  private enemies: Enemy[] = [];
  private tower!: Tower;
  private ammo!: Ammo;
  private hud!: Hud;
  private floating!: FloatingTextPool;
  private debug: DebugOverlay | null = null;

  /** Id del puntero que controla el cañón (-1 = ninguno). Ignora multitouch extra. */
  private dragPointerId = -1;
  private lastPointerX = 0;
  private fireAcc = 0;

  private state: State = 'playing';
  private endedAt = 0;

  private stress = false;
  private stressTarget: number = STRESS.defaultTarget;

  private readonly minX = LANE.left + MINION.radius;
  private readonly maxX = LANE.right - MINION.radius;

  constructor() {
    super('Game');
  }

  create(): void {
    const flags = readFlags(STRESS.defaultTarget);
    this.stress = flags.stress;
    this.stressTarget = Math.min(flags.stressTarget, POOL.capacity);
    this.state = 'playing';
    this.endedAt = 0;
    this.dragPointerId = -1;
    this.fireAcc = 0;

    this.add.image(0, 0, TEX.lane).setOrigin(0, 0).setDepth(DEPTH.lane);

    this.floating = new FloatingTextPool(this, FLOATING.poolSize, DEPTH.floating);
    this.pool = new MinionPool(this, TEX.minion, MINION_FRAMES, POOL.capacity);
    this.pool.blitter.setDepth(DEPTH.minions);
    this.grid = new SpatialGrid(GAME_WIDTH, GAME_HEIGHT, GRID.cellSize, POOL.capacity);
    this.ctx = {
      pool: this.pool,
      grid: this.grid,
      scratchA: new Int32Array(POOL.capacity),
      scratchB: new Int32Array(POOL.capacity),
      invulnerable: this.stress,
    };

    this.tower = new Tower(this, LEVEL.tower.hp, LEVEL.tower.lineY);
    this.gates = LEVEL.gates.map((def, i) => new Gate(this, def, i, this.floating));
    this.enemies = LEVEL.enemies.map((def) => new Enemy(this, def));

    this.cannon = new Cannon(this, GAME_WIDTH / 2);
    this.ammo = new Ammo(LEVEL.ammo.magazine, LEVEL.ammo.total, LEVEL.ammo.regenPerSec, this.stress);
    this.hud = new Hud(this);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);
    this.input.on(Phaser.Input.Events.GAME_OUT, this.releaseDrag, this);
    this.game.events.on(Phaser.Core.Events.BLUR, this.releaseDrag, this);

    if (flags.debug) {
      this.debug = new DebugOverlay(this.game, () => this.toggleStress());
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.BLUR, this.releaseDrag, this);
      this.debug?.destroy();
      this.debug = null;
    });

    if (import.meta.env.DEV) {
      // Hook para medir desde DevTools / scripts de perf.
      (window as unknown as { __scene: GameScene }).__scene = this;
    }
  }

  get activeMinions(): number {
    return this.pool.activeCount;
  }

  get gameState(): State {
    return this.state;
  }

  toggleStress(): void {
    this.stress = !this.stress;
    // El test de estrés mide rendimiento: nada muere ni se termina la partida.
    this.ctx.invulnerable = this.stress;
  }

  get isFiring(): boolean {
    return this.dragPointerId !== -1 && this.state === 'playing';
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, MAX_DT);

    this.cannon.update(dt);
    if (!this.stress) this.ammo.update(dt);

    const interval = 1 / CANNON.fireRate;
    if (this.isFiring) {
      this.fireAcc += dt;
      while (this.fireAcc >= interval) {
        if (!this.stress && !this.ammo.tryConsume()) {
          // Sin munición en el cargador: no se acumulan disparos "debidos".
          this.fireAcc = interval;
          break;
        }
        this.fireAcc -= interval;
        this.fire();
      }
    }

    if (this.stress) this.feedStress();

    this.pool.update(dt, this.minX, this.maxX, MINION.despawnY);
    for (let i = 0; i < this.gates.length; i++) this.gates[i].update(dt);
    for (let i = 0; i < this.enemies.length; i++) this.enemies[i].update(dt);

    // Colisiones: una grilla por frame; los objetos grandes consultan sus celdas.
    this.grid.build(this.pool);
    for (let i = 0; i < this.gates.length; i++) this.gates[i].resolve(this.ctx);
    for (let i = 0; i < this.enemies.length; i++) this.enemies[i].resolve(this.ctx);
    this.tower.resolve(this.ctx);

    this.tower.update(dt);
    this.floating.update(dt);
    this.hud.update(this.ammo);
    this.checkEnd();

    this.debug?.update(deltaMs, {
      activeMinions: this.pool.activeCount,
      poolCapacity: this.pool.capacity,
      stress: this.stress,
      stressTarget: this.stressTarget,
    });
  }

  private checkEnd(): void {
    if (this.state !== 'playing' || this.stress) return;
    if (this.tower.destroyed) this.finish('won');
    else if (this.ammo.empty && this.pool.activeCount === 0) this.finish('lost');
  }

  private finish(state: 'won' | 'lost'): void {
    this.state = state;
    this.endedAt = this.time.now;
    this.releaseDrag();

    const won = state === 'won';
    this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0b0816, 0.55)
      .setDepth(DEPTH.overlay);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, won ? '¡Torre destruida!' : 'Sin munición', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        fontSize: '64px',
        fontStyle: '900',
        color: won ? '#4fe3c1' : '#ff4d6d',
        stroke: '#10121c',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, 'Tocá para reintentar', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        fontSize: '30px',
        fontStyle: '700',
        color: '#ffffff',
        stroke: '#10121c',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay);
  }

  private fire(): void {
    const id = this.pool.spawn(
      this.cannon.muzzleX + randRange(-6, 6),
      this.cannon.muzzleY,
      randRange(-MINION.spreadVx, MINION.spreadVx),
      -randRange(MINION.speedMin, MINION.speedMax),
    );
    if (id !== -1) this.cannon.kick();
  }

  /** Mantiene la horda en al menos `stressTarget` minions vivos a la vez. */
  private feedStress(): void {
    // Con mucho déficit (al activar el test) se reparte en todo el carril
    // para no generar una "ola"; después se repone desde abajo.
    const fillWholeLane = this.stressTarget - this.pool.activeCount > STRESS.maxSpawnsPerFrame * 2;
    let budget = STRESS.maxSpawnsPerFrame;
    while (budget-- > 0 && this.pool.activeCount < this.stressTarget) {
      const id = this.pool.spawn(
        randRange(this.minX, this.maxX),
        fillWholeLane ? randRange(0, GAME_HEIGHT) : GAME_HEIGHT + randRange(0, 60),
        randRange(-MINION.spreadVx, MINION.spreadVx),
        -randRange(STRESS.speedMin, STRESS.speedMax),
      );
      if (id === -1) break;
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.state !== 'playing') {
      if (this.time.now - this.endedAt >= RETRY_DELAY_MS) this.scene.restart();
      return;
    }
    if (this.dragPointerId !== -1) return;
    this.dragPointerId = pointer.id;
    this.lastPointerX = pointer.x;
    // Primer minion inmediato al tocar: se siente más responsivo.
    this.fireAcc = 1 / CANNON.fireRate;
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.dragPointerId) return;
    this.cannon.dragBy(pointer.x - this.lastPointerX);
    this.lastPointerX = pointer.x;
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.dragPointerId) return;
    this.releaseDrag();
  }

  private releaseDrag(): void {
    this.dragPointerId = -1;
    this.fireAcc = 0;
  }
}
