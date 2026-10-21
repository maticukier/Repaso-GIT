import Phaser from 'phaser';
import { FLOATING } from '../data/tuning';
import { NUM_FONT } from '../utils/textures';

/**
 * Pool fijo de textos flotantes ("+20", "-5"...) en BitmapText: reutilizar
 * uno no re-rasteriza nada. La animación (subir + fade) es aritmética pura.
 */
export class FloatingTextPool {
  private readonly texts: Phaser.GameObjects.BitmapText[] = [];
  private readonly life: Float32Array;
  private next = 0;

  constructor(scene: Phaser.Scene, size: number, depth: number) {
    this.life = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      const t = scene.add
        .bitmapText(0, 0, NUM_FONT.key, '')
        .setLetterSpacing(-8)
        .setOrigin(0.5)
        .setDepth(depth)
        .setVisible(false);
      this.texts.push(t);
    }
  }

  show(x: number, y: number, text: string, color: number): void {
    // Round-robin: si se agotan, se recicla el más viejo.
    const i = this.next;
    this.next = (i + 1) % this.texts.length;
    const t = this.texts[i];
    t.setText(text).setTint(color).setPosition(x, y).setAlpha(1).setScale(0.6).setVisible(true);
    this.life[i] = FLOATING.duration;
  }

  update(dt: number): void {
    for (let i = 0; i < this.texts.length; i++) {
      if (this.life[i] <= 0) continue;
      const l = (this.life[i] -= dt);
      const t = this.texts[i];
      if (l <= 0) {
        t.setVisible(false);
        continue;
      }
      const k = 1 - l / FLOATING.duration;
      t.y -= FLOATING.risePerSec * dt;
      t.setScale(k < 0.15 ? 0.6 + (k / 0.15) * 0.5 : 1.1 - Math.min(0.1, (k - 0.15) * 0.4));
      t.setAlpha(k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4);
    }
  }
}
