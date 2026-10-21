/**
 * Efectos de sonido sintetizados con WebAudio: osciladores y ruido con
 * envolventes cortas, sin archivos externos.
 *
 * - El AudioContext se crea/reanuda en el primer gesto del usuario (los
 *   navegadores bloquean audio antes de eso).
 * - Cada sonido tiene un intervalo mínimo: con cientos de minions los
 *   eventos llegan a ráfagas y sin límite saturarían el mix y la CPU.
 */
export type SoundId =
  | 'shoot'
  | 'gateUp'
  | 'gateDown'
  | 'hit'
  | 'enemyDown'
  | 'towerHit'
  | 'towerDown'
  | 'win'
  | 'lose'
  | 'click'
  | 'coin'
  | 'buy'
  | 'denied';

const MIN_INTERVAL: Record<SoundId, number> = {
  shoot: 0.06,
  gateUp: 0.09,
  gateDown: 0.12,
  hit: 0.07,
  enemyDown: 0.05,
  towerHit: 0.09,
  towerDown: 0.5,
  win: 0.5,
  lose: 0.5,
  click: 0.05,
  coin: 0.06,
  buy: 0.1,
  denied: 0.15,
};

type Wave = OscillatorType;

class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private enabled = true;
  private readonly last = new Map<SoundId, number>();

  /** Llamar desde un gesto del usuario (pointerdown). Idempotente. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.5 : 0;
      // Compresor suave: muchas voces juntas no clippean.
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp).connect(this.ctx.destination);
      this.noise = this.makeNoise(this.ctx);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  /** Silencia y libera el hilo de audio (app en segundo plano). Se reanuda con unlock(). */
  suspend(): void {
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.master && this.ctx) this.master.gain.setValueAtTime(enabled ? 0.5 : 0, this.ctx.currentTime);
  }

  play(id: SoundId): void {
    const ctx = this.ctx;
    if (!this.enabled || !ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const prev = this.last.get(id) ?? -1;
    if (now - prev < MIN_INTERVAL[id]) return;
    this.last.set(id, now);

    const r = 1 + (Math.random() - 0.5) * 0.12; // leve variación de tono
    switch (id) {
      case 'shoot':
        this.tone(520 * r, 300 * r, 0.05, 'square', 0.05);
        break;
      case 'gateUp':
        this.tone(660 * r, 1320 * r, 0.09, 'triangle', 0.12);
        break;
      case 'gateDown':
        this.tone(220, 110, 0.14, 'sawtooth', 0.1);
        break;
      case 'hit':
        this.noiseBurst(0.05, 0.12, 1800 * r);
        break;
      case 'enemyDown':
        this.noiseBurst(0.25, 0.3, 900);
        this.tone(300, 60, 0.3, 'square', 0.15);
        break;
      case 'towerHit':
        this.tone(110 * r, 70, 0.08, 'sine', 0.25);
        break;
      case 'towerDown':
        this.noiseBurst(0.9, 0.5, 500);
        this.tone(160, 35, 0.9, 'sawtooth', 0.25);
        break;
      case 'win':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, f, 0.16, 'triangle', 0.18, i * 0.11));
        break;
      case 'lose':
        [392, 330, 262].forEach((f, i) => this.tone(f, f * 0.97, 0.22, 'triangle', 0.16, i * 0.16));
        break;
      case 'click':
        this.tone(880, 660, 0.04, 'triangle', 0.1);
        break;
      case 'coin':
        this.tone(988 * r, 988 * r, 0.06, 'square', 0.07);
        this.tone(1319 * r, 1319 * r, 0.12, 'square', 0.07, 0.06);
        break;
      case 'buy':
        [660, 880, 1320].forEach((f, i) => this.tone(f, f, 0.1, 'square', 0.08, i * 0.06));
        break;
      case 'denied':
        this.tone(180, 150, 0.16, 'square', 0.1);
        break;
    }
  }

  private tone(f0: number, f1: number, dur: number, wave: Wave, vol: number, delay = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master!);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private noiseBurst(dur: number, vol: number, cutoff: number): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(60, cutoff * 0.2), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter).connect(g).connect(this.master!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur);
  }

  /** 1 s de ruido blanco, generado una vez y reutilizado. */
  private makeNoise(ctx: AudioContext): AudioBuffer {
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }
}

export const sfx = new Sfx();
