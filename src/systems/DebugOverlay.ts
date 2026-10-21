import Phaser from 'phaser';

export interface DebugStats {
  activeMinions: number;
  poolCapacity: number;
  stress: boolean;
  stressTarget: number;
}

/**
 * Panel de debug en DOM, encima del canvas.
 *
 * Se hace en DOM (y no con un Phaser.Text) porque:
 *  - actualizar un Text re-rasteriza y re-sube una textura a la GPU;
 *  - el botón DOM no dispara el pointerdown del canvas, así que tocarlo no
 *    hace disparar al cañón.
 * Se refresca 4 veces por segundo, no cada frame.
 */
export class DebugOverlay {
  private readonly root: HTMLDivElement;
  private readonly text: HTMLPreElement;
  private readonly button: HTMLButtonElement;
  private acc = 0;
  private frames = 0;
  private worstMs = 0;

  constructor(
    private readonly game: Phaser.Game,
    onToggleStress: () => void,
  ) {
    this.root = document.createElement('div');
    this.root.style.cssText = [
      'position:fixed',
      'top:calc(env(safe-area-inset-top, 0px) + 8px)',
      'left:8px',
      'z-index:10',
      'font:12px/1.35 ui-monospace,Menlo,Consolas,monospace',
      'color:#e8ffe9',
      'background:rgba(10,8,20,.72)',
      'border:1px solid rgba(143,124,255,.5)',
      'border-radius:8px',
      'padding:6px 8px',
      'pointer-events:auto',
      'touch-action:manipulation',
    ].join(';');

    this.text = document.createElement('pre');
    this.text.style.cssText = 'margin:0 0 6px 0;font:inherit;white-space:pre';

    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.style.cssText = [
      'font:inherit',
      'color:#10202a',
      'background:#4fe3c1',
      'border:0',
      'border-radius:6px',
      'padding:6px 10px',
      'cursor:pointer',
      'width:100%',
    ].join(';');
    this.button.addEventListener('click', onToggleStress);

    this.root.append(this.text, this.button);
    document.body.appendChild(this.root);
  }

  update(deltaMs: number, stats: DebugStats): void {
    this.acc += deltaMs;
    this.frames++;
    if (deltaMs > this.worstMs) this.worstMs = deltaMs;
    if (this.acc < 250) return;

    const fps = (this.frames * 1000) / this.acc;
    this.text.textContent =
      `FPS      ${fps.toFixed(0).padStart(4)}  (loop ${this.game.loop.actualFps.toFixed(0)})\n` +
      `peor ms  ${this.worstMs.toFixed(1).padStart(4)}\n` +
      `minions  ${String(stats.activeMinions).padStart(4)} / ${stats.poolCapacity}`;
    this.button.textContent = stats.stress ? `Estrés ON (${stats.stressTarget}) — apagar` : `Test estrés ${stats.stressTarget}`;
    this.button.style.background = stats.stress ? '#ff7a59' : '#4fe3c1';

    this.acc = 0;
    this.frames = 0;
    this.worstMs = 0;
  }

  destroy(): void {
    this.root.remove();
  }
}
