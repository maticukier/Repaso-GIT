import Phaser from 'phaser';
import { progress } from '../systems/Progress';
import { NUM_FONT, TEX } from '../utils/textures';

/** Ícono de moneda + saldo, alineado a la derecha en (x, y). Se refresca solo. */
export class CoinCounter {
  private readonly text: Phaser.GameObjects.BitmapText;
  private readonly icon: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, depth = 0) {
    this.text = scene.add.bitmapText(x, y + 2, NUM_FONT.key, '', 40).setOrigin(1, 0.5).setLetterSpacing(-7).setDepth(depth);
    this.icon = scene.add.image(0, y, TEX.coin).setDepth(depth);
    this.refresh();
    const off = progress.onChange(() => this.refresh());
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }

  private refresh(): void {
    this.text.setText(`${progress.coins}`);
    this.icon.x = this.text.x - this.text.width - 30;
  }
}
