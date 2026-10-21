import Phaser from 'phaser';
import { CANNON, DEPTH, LANE } from '../data/tuning';
import { clamp, damp } from '../utils/math';
import { TEX } from '../utils/textures';

/**
 * Cañón del jugador. Sólo se mueve en X; el input (arrastre) setea `targetX`
 * y el cañón lo sigue con suavizado. El disparo lo decide la escena.
 */
export class Cannon {
  x: number;
  readonly y: number;
  targetX: number;

  private readonly base: Phaser.GameObjects.Image;
  private readonly barrel: Phaser.GameObjects.Image;
  private recoil = 0;
  private readonly minX: number;
  private readonly maxX: number;

  constructor(scene: Phaser.Scene, x: number) {
    this.x = x;
    this.targetX = x;
    this.y = CANNON.y;
    this.minX = LANE.left + 40;
    this.maxX = LANE.right - 40;

    this.barrel = scene.add.image(x, this.y, TEX.cannonBarrel).setOrigin(0.5, 1).setDepth(DEPTH.cannon);
    this.base = scene.add.image(x, this.y, TEX.cannonBase).setOrigin(0.5, 0.4).setDepth(DEPTH.cannon);
    this.layout();
  }

  get muzzleX(): number {
    return this.x;
  }

  get muzzleY(): number {
    return this.y + CANNON.muzzleOffsetY;
  }

  /** Desplaza el objetivo según el delta del dedo (arrastre relativo). */
  dragBy(dx: number): void {
    this.targetX = clamp(this.targetX + dx, this.minX, this.maxX);
  }

  kick(): void {
    this.recoil = CANNON.recoilPx;
  }

  update(dt: number): void {
    this.x += (this.targetX - this.x) * damp(CANNON.followSharpness, dt);
    if (this.recoil > 0) {
      this.recoil = Math.max(0, this.recoil - CANNON.recoilRecoverPerSec * dt);
    }
    this.layout();
  }

  private layout(): void {
    this.base.x = this.x;
    this.barrel.x = this.x;
    this.barrel.y = this.y + 6 + this.recoil;
  }
}
