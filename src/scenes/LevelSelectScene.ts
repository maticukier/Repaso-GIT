import Phaser from 'phaser';
import { LEVELS } from '../data/levels';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../data/tuning';
import { Button } from '../entities/Button';
import { CoinCounter } from '../entities/CoinCounter';
import { progress } from '../systems/Progress';
import { NUM_FONT, PANEL_SLICE, TEX } from '../utils/textures';

const COLS = 5;
const TILE = 108;
const GAP_X = 128;
const GAP_Y = 152;
const TOP = 290;
const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

/** Grilla de niveles: bloqueados con candado, jefes en rojo, estrellas ganadas. */
export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super('LevelSelect');
  }

  create(): void {
    this.add.image(0, 0, TEX.lane).setOrigin(0, 0).setAlpha(0.35);

    new Button(this, 52, 56, {
      width: 72,
      height: 72,
      label: '‹',
      fontSize: 56,
      color: COLORS.buttonAlt,
      onClick: () => this.scene.start('Menu'),
    });
    new CoinCounter(this, GAME_WIDTH - 28, 56);
    this.add
      .text(GAME_WIDTH / 2, 130, 'Niveles', {
        fontFamily: FONT,
        fontSize: '60px',
        fontStyle: '900',
        color: '#4fe3c1',
        stroke: '#10121c',
        strokeThickness: 10,
      })
      .setOrigin(0.5);

    const total = progress.totalStars();
    this.add.image(GAME_WIDTH / 2 - 60, 196, TEX.star).setScale(0.6).setTint(COLORS.star);
    this.add
      .text(GAME_WIDTH / 2 - 28, 196, `${total} / ${LEVELS.length * 3}`, {
        fontFamily: FONT,
        fontSize: '34px',
        fontStyle: '900',
        color: '#ffffff',
        stroke: '#10121c',
        strokeThickness: 6,
      })
      .setOrigin(0, 0.5);

    new Button(this, GAME_WIDTH / 2, GAME_HEIGHT - 70, {
      width: 360,
      height: 84,
      label: 'Mejoras',
      fontSize: 34,
      color: COLORS.coin,
      onClick: () => this.scene.start('Upgrades', { back: 'LevelSelect' }),
    });

    const x0 = GAME_WIDTH / 2 - ((COLS - 1) * GAP_X) / 2;
    LEVELS.forEach((level, i) => {
      const x = x0 + (i % COLS) * GAP_X;
      const y = TOP + Math.floor(i / COLS) * GAP_Y;
      this.createTile(i, level.boss, x, y);
    });
  }

  private createTile(index: number, boss: boolean, x: number, y: number): void {
    const unlocked = progress.isUnlocked(index);
    const color = boss ? (unlocked ? COLORS.boss : COLORS.bossLocked) : unlocked ? COLORS.buttonAlt : COLORS.locked;

    this.add
      .nineslice(x, y + 6, TEX.panel, undefined, TILE, TILE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE)
      .setTint(0x10121c);
    const tile = this.add
      .nineslice(x, y, TEX.panel, undefined, TILE, TILE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE)
      .setTint(color);

    if (boss) {
      this.add
        .text(x, y - TILE / 2 - 2, 'JEFE', {
          fontFamily: FONT,
          fontSize: '20px',
          fontStyle: '900',
          color: '#ffd166',
          stroke: '#10121c',
          strokeThickness: 5,
        })
        .setOrigin(0.5);
    }

    if (!unlocked) {
      this.add.image(x, y, TEX.lock).setTint(boss ? 0xc77a9a : 0x8a80b8);
      return;
    }

    this.add.bitmapText(x, y + 2, NUM_FONT.key, `${index + 1}`, 56).setOrigin(0.5).setLetterSpacing(-8);

    const stars = progress.starsOf(index);
    for (let s = 0; s < 3; s++) {
      this.add
        .image(x + (s - 1) * 30, y + TILE / 2 + 22, TEX.star)
        .setScale(0.42)
        .setTint(s < stars ? COLORS.star : COLORS.starEmpty);
    }

    tile.setInteractive({ useHandCursor: true });
    tile.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.scene.start('Game', { level: index }));
  }
}
