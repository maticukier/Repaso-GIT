import { Haptics as CapHaptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNative } from './Platform';

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

/** Base común: on/off y límite de frecuencia (los importantes nunca se descartan). */
abstract class ThrottledHaptics implements Haptics {
  protected enabled = true;
  private last = 0;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  impact(kind: HapticKind): void {
    if (!this.enabled) return;
    const now = performance.now();
    const important = kind === 'heavy' || kind === 'success' || kind === 'failure';
    if (!important && now - this.last < MIN_INTERVAL_MS) return;
    this.last = now;
    this.fire(kind);
  }

  protected abstract fire(kind: HapticKind): void;
}

/** navigator.vibrate (Android/Chrome; en iOS Safari no existe y no hace nada). */
export class WebHaptics extends ThrottledHaptics {
  private readonly supported = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  override setEnabled(enabled: boolean): void {
    super.setEnabled(enabled);
    if (!enabled && this.supported) navigator.vibrate(0);
  }

  protected fire(kind: HapticKind): void {
    if (!this.supported) return;
    try {
      navigator.vibrate(PATTERNS[kind]);
    } catch {
      // Algunos navegadores lo bloquean sin gesto del usuario.
    }
  }
}

/** Capacitor Haptics: usa el motor háptico del teléfono (más fino que vibrate). */
export class CapacitorHaptics extends ThrottledHaptics {
  protected fire(kind: HapticKind): void {
    const done = (p: Promise<void>): void => void p.catch(() => {});
    switch (kind) {
      case 'light':
        done(CapHaptics.impact({ style: ImpactStyle.Light }));
        break;
      case 'medium':
        done(CapHaptics.impact({ style: ImpactStyle.Medium }));
        break;
      case 'heavy':
        done(CapHaptics.impact({ style: ImpactStyle.Heavy }));
        break;
      case 'success':
        done(CapHaptics.notification({ type: NotificationType.Success }));
        break;
      case 'failure':
        done(CapHaptics.notification({ type: NotificationType.Error }));
        break;
    }
  }
}

export const haptics: Haptics = isNative ? new CapacitorHaptics() : new WebHaptics();
