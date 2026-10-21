/**
 * Flags por query string, leídos una sola vez al arrancar.
 *   ?stress=600  -> arranca con test de estrés (target de minions opcional)
 *   ?debug=0     -> oculta el panel de debug
 */
export interface Flags {
  debug: boolean;
  stress: boolean;
  stressTarget: number;
}

export function readFlags(defaultStressTarget: number): Flags {
  const params = new URLSearchParams(window.location.search);
  const stressRaw = params.get('stress');
  const parsed = stressRaw ? Number.parseInt(stressRaw, 10) : NaN;
  return {
    debug: params.get('debug') !== '0',
    stress: stressRaw !== null && stressRaw !== '0',
    stressTarget: Number.isFinite(parsed) && parsed > 1 ? parsed : defaultStressTarget,
  };
}
