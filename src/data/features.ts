/**
 * Flags de funcionalidades opcionales. Todo lo que monetiza está APAGADO por
 * defecto y, si se enciende, nunca interrumpe el juego.
 */
export const FEATURES = {
  /**
   * Anuncio rewarded opcional "Duplicar monedas" en la pantalla de resultado.
   * Requiere una implementación real de RewardedAds (ver README). En
   * desarrollo, `?ads=sim` usa una simulación para probar el flujo.
   */
  rewardedAds: false,
} as const;
