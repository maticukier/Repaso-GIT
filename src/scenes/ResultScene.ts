import Phaser from 'phaser';
import { LEVELS } from '../data/levels';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../data/tuning';
import type { CoinReward } from '../data/upgrades';
import { Button } from '../entities/Button';
import { ads } from '../systems/Ads';
import { progress } from '../systems/Progress';
import { sfx } from '../systems/Sfx';
import { NUM_FONT, PANEL_SLICE, TEX } from '../utils/textures';

export interface ResultData {
  level: number;
  won: boolean;
  stars: number;
  reward: CoinReward;
}

const PANEL_H = 760;

const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

/** Pantalla de victoria/derrota, superpuesta a la partida (que sigue corriendo de fondo). */
export class ResultScene extends Phaser.Scene {
  constructor() {
    super('Result');
  }

  create(data: ResultData): void {
    const { level, won, stars, reward } = data;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 - 20;
    const def = LEVELS[level];
    const hasNext = level + 1 < LEVELS.length;
    const nextUnlocked = hasNext && progress.isUnlocked(level + 1);

    // Bloquea los toques a la partida de abajo.
    this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x0b0816, 0.6).setInteractive();

    this.add
      .nineslice(cx, cy + 46, TEX.panel, undefined, 560, PANEL_H, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE)
      .setTint(0x10121c);
    this.add
      .nineslice(cx, cy + 40, TEX.panel, undefined, 560, PANEL_H, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE)
      .setTint(0x2a1f4a);

    this.add
      .text(cx, cy - 300, `Nivel ${level + 1} · ${def.name}`, {
        fontFamily: FONT,
        fontSize: '28px',
        fontStyle: '700',
        color: '#c9c0ff',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy - 240, won ? '¡Torre destruida!' : 'Sin munición', {
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
          .image(cx + (s - 1) * 110, cy - 130 + (s === 1 ? -16 : 0), TEX.star)
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
        .text(cx, cy - 130, 'Probá otra puerta o\nmejorá tu cañón', {
          fontFamily: FONT,
          fontSize: '28px',
          fontStyle: '700',
          color: '#ffffff',
          align: 'center',
        })
        .setOrigin(0.5);
    }

    this.showCoins(cx, cy - 30, reward);

    const primaryIsNext = won && hasNext;
    new Button(this, cx, cy + 90, {
      width: 400,
      height: 92,
      label: primaryIsNext ? 'Siguiente' : 'Reintentar',
      color: COLORS.button,
      onClick: () => this.scene.start('Game', { level: primaryIsNext ? level + 1 : level }),
    });
    if (primaryIsNext) {
      new Button(this, cx, cy + 195, {
        width: 400,
        height: 80,
        label: 'Reintentar',
        color: COLORS.buttonAlt,
        fontSize: 28,
        onClick: () => this.scene.start('Game', { level }),
      });
    } else {
      // Al perder, "Siguiente" sólo si ya estaba desbloqueado (rejugando).
      new Button(this, cx, cy + 195, {
        width: 400,
        height: 80,
        label: 'Siguiente',
        color: COLORS.buttonAlt,
        fontSize: 28,
        enabled: nextUnlocked,
        onClick: () => this.scene.start('Game', { level: level + 1 }),
      });
    }
    new Button(this, cx - 102, cy + 300, {
      width: 196,
      height: 72,
      label: 'Niveles',
      color: 0xc9c0ff,
      fontSize: 26,
      onClick: () => {
        this.scene.stop('Game');
        this.scene.start('LevelSelect');
      },
    });
    new Button(this, cx + 102, cy + 300, {
      width: 196,
      height: 72,
      label: 'Mejoras',
      color: COLORS.coin,
      fontSize: 26,
      onClick: () => {
        this.scene.stop('Game');
        this.scene.start('Upgrades', { back: 'LevelSelect' });
      },
    });
  }

  /**
   * Oferta OPCIONAL: ver un anuncio para duplicar las monedas de este nivel.
   * Sólo en esta pantalla (nunca durante el juego), con texto explícito, y
   * rechazarla no tiene ninguna consecuencia.
   */
  private offerDouble(cx: number, y: number, amount: number, text: Phaser.GameObjects.BitmapText): void {
    const btn = new Button(this, cx + 190, y, {
      width: 150,
      height: 60,
      label: 'x2 con\nanuncio',
      fontSize: 18,
      color: 0xc9c0ff,
      onClick: () => {
        btn.disableInteractive().setAlpha(0.5);
        void ads.showRewarded().then((ok) => {
          if (!ok) {
            btn.setInteractive().setAlpha(1);
            return;
          }
          progress.addCoins(amount);
          sfx.play('coin');
          text.setText(`+${amount * 2}`);
          btn.destroy();
        });
      },
    });
  }

  /** Monedas ganadas: cuenta hacia arriba + desglose. */
  private showCoins(cx: number, y: number, reward: CoinReward): void {
    const icon = this.add.image(cx - 40, y, TEX.coin).setScale(0.9);
    const text = this.add.bitmapText(cx - 10, y + 2, NUM_FONT.key, '+0', 46).setOrigin(0, 0.5).setLetterSpacing(-8).setTint(COLORS.coin);
    if (reward.total <= 0) {
      icon.setAlpha(0.4);
      text.setAlpha(0.4);
      return;
    }
    const counter = { v: 0 };
    let shown = 0;
    this.tweens.add({
      targets: counter,
      v: reward.total,
      duration: Math.min(900, 300 + reward.total * 6),
      delay: 400,
      ease: 'Cubic.Out',
      onUpdate: () => {
        const n = Math.round(counter.v);
        if (n === shown) return;
        shown = n;
        text.setText(`+${n}`);
        sfx.play('coin');
      },
    });
    if (ads.available) this.offerDouble(cx, y, reward.total, text);

    const parts: string[] = [];
    if (reward.starBonus > 0) parts.push(`estrellas +${reward.starBonus}`);
    if (reward.firstClear > 0) parts.push(`primera vez +${reward.firstClear}`);
    if (parts.length > 0) {
      this.add
        .text(cx, y + 40, parts.join('  ·  '), { fontFamily: FONT, fontSize: '20px', fontStyle: '700', color: '#c9c0ff' })
        .setOrigin(0.5);
    }
  }
}
