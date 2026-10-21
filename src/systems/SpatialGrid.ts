import type { MinionPool } from './MinionPool';

/**
 * Grilla uniforme de minions, reconstruida una vez por frame con counting
 * sort sobre buffers pre-reservados (cero allocs).
 *
 * Los pocos objetos grandes (puertas, enemigos, torre) consultan las celdas
 * que tocan en vez de comparar contra cada minion. La grilla sólo filtra
 * candidatos: quien consulta siempre verifica la posición real del minion,
 * así que matar o spawnear durante la resolución no la invalida.
 */
export class SpatialGrid {
  readonly cols: number;
  readonly rows: number;
  private readonly inv: number;
  private readonly cellStart: Int32Array;
  private readonly cursor: Int32Array;
  private readonly items: Int32Array;
  private readonly cellOfSlot: Int32Array;

  constructor(
    width: number,
    height: number,
    readonly cellSize: number,
    capacity: number,
  ) {
    this.cols = Math.ceil(width / cellSize);
    this.rows = Math.ceil(height / cellSize);
    this.inv = 1 / cellSize;
    const cells = this.cols * this.rows;
    this.cellStart = new Int32Array(cells + 1);
    this.cursor = new Int32Array(cells);
    this.items = new Int32Array(capacity);
    this.cellOfSlot = new Int32Array(capacity);
  }

  private cellIndex(x: number, y: number): number {
    let cx = (x * this.inv) | 0;
    let cy = (y * this.inv) | 0;
    if (cx < 0) cx = 0;
    else if (cx >= this.cols) cx = this.cols - 1;
    if (cy < 0) cy = 0;
    else if (cy >= this.rows) cy = this.rows - 1;
    return cy * this.cols + cx;
  }

  build(pool: MinionPool): void {
    const { cellStart, cursor, items, cellOfSlot } = this;
    const cells = cursor.length;
    const n = pool.activeCount;
    const active = pool.active;

    cursor.fill(0);
    for (let i = 0; i < n; i++) {
      const id = active[i];
      const c = this.cellIndex(pool.x[id], pool.y[id]);
      cellOfSlot[i] = c;
      cursor[c]++;
    }

    cellStart[0] = 0;
    for (let c = 0; c < cells; c++) {
      cellStart[c + 1] = cellStart[c] + cursor[c];
      cursor[c] = cellStart[c];
    }

    for (let i = 0; i < n; i++) {
      items[cursor[cellOfSlot[i]]++] = active[i];
    }
  }

  /**
   * Escribe en `out` los ids de minions de las celdas que tocan el rect y
   * devuelve cuántos son. Puede incluir minions fuera del rect.
   */
  queryRect(minX: number, minY: number, maxX: number, maxY: number, out: Int32Array): number {
    const c0 = this.cellIndex(minX, minY);
    const c1 = this.cellIndex(maxX, maxY);
    const x0 = c0 % this.cols;
    const y0 = (c0 / this.cols) | 0;
    const x1 = c1 % this.cols;
    const y1 = (c1 / this.cols) | 0;
    const { cellStart, items } = this;
    const max = out.length;

    let count = 0;
    for (let cy = y0; cy <= y1; cy++) {
      const row = cy * this.cols;
      for (let cx = x0; cx <= x1; cx++) {
        const c = row + cx;
        const end = cellStart[c + 1];
        for (let k = cellStart[c]; k < end; k++) {
          if (count === max) return count;
          out[count++] = items[k];
        }
      }
    }
    return count;
  }
}
