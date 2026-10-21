import Phaser from 'phaser';
import { COLORS, DEPTH, FX, GAME_WIDTH, LANE } from '../data/tuning';
import { TEX } from '../utils/textures';
import { haptics } from './Haptics';
import { ParticlePool } from './ParticlePool';
import { sfx } from './Sfx';

/**
 * "Game feel": traduce eventos de juego en partículas, sonido, vibración y
 * temblor de cámara. Las entidades sólo avisan qué pasó; acá se decide cómo
 * se siente y se limita la frecuencia (las ráfagas de cientos de minions
 * no deben convertirse en cientos de efectos).
 */
export class Feedback {
  readonly particles: ParticlePool;
  private readonly camera: Phaser.Cameras.Scene2D.Camera;
  private time = 0;
  private lastTowerChip = -1;
  private lastTowerShake = -1;

  constructor(scene: Phaser.Scene) {
    this.particles = new ParticlePool(scene, TEX.fx, FX.particleCapacity);
    this.particles.blitter.setDepth(DEPTH.floating - 1);
    this.camera = scene.cameras.main;
  }

  update(dt: number): void {
    this.time += dt;
    this.particles.update(dt);
  }

  shot(): void {
    sfx.play('shoot');
  }

  /** Un minion cruzó una puerta. `positive` = ganó unidades. */
  gateCrossed(x: number, y: number, positive: boolean, color: number): void {
    if (positive) {
      sfx.play('gateUp');
      this.particles.burst(x, y, 1, color, 60, 140, 0.35);
    } else {
      sfx.play('gateDown');
      this.particles.burst(x, y, 4, COLORS.gateNeg, 80, 220, 0.45);
    }
  }

  enemyHit(x: number, y: number, color: number, hits: number): void {
    sfx.play('hit');
    this.particles.burst(x, y, Math.min(hits, 3), color, 80, 200, 0.35);
  }

  enemyKilled(x: number, y: number, color: number, radius: number): void {
    sfx.play('enemyDown');
    haptics.impact('medium');
    this.camera.shake(140, 0.006);
    this.particles.burst(x, y, 28, color, 120, 420, 0.7, 'dot', radius, 120);
    this.particles.burst(x, y, 10, 0xffffff, 80, 300, 0.6, 'chunk', radius, 160);
  }

  towerHit(lineY: number, hits: number): void {
    sfx.play('towerHit');
    if (this.time - this.lastTowerChip >= FX.towerChipInterval) {
      this.lastTowerChip = this.time;
      const x = LANE.left + 20 + Math.random() * (LANE.right - LANE.left - 40);
      this.particles.burst(x, lineY - 10, Math.min(2 + hits, 5), COLORS.sparkTower, 100, 260, 0.5, 'chunk', 30, 200);
    }
    if (this.time - this.lastTowerShake >= FX.towerShakeInterval) {
      this.lastTowerShake = this.time;
      this.camera.shake(80, 0.0025);
      haptics.impact('light');
    }
  }

  towerDestroyed(lineY: number, height: number): void {
    sfx.play('towerDown');
    haptics.impact('heavy');
    this.camera.shake(600, 0.018);
    const cx = GAME_WIDTH / 2;
    const cy = lineY - height / 2;
    this.particles.burst(cx, cy, 90, COLORS.sparkTower, 200, 700, 1.1, 'chunk', LANE.right - LANE.left, 250);
    this.particles.burst(cx, cy, 70, COLORS.towerRoof, 150, 600, 0.9, 'dot', 300, 300);
    this.particles.burst(cx, cy, 40, 0xffffff, 100, 500, 0.8, 'dot', 200, 200);
  }

  result(won: boolean): void {
    sfx.play(won ? 'win' : 'lose');
    haptics.impact(won ? 'success' : 'failure');
  }
}
