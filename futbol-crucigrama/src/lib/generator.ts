import type { WordEntry } from '../data/words';
import { type Rng, shuffle } from './random';

export type Direction = 'across' | 'down';

export type PlacedWord = {
  number: number;
  answer: string;
  clue: string;
  row: number;
  col: number;
  direction: Direction;
};

export type Puzzle = {
  rows: number;
  cols: number;
  // solution[row][col] es la letra correcta, o null si la casilla es negra
  solution: (string | null)[][];
  // numbers[row][col] es el número de pista que empieza en la casilla
  numbers: (number | null)[][];
  words: PlacedWord[];
};

export type GeneratorOptions = {
  maxSize: number;
  targetWords: number;
  attempts: number;
};

const DEFAULT_OPTIONS: GeneratorOptions = {
  maxSize: 11,
  targetWords: 10,
  attempts: 40,
};

type Cell = { letter: string; across: boolean; down: boolean };

type Placement = {
  entry: WordEntry;
  row: number;
  col: number;
  direction: Direction;
};

const key = (row: number, col: number) => `${row},${col}`;
const step = (d: Direction) => (d === 'across' ? [0, 1] : [1, 0]);

class Layout {
  cells = new Map<string, Cell>();
  placements: Placement[] = [];
  minRow = 0;
  maxRow = 0;
  minCol = 0;
  maxCol = 0;

  get height() {
    return this.maxRow - this.minRow + 1;
  }

  get width() {
    return this.maxCol - this.minCol + 1;
  }

  private occupied(row: number, col: number) {
    return this.cells.has(key(row, col));
  }

  // Devuelve la cantidad de cruces si la palabra entra en esa posición,
  // o -1 si no es válida.
  score(word: string, row: number, col: number, dir: Direction, maxSize: number): number {
    const [dr, dc] = step(dir);
    const endRow = row + dr * (word.length - 1);
    const endCol = col + dc * (word.length - 1);

    const height = Math.max(this.maxRow, endRow) - Math.min(this.minRow, row) + 1;
    const width = Math.max(this.maxCol, endCol) - Math.min(this.minCol, col) + 1;
    if (height > maxSize || width > maxSize) return -1;

    // Las casillas justo antes y después de la palabra tienen que estar vacías.
    if (this.occupied(row - dr, col - dc)) return -1;
    if (this.occupied(endRow + dr, endCol + dc)) return -1;

    let crossings = 0;
    for (let i = 0; i < word.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const cell = this.cells.get(key(r, c));
      if (cell) {
        if (cell.letter !== word[i]) return -1;
        // No se puede superponer con una palabra en la misma dirección.
        if (dir === 'across' ? cell.across : cell.down) return -1;
        crossings++;
      } else {
        // Una casilla nueva no puede tocar lateralmente a otra letra,
        // porque formaría palabras que no existen.
        if (this.occupied(r - dc, c - dr) || this.occupied(r + dc, c + dr)) return -1;
      }
    }
    return crossings;
  }

  place(entry: WordEntry, row: number, col: number, dir: Direction) {
    const [dr, dc] = step(dir);
    const word = entry.answer;
    for (let i = 0; i < word.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const k = key(r, c);
      const cell = this.cells.get(k) ?? { letter: word[i], across: false, down: false };
      if (dir === 'across') cell.across = true;
      else cell.down = true;
      this.cells.set(k, cell);
    }
    if (this.placements.length === 0) {
      this.minRow = this.maxRow = row;
      this.minCol = this.maxCol = col;
    }
    this.minRow = Math.min(this.minRow, row);
    this.minCol = Math.min(this.minCol, col);
    this.maxRow = Math.max(this.maxRow, row + dr * (word.length - 1));
    this.maxCol = Math.max(this.maxCol, col + dc * (word.length - 1));
    this.placements.push({ entry, row, col, direction: dir });
  }

