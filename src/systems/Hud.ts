import Phaser from 'phaser';
import { COLORS, DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../data/tuning';
import { NUM_FONT, TEX } from '../utils/textures';
import type { Ammo } from './Ammo';

const BAR_W = 360;
const BAR_H = 18;

/** Barra de munición (cargador) + disparos restantes, al pie de la pantalla. */
export class Hud {
  private readonly fill: Phaser.GameObjects.Image;
  private readonly text: Phaser.GameObjects.BitmapText;
  private shown = -1;
  private readonly x0: number;

  constructor(scene: Phaser.Scene) {
    const y = GAME_HEIGHT - 34;
    this.x0 = GAME_WIDTH / 2 - BAR_W / 2 + 50;
    scene.add.image(this.x0 - 4, y, TEX.px).setOrigin(0, 0.5).setDisplaySize(BAR_W + 8, BAR_H + 8).setTint(0x10121c).setDepth(DEPTH.hud);
    scene.add.image(this.x0, y, TEX.px).setOrigin(0, 0.5).setDisplaySize(BAR_W, BAR_H).setTint(COLORS.ammoBarEmpty).setDepth(DEPTH.hud);
    this.fill = scene.add.image(this.x0, y, TEX.px).setOrigin(0, 0.5).setTint(COLORS.ammoBar).setDepth(DEPTH.hud);
    this.text = scene.add
      .bitmapText(this.x0 - 14, y + 1, NUM_FONT.key, '', 34)
      .setLetterSpacing(-6)
      .setTint(COLORS.ammoBar)
      .setOrigin(1, 0.5)
      .setDepth(DEPTH.hud);
  }

  update(ammo: Ammo): void {
    this.fill.setDisplaySize(Math.max(0.01, BAR_W * ammo.fill), BAR_H);
    // En el test de estrés la munición es infinita: no se muestra contador.
    const r = ammo.infinite ? -1 : ammo.remaining;
    if (r !== this.shown) {
      this.shown = r;
      this.text.setText(r < 0 ? '' : `${r}`);
    }
  }
}
