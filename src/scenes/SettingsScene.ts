import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../data/tuning';
import { Button } from '../entities/Button';
import { haptics } from '../systems/Haptics';
import { progress, type Settings } from '../systems/Progress';
import { PANEL_SLICE, TEX } from '../utils/textures';

const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

/** Ajustes en un modal sobre la escena que lo abre. */
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x0b0816, 0.65).setInteractive();
    this.add.nineslice(cx, cy + 6, TEX.panel, undefined, 540, 520, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE).setTint(0x10121c);
    this.add.nineslice(cx, cy, TEX.panel, undefined, 540, 520, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE).setTint(0x2a1f4a);
    this.add
      .text(cx, cy - 190, 'Ajustes', { fontFamily: FONT, fontSize: '52px', fontStyle: '900', color: '#ffffff' })
      .setOrigin(0.5);

    this.toggle(cx, cy - 70, 'Sonido', 'sound');
    this.toggle(cx, cy + 50, 'Vibración', 'vibration');

    new Button(this, cx, cy + 180, {
      width: 300,
      height: 84,
      label: 'Listo',
      color: COLORS.button,
      onClick: () => this.scene.stop(),
    });
  }

  private toggle(x: number, y: number, name: string, key: keyof Settings): void {
    const label = (): string => `${name}: ${progress.settings[key] ? 'Sí' : 'No'}`;
    const color = (): number => (progress.settings[key] ? COLORS.button : COLORS.locked);
    const btn: Button = new Button(this, x, y, {
      width: 420,
      height: 90,
      label: label(),
      color: color(),
      onClick: () => {
        progress.setSetting(key, !progress.settings[key]);
        btn.setLabel(label()).setColor(color());
        if (key === 'vibration' && progress.settings.vibration) haptics.impact('medium');
      },
    });
  }
}
