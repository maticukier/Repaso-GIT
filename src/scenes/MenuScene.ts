import Phaser from 'phaser';
import { GAME_NAME } from '../data/branding';
import { LEVELS } from '../data/levels';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../data/tuning';
import { Button } from '../entities/Button';
import { CoinCounter } from '../entities/CoinCounter';
import { progress } from '../systems/Progress';
import { MINION_FRAMES, TEX } from '../utils/textures';

const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

/** Menú principal: título, monedas, Jugar / Mejoras / Ajustes. */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create(): void {
    const cx = GAME_WIDTH / 2;
    this.add.image(0, 0, TEX.lane).setOrigin(0, 0).setAlpha(0.45);
    new CoinCounter(this, GAME_WIDTH - 28, 56);

    // Una fila de minions que marcha detrás del título.
    for (let i = 0; i < 9; i++) {
      const m = this.add.image(120 + i * 60, 470, TEX.minion, MINION_FRAMES[i % 2]).setScale(1.6);
      this.tweens.add({ targets: m, y: 450, duration: 260, yoyo: true, repeat: -1, delay: i * 70, ease: 'Sine.InOut' });
    }

    const title = this.add
      .text(cx, 330, GAME_NAME, {
        fontFamily: FONT,
        fontSize: '96px',
        fontStyle: '900',
        color: '#4fe3c1',
        stroke: '#10121c',
        strokeThickness: 14,
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: title, scale: 1.04, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.add
      .text(cx, 410, 'Llevá la horda hasta la torre', {
        fontFamily: FONT,
        fontSize: '30px',
        fontStyle: '700',
        color: '#c9c0ff',
      })
      .setOrigin(0.5);

    const total = LEVELS.length;
    const cleared = LEVELS.filter((_, i) => progress.isCleared(i)).length;
    this.add.image(cx - 120, 600, TEX.star).setScale(0.6).setTint(COLORS.star);
    this.add
      .text(cx - 88, 600, `${progress.totalStars()} / ${total * 3}   ·   ${cleared}/${total} niveles`, {
        fontFamily: FONT,
        fontSize: '28px',
        fontStyle: '800',
        color: '#ffffff',
      })
      .setOrigin(0, 0.5);

    new Button(this, cx, 760, {
      width: 440,
      height: 120,
      label: 'Jugar',
      fontSize: 52,
      color: COLORS.button,
      onClick: () => this.scene.start('LevelSelect'),
    });
    new Button(this, cx, 910, {
      width: 440,
      height: 96,
      label: 'Mejoras',
      fontSize: 38,
      color: COLORS.coin,
      onClick: () => this.scene.start('Upgrades', { back: 'Menu' }),
    });
    new Button(this, cx, 1040, {
      width: 440,
      height: 96,
      label: 'Ajustes',
      fontSize: 38,
      color: COLORS.buttonAlt,
      onClick: () => this.scene.launch('Settings'),
    });

    this.add
      .text(cx, GAME_HEIGHT - 40, `v${__APP_VERSION__}`, { fontFamily: FONT, fontSize: '20px', color: '#6b5fa0' })
      .setOrigin(0.5);
  }
}
