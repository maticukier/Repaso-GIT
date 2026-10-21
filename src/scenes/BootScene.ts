import Phaser from 'phaser';
import { LEVELS } from '../data/levels';
import { haptics } from '../systems/Haptics';
import { progress } from '../systems/Progress';
import { sfx } from '../systems/Sfx';
import { createDefaultStorage } from '../systems/Storage';
import { readFlags } from '../utils/flags';
import { generateTextures } from '../utils/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateTextures(this);
    void this.start();
  }

  /** Carga el guardado antes de mostrar nada, y aplica los ajustes. */
  private async start(): Promise<void> {
    await progress.load(createDefaultStorage());
    const applySettings = (): void => {
      sfx.setEnabled(progress.settings.sound);
      haptics.setEnabled(progress.settings.vibration);
    };
    applySettings();
    progress.onChange(applySettings);

    // ?level=N entra directo a ese nivel (pruebas); si no, al menú.
    const { level } = readFlags(0);
    if (level !== null && level >= 1 && level <= LEVELS.length) this.scene.start('Game', { level: level - 1 });
    else this.scene.start('Menu');
  }
}
