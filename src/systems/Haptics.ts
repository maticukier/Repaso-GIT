export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'failure';

/**
 * Vibración. Interfaz para poder cambiar la implementación web por una
 * nativa (p. ej. Capacitor Haptics) sin tocar a quien la usa.
 */
export interface Haptics {
  setEnabled(enabled: boolean): void;
  impact(kind: HapticKind): void;
}

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 12,
  medium: 25,
  heavy: [40, 30, 60],
  success: [20, 40, 20, 40, 40],
  failure: [80, 50, 80],
};

/** Mínimo entre vibraciones: muchas seguidas se sienten como ruido. */
const MIN_INTERVAL_MS = 70;

/** navigator.vibrate (Android/Chrome; en iOS Safari no existe y no hace nada). */
export class WebHaptics implements Haptics {
  private enabled = true;
  private last = 0;
  private readonly supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.supported) navigator.vibrate(0);
  }

  impact(kind: HapticKind): void {
    if (!this.enabled || !this.supported) return;
    const now = performance.now();
    const important = kind === 'heavy' || kind === 'success' || kind === 'failure';
    if (!important && now - this.last < MIN_INTERVAL_MS) return;
    this.last = now;
    try {
      navigator.vibrate(PATTERNS[kind]);
    } catch {
      // Algunos navegadores lo bloquean sin gesto del usuario.
    }
  }
}

export const haptics: Haptics = new WebHaptics();
