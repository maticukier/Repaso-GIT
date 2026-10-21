import Phaser from 'phaser';
import { Cannon } from '../entities/Cannon';
import { CANNON, GAME_HEIGHT, GAME_WIDTH, LANE, MAX_DT, MINION, POOL, STRESS } from '../data/tuning';
import { DebugOverlay } from '../systems/DebugOverlay';
import { MinionPool } from '../systems/MinionPool';
import { readFlags } from '../utils/flags';
import { randRange } from '../utils/math';
import { MINION_FRAMES, TEX } from '../utils/textures';

export class GameScene extends Phaser.Scene {
  private cannon!: Cannon;
  private pool!: MinionPool;
  private debug: DebugOverlay | null = null;

  /** Id del puntero que controla el cañón (-1 = ninguno). Ignora multitouch extra. */
  private dragPointerId = -1;
  private lastPointerX = 0;
  private fireAcc = 0;

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

    this.add.image(0, 0, TEX.lane).setOrigin(0, 0);
    this.pool = new MinionPool(this, TEX.minion, MINION_FRAMES, POOL.capacity);
    this.cannon = new Cannon(this, GAME_WIDTH / 2);

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

  toggleStress(): void {
    this.stress = !this.stress;
  }

  get isFiring(): boolean {
    return this.dragPointerId !== -1;
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, MAX_DT);

    this.cannon.update(dt);

    if (this.isFiring) {
      this.fireAcc += dt;
      const interval = 1 / CANNON.fireRate;
      while (this.fireAcc >= interval) {
        this.fireAcc -= interval;
        this.fire();
      }
    }

    if (this.stress) this.feedStress();

    this.pool.update(dt, this.minX, this.maxX, MINION.despawnY);

    this.debug?.update(deltaMs, {
      activeMinions: this.pool.activeCount,
      poolCapacity: this.pool.capacity,
      stress: this.stress,
      stressTarget: this.stressTarget,
    });
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

  /** Mantiene la horda en `stressTarget` minions vivos a la vez. */
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