  // Busca la mejor posición para la palabra cruzándola con letras existentes.
  bestPlacement(word: string, rng: Rng, maxSize: number) {
    let best: { row: number; col: number; dir: Direction; score: number } | null = null;
    for (const [k, cell] of this.cells) {
      const [r, c] = k.split(',').map(Number);
      for (let i = 0; i < word.length; i++) {
        if (word[i] !== cell.letter) continue;
        const options: [Direction, number, number][] = [];
        if (!cell.across) options.push(['across', r, c - i]);
        if (!cell.down) options.push(['down', r - i, c]);
        for (const [dir, row, col] of options) {
          const crossings = this.score(word, row, col, dir, maxSize);
          if (crossings <= 0) continue;
          // Premiamos los cruces y desempatamos al azar.
          const score = crossings + rng() * 0.5;
          if (!best || score > best.score) best = { row, col, dir, score };
        }
      }
    }
    return best;
  }
}

function buildLayout(entries: WordEntry[], rng: Rng, options: GeneratorOptions): Layout {
  const layout = new Layout();
  // Las palabras largas primero, con algo de azar para variar la forma.
  const ordered = shuffle(entries, rng).sort(
    (a, b) => b.answer.length + rng() * 3 - (a.answer.length + rng() * 3),
  );

  const first = ordered.find((e) => e.answer.length <= options.maxSize);
  if (!first) return layout;
  layout.place(first, 0, 0, rng() < 0.5 ? 'across' : 'down');

  let pending = ordered.filter((e) => e !== first && e.answer.length <= options.maxSize);
  // Varias pasadas: una palabra que no entró antes puede entrar después.
  for (let pass = 0; pass < 3 && layout.placements.length < options.targetWords; pass++) {
    const remaining: WordEntry[] = [];
    for (const entry of pending) {
      if (layout.placements.length >= options.targetWords) break;
      const best = layout.bestPlacement(entry.answer, rng, options.maxSize);
      if (best) layout.place(entry, best.row, best.col, best.dir);
      else remaining.push(entry);
    }
    pending = remaining;
  }
  return layout;
}

function layoutQuality(layout: Layout): number {
  let letters = 0;
  let crossings = 0;
  for (const cell of layout.cells.values()) {
    letters++;
    if (cell.across && cell.down) crossings++;
  }
  const density = letters / (layout.width * layout.height);
  return layout.placements.length * 100 + crossings * 10 + density * 50;
}

function toPuzzle(layout: Layout): Puzzle {
  const rows = layout.height;
  const cols = layout.width;
  const solution: (string | null)[][] = Array.from({ length: rows }, () =>
    Array<string | null>(cols).fill(null),
  );
  const numbers: (number | null)[][] = Array.from({ length: rows }, () =>
    Array<number | null>(cols).fill(null),
  );

  for (const [k, cell] of layout.cells) {
    const [r, c] = k.split(',').map(Number);
    solution[r - layout.minRow][c - layout.minCol] = cell.letter;
  }

  const placements = layout.placements.map((p) => ({
    ...p,
    row: p.row - layout.minRow,
    col: p.col - layout.minCol,
  }));

  // Numeración clásica: de izquierda a derecha y de arriba hacia abajo.
  const starts = new Map<string, number>();
  const sortedStarts = [...new Set(placements.map((p) => key(p.row, p.col)))].sort((a, b) => {
    const [ar, ac] = a.split(',').map(Number);
    const [br, bc] = b.split(',').map(Number);
    return ar - br || ac - bc;
  });
  sortedStarts.forEach((k, i) => {
    starts.set(k, i + 1);
    const [r, c] = k.split(',').map(Number);
    numbers[r][c] = i + 1;
  });

  const words: PlacedWord[] = placements
    .map((p) => ({
      number: starts.get(key(p.row, p.col))!,
      answer: p.entry.answer,
      clue: p.entry.clue,
      row: p.row,
      col: p.col,
      direction: p.direction,
    }))
    .sort((a, b) =>
      a.direction === b.direction ? a.number - b.number : a.direction === 'across' ? -1 : 1,
    );

  return { rows, cols, solution, numbers, words };
}

export function generatePuzzle(
  bank: WordEntry[],
  rng: Rng,
  options: Partial<GeneratorOptions> = {},
): Puzzle {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let best: Layout | null = null;
  let bestQuality = -Infinity;
  for (let attempt = 0; attempt < opts.attempts; attempt++) {
    const candidates = shuffle(bank, rng).slice(0, opts.targetWords * 3);
    const layout = buildLayout(candidates, rng, opts);
    const quality = layoutQuality(layout);
    if (quality > bestQuality) {
      best = layout;
      bestQuality = quality;
    }
  }
  return toPuzzle(best!);
}
