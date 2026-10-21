import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../data/tuning';
import { UPGRADES, type UpgradeDef } from '../data/upgrades';
import { Button } from '../entities/Button';
import { CoinCounter } from '../entities/CoinCounter';
import { haptics } from '../systems/Haptics';
import { progress } from '../systems/Progress';
import { sfx } from '../systems/Sfx';
import { PANEL_SLICE, TEX } from '../utils/textures';

const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
const CARD_W = 660;
const CARD_H = 228;

export interface UpgradesData {
  /** Escena a la que vuelve el botón ‹. */
  back?: string;
}

/** Mejoras permanentes: una tarjeta por mejora con nivel, efecto y costo. */
export class UpgradesScene extends Phaser.Scene {
  private back = 'Menu';

  constructor() {
    super('Upgrades');
  }

  init(data: UpgradesData): void {
    this.back = data.back ?? 'Menu';
  }

  create(): void {
    this.add.image(0, 0, TEX.lane).setOrigin(0, 0).setAlpha(0.35);
    new Button(this, 52, 56, {
      width: 72,
      height: 72,
      label: '‹',
      fontSize: 56,
      color: COLORS.buttonAlt,
      onClick: () => this.scene.start(this.back),
    });
    this.add
      .text(GAME_WIDTH / 2, 56, 'Mejoras', { fontFamily: FONT, fontSize: '50px', fontStyle: '900', color: '#ffffff', stroke: '#10121c', strokeThickness: 8 })
      .setOrigin(0.5);
    new CoinCounter(this, GAME_WIDTH - 28, 56);

    UPGRADES.forEach((u, i) => this.card(u, 250 + i * (CARD_H + 26)));
  }

  private card(u: UpgradeDef, y: number): void {
    const cx = GAME_WIDTH / 2;
    const left = cx - CARD_W / 2 + 28;
    this.add.nineslice(cx, y + 6, TEX.panel, undefined, CARD_W, CARD_H, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE).setTint(0x10121c);
    this.add.nineslice(cx, y, TEX.panel, undefined, CARD_W, CARD_H, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE).setTint(0x2a1f4a);

    const level = progress.upgradeLevel(u.id);
    const cost = progress.nextUpgradeCost(u.id);
    const maxed = cost === null;

    this.add.text(left, y - 86, u.name, { fontFamily: FONT, fontSize: '36px', fontStyle: '900', color: '#ffffff' });
    this.add.text(left, y - 40, u.description, {
      fontFamily: FONT,
      fontSize: '22px',
      fontStyle: '600',
      color: '#c9c0ff',
      wordWrap: { width: 380 },
    });

    // Pips de nivel.
    for (let k = 0; k < u.maxLevel; k++) {
      this.add
        .image(left + k * 30, y + 70, TEX.px)
        .setOrigin(0, 0.5)
        .setDisplaySize(22, 14)
        .setTint(k < level ? COLORS.button : COLORS.locked);
    }
    this.add
      .text(left + u.maxLevel * 30 + 6, y + 70, maxed ? u.effect(level) : `${u.effect(level)} → ${u.effect(level + 1)}`, {
        fontFamily: FONT,
        fontSize: '22px',
        fontStyle: '800',
        color: '#ffd166',
      })
      .setOrigin(0, 0.5);

    const bx = cx + CARD_W / 2 - 120;
    if (maxed) {
      new Button(this, bx, y - 20, { width: 190, height: 90, label: 'MÁX', color: COLORS.locked, enabled: false, onClick: () => {} });
      return;
    }
    const affordable = progress.coins >= cost;
    const btn = new Button(this, bx, y - 20, {
      width: 190,
      height: 90,
      label: `${cost}`,
      fontSize: 34,
      color: affordable ? COLORS.coin : COLORS.locked,
      onClick: () => {
        if (progress.buyUpgrade(u.id)) {
          sfx.play('buy');
          haptics.impact('light');
          this.scene.restart({ back: this.back });
        } else {
          sfx.play('denied');
          this.tweens.add({ targets: btn, x: bx + 8, duration: 40, yoyo: true, repeat: 2 });
        }
      },
    });
    this.add.image(bx - 62, y - 20, TEX.coin).setScale(0.6);
  }
}
