import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './data/tuning';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: COLORS.background,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    // Sin MSAA: todo es quads texturizados alineados, MSAA sólo gasta fill-rate.
    antialiasGL: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  },
  input: {
    activePointers: 2,
  },
  fps: {
    target: 60,
  },
  disableContextMenu: true,
  banner: false,
  scene: [BootScene, GameScene],
});

if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
