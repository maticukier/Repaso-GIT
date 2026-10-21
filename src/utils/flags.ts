/**
 * Flags por query string, leídos una sola vez al arrancar.
 *   ?stress=600  -> arranca con test de estrés (target de minions opcional)
 *   ?debug=0     -> oculta el panel de debug
 *   ?level=7     -> entra directo al nivel 7, salteando la selección (pruebas)
 */
export interface Flags {
  debug: boolean;
  level: number | null;
  stress: boolean;
  stressTarget: number;
}

export function readFlags(defaultStressTarget: number): Flags {
  const params = new URLSearchParams(window.location.search);
  const stressRaw = params.get('stress');
  const parsed = stressRaw ? Number.parseInt(stressRaw, 10) : NaN;
  const levelRaw = Number.parseInt(params.get('level') ?? '', 10);
  return {
    debug: params.get('debug') !== '0',
    level: Number.isFinite(levelRaw) ? levelRaw : null,
    stress: stressRaw !== null && stressRaw !== '0',
    stressTarget: Number.isFinite(parsed) && parsed > 1 ? parsed : defaultStressTarget,
  };
}
