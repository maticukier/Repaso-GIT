import Phaser from 'phaser';
import { LEVELS } from '../data/levels';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../data/tuning';
import { Button } from '../entities/Button';
import { progress } from '../systems/Progress';
import { PANEL_SLICE, TEX } from '../utils/textures';

export interface ResultData {
  level: number;
  won: boolean;
  stars: number;
}

const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

/** Pantalla de victoria/derrota, superpuesta a la partida (que sigue corriendo de fondo). */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    const { level, won, stars } = data;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const def = LEVELS[level];
    const hasNext = level + 1 < LEVELS.length;
    const nextUnlocked = hasNext && progress.isUnlocked(level + 1);

    // Bloquea los toques a la partida de abajo.
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x0b0816, 0.6).setInteractive();

    this.add
      .nineslice(cx, cy + 6, TEX.panel, undefined, 560, 620, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE)
      .setTint(0x10121c);
    this.add
      .nineslice(cx, cy, TEX.panel, undefined, 560, 620, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE)
      .setTint(0x2a1f4a);

    this.add
      .text(cx, cy - 250, `Nivel ${level + 1} · ${def.name}`, {
        fontFamily: FONT,
        fontSize: '28px',
        fontStyle: '700',
        color: '#c9c0ff',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy - 190, won ? '¡Torre destruida!' : 'Sin munición', {
        fontFamily: FONT,
        fontSize: '54px',
        fontStyle: '900',
        color: won ? '#4fe3c1' : '#ff4d6d',
        stroke: '#10121c',
        strokeThickness: 9,
      })
      .setOrigin(0.5);

    if (won) {
      for (let s = 0; s < 3; s++) {
        const star = this.add
          .image(cx + (s - 1) * 110, cy - 70 + (s === 1 ? -16 : 0), TEX.star)
          .setScale(s === 1 ? 1.7 : 1.4)
          .setTint(s < stars ? COLORS.star : COLORS.starEmpty);
        if (s < stars) {
          // Aparición escalonada de las estrellas ganadas.
          const to = star.scale;
          star.setScale(0);
          this.tweens.add({ targets: star, scale: to, duration: 260, delay: 150 + s * 180, ease: 'Back.Out' });
        }
      }
    } else {
      this.add
        .text(cx, cy - 80, 'Probá otra puerta o\nrepartí mejor la munición', {
          fontFamily: FONT,
          fontSize: '28px',
          fontStyle: '700',
          color: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5);
    }

    const primaryIsNext = won && hasNext;
    new Button(this, cx, cy + 60, {
      width: 400,
      height: 92,
      label: primaryIsNext ? 'Siguiente' : 'Reintentar',
      color: COLORS.button,
      onClick: () => this.scene.start('Game', { level: primaryIsNext ? level + 1 : level }),
    });
    if (primaryIsNext) {
      new Button(this, cx, cy + 172, {
        width: 400,
        height: 80,
        label: 'Reintentar',
        color: COLORS.buttonAlt,
        fontSize: 28,
        onClick: () => this.scene.start('Game', { level }),
      });
    } else {
      // Al perder, "Siguiente" sólo si ya estaba desbloqueado (rejugando).
      new Button(this, cx, cy + 172, {
        width: 400,
        height: 80,
        label: 'Siguiente',
        color: COLORS.buttonAlt,
        fontSize: 28,
        enabled: nextUnlocked,
        onClick: () => this.scene.start('Game', { level: level + 1 }),
      });
    }
    new Button(this, cx, cy + 268, {
      width: 400,
      height: 72,
      label: 'Niveles',
      color: 0xc9c0ff,
      fontSize: 26,
      onClick: () => {
        this.scene.stop('Game');
        this.scene.start('LevelSelect');
      },
    });
  }
}
