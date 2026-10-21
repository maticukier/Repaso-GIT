import Phaser from 'phaser';
import { LEVELS } from '../data/levels';
import { readFlags } from '../utils/flags';
import { generateTextures } from '../utils/textures';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    generateTextures(this);
    // ?level=N entra directo a ese nivel (pruebas); si no, a la selección.
    const { level } = readFlags(0);
    if (level !== null && level >= 1 && level <= LEVELS.length) this.scene.start('Game', { level: level - 1 });
    else this.scene.start('LevelSelect');
  }
}
