/**
 * Progreso de la sesión: niveles desbloqueados y mejores estrellas.
 * Vive sólo en memoria; se pierde al recargar la página.
 */
class Progress {
  /** Índice (0-based) del nivel más alto desbloqueado. */
  private unlocked = 0;
  private stars: number[] = [];

  isUnlocked(index: number): boolean {
    return index <= this.unlocked;
  }

  starsOf(index: number): number {
    return this.stars[index] ?? 0;
  }

  totalStars(): number {
    return this.stars.reduce((a, b) => a + (b ?? 0), 0);
  }

  /** Registra una victoria; devuelve true si desbloqueó un nivel nuevo. */
  recordWin(index: number, stars: number, levelCount: number): boolean {
    this.stars[index] = Math.max(this.starsOf(index), stars);
    if (index + 1 < levelCount && this.unlocked < index + 1) {
      this.unlocked = index + 1;
      return true;
    }
    return false;
  }
}

export const progress = new Progress();
