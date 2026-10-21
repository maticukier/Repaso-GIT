import { App } from '@capacitor/app';
import { SystemBars, SystemBarType } from '@capacitor/core';
import type Phaser from 'phaser';
import type { GameScene } from '../scenes/GameScene';
import type { PauseScene } from '../scenes/PauseScene';
import { isNative } from './Platform';
import { sfx } from './Sfx';

/**
 * Ciclo de vida de la app:
 * - Al ir a segundo plano (home, llamada, apagar pantalla) se pausa la
 *   partida y se suspende el audio. Al volver queda en pausa: el jugador
 *   decide cuándo seguir.
 * - Botón atrás de Android: pausa en partida, cierra modales, vuelve una
 *   pantalla y en el menú principal sale de la app.
 * - En la app, la barra de estado se oculta (pantalla completa); la de
 *   navegación queda y el juego respeta las safe areas (ver index.html).
 */
export function setupLifecycle(game: Phaser.Game): void {
  const onBackground = (): void => {
    sfx.suspend();
    const g = game.scene.getScene('Game') as GameScene | null;
    if (g && game.scene.isActive('Game')) g.pauseGame();
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) onBackground();
  });

  if (!isNative) return;

  void App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) onBackground();
  });
  void App.addListener('backButton', () => handleBack(game));
  void SystemBars.hide({ bar: SystemBarType.StatusBar }).catch(() => {});
}

function handleBack(game: Phaser.Game): void {
  const sm = game.scene;
  const active = (key: string): boolean => sm.isActive(key);

  if (active('Settings')) {
    sm.stop('Settings');
  } else if (active('Pause')) {
    (sm.getScene('Pause') as PauseScene).resumeGame();
  } else if (active('Result')) {
    sm.stop('Result');
    sm.stop('Game');
    sm.start('LevelSelect');
  } else if (active('Game')) {
    (sm.getScene('Game') as GameScene).pauseGame();
  } else if (active('Upgrades') || active('LevelSelect')) {
    sm.getScenes(true).forEach((s) => sm.stop(s.scene.key));
    sm.start('Menu');
  } else if (active('Menu')) {
    void App.exitApp();
  }
}
