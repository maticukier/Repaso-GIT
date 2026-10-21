/**
 * Munición en dos niveles:
 *  - cargador (la barra): limita la cadencia y se recarga solo;
 *  - reserva: total de disparos del nivel, de donde se recarga el cargador.
 * Sin reserva la barra no vuelve a llenarse, y ahí puede perderse el nivel.
 */
export class Ammo {
  magazine: number;
  reserve: number;

  constructor(
    readonly magazineMax: number,
    reserve: number,
    readonly regenPerSec: number,
    readonly infinite = false,
  ) {
    this.magazine = magazineMax;
    this.reserve = reserve - magazineMax;
  }

  get fill(): number {
    return this.magazine / this.magazineMax;
  }

  /** Disparos que quedan en total (cargador + reserva). */
  get remaining(): number {
    return Math.floor(this.magazine + this.reserve);
  }

  get empty(): boolean {
    return !this.infinite && this.magazine < 1 && this.reserve <= 0;
  }

  tryConsume(): boolean {
    if (this.magazine < 1) return false;
    this.magazine -= 1;
    return true;
  }

  update(dt: number): void {
    const room = this.magazineMax - this.magazine;
    if (room <= 0) return;
    let add = this.regenPerSec * dt;
    if (add > room) add = room;
    if (!this.infinite) {
      if (add > this.reserve) add = this.reserve;
      this.reserve -= add;
    }
    this.magazine += add;
  }
}
