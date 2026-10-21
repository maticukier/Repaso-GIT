import { FEATURES } from '../data/features';

/**
 * Anuncios rewarded (opcionales: el jugador elige verlos a cambio de un
 * premio). Interfaz para enchufar un SDK real (p. ej. AdMob) sin tocar la UI.
 */
export interface RewardedAds {
  /** Hay un anuncio listo para ofrecer. */
  readonly available: boolean;
  /** Muestra el anuncio; resuelve true sólo si el jugador lo vio completo. */
  showRewarded(): Promise<boolean>;
}

/** Por defecto: no hay anuncios y la UI no ofrece nada. */
class NoAds implements RewardedAds {
  readonly available = false;

  async showRewarded(): Promise<boolean> {
    return false;
  }
}

/**
 * SOLO DESARROLLO (`npm run dev` + `?ads=sim`): pantalla que dice
 * explícitamente que es una simulación, para probar el flujo de la UI.
 * Nunca se incluye en builds de producción.
 */
class SimulatedAds implements RewardedAds {
  readonly available = true;

  showRewarded(): Promise<boolean> {
    return new Promise((resolve) => {
      const el = document.createElement('div');
      el.style.cssText =
        'position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;gap:16px;align-items:center;' +
        'justify-content:center;background:#000d;color:#fff;font:700 20px system-ui,sans-serif;text-align:center';
      el.innerHTML = '<div>ANUNCIO SIMULADO (desarrollo)</div><div style="font-size:15px;opacity:.7">Se cierra solo en 2 s</div>';
      document.body.appendChild(el);
      setTimeout(() => {
        el.remove();
        resolve(true);
      }, 2000);
    });
  }
}

function create(): RewardedAds {
  if (!FEATURES.rewardedAds) {
    const sim = import.meta.env.DEV && new URLSearchParams(window.location.search).get('ads') === 'sim';
    return sim ? new SimulatedAds() : new NoAds();
  }
  // Con el flag activo, enchufar acá la implementación real (README: "Anuncios").
  return new NoAds();
}

export const ads: RewardedAds = create();
