import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../data/tuning';
import { Button } from '../entities/Button';
import { PANEL_SLICE, TEX } from '../utils/textures';

const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

/** Pausa sobre la partida (al salir de la app, botón atrás o botón ‹). */
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x0b0816, 0.65).setInteractive();
    this.add.nineslice(cx, cy + 6, TEX.panel, undefined, 500, 420, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE).setTint(0x10121c);
    this.add.nineslice(cx, cy, TEX.panel, undefined, 500, 420, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE).setTint(0x2a1f4a);
    this.add.text(cx, cy - 130, 'Pausa', { fontFamily: FONT, fontSize: '56px', fontStyle: '900', color: '#ffffff' }).setOrigin(0.5);
    new Button(this, cx, cy, { width: 360, height: 96, label: 'Continuar', fontSize: 38, color: COLORS.button, onClick: () => this.resumeGame() });
    new Button(this, cx, cy + 120, {
      width: 360,
      height: 80,
      label: 'Salir a niveles',
      fontSize: 30,
      color: 0xc9c0ff,
      onClick: () => {
        this.scene.stop('Game');
        this.scene.start('LevelSelect');
      },
    });
  }

  resumeGame(): void {
    this.scene.stop();
    this.scene.resume('Game');
  }
}
