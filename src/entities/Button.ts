import Phaser from 'phaser';
import { sfx } from '../systems/Sfx';
import { PANEL_SLICE, TEX } from '../utils/textures';

export interface ButtonOptions {
  width: number;
  height: number;
  label: string;
  color: number;
  fontSize?: number;
  enabled?: boolean;
  onClick: () => void;
}

const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

/**
 * Botón táctil: NineSlice tinteado + texto. Se dispara al soltar dentro del
 * botón (no al apretar), así arrastrar el dedo afuera cancela el toque.
 */
export class Button extends Phaser.GameObjects.Container {
  private readonly bg: Phaser.GameObjects.NineSlice;
  private readonly text: Phaser.GameObjects.Text;
  private pressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: ButtonOptions) {
    super(scene, x, y);
    const { width, height } = opts;
    const shadow = scene.add
      .nineslice(0, 6, TEX.panel, undefined, width, height, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE)
      .setTint(0x10121c);
    this.bg = scene.add
      .nineslice(0, 0, TEX.panel, undefined, width, height, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE, PANEL_SLICE)
      .setTint(opts.color);
    const text = (this.text = scene.add
      .text(0, 0, opts.label, {
        fontFamily: FONT,
        fontSize: `${opts.fontSize ?? 32}px`,
        fontStyle: '900',
        color: '#10121c',
        align: 'center',
      })
      .setOrigin(0.5));
    this.add([shadow, this.bg, text]);
    this.setSize(width, height);
    scene.add.existing(this);

    if (opts.enabled === false) {
      this.setAlpha(0.35);
      return;
    }
    this.setInteractive({ useHandCursor: true });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
      this.pressed = true;
      this.bg.y = 3;
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => {
      this.pressed = false;
      this.bg.y = 0;
    });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      if (!this.pressed) return;
      this.pressed = false;
      this.bg.y = 0;
      sfx.play('click');
      opts.onClick();
    });
  }

  setLabel(label: string): this {
    this.text.setText(label);
    return this;
  }

  setColor(color: number): this {
    this.bg.setTint(color);
    return this;
  }
}
