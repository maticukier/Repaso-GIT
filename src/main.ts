import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from './data/tuning';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { SettingsScene } from './scenes/SettingsScene';
import { UpgradesScene } from './scenes/UpgradesScene';
import { progress } from './systems/Progress';
import { sfx } from './systems/Sfx';
import { GameScene } from './scenes/GameScene';
import { LevelSelectScene } from './scenes/LevelSelectScene';
import { ResultScene } from './scenes/ResultScene';

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
  scene: [BootScene, MenuScene, LevelSelectScene, UpgradesScene, GameScene, ResultScene, SettingsScene],
});

// El audio sólo puede arrancar tras un gesto del usuario (y iOS puede volver
// a suspenderlo): cada toque intenta crear/reanudar el contexto.
window.addEventListener('pointerdown', () => sfx.unlock(), { passive: true });
window.addEventListener('keydown', () => sfx.unlock());

if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game; __progress: typeof progress }).__game = game;
  (window as unknown as { __progress: typeof progress }).__progress = progress;
}
