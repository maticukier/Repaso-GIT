import type { Direction, PlacedWord, Puzzle } from './generator';

export type Pos = { row: number; col: number };

export function cellsOf(word: PlacedWord): Pos[] {
  return Array.from(word.answer, (_, i) =>
    word.direction === 'across'
      ? { row: word.row, col: word.col + i }
      : { row: word.row + i, col: word.col },
  );
}

export function wordAt(puzzle: Puzzle, pos: Pos, dir: Direction): PlacedWord | undefined {
  return puzzle.words.find(
    (w) => w.direction === dir && cellsOf(w).some((c) => c.row === pos.row && c.col === pos.col),
  );
}

export function emptyEntries(puzzle: Puzzle): string[][] {
  return puzzle.solution.map((row) => row.map(() => ''));
}

export function isSolved(puzzle: Puzzle, entries: string[][]): boolean {
  return puzzle.solution.every((row, r) =>
    row.every((letter, c) => letter === null || entries[r]?.[c] === letter),
  );
}

// Casilla siguiente dentro de la palabra, saltando las ya completas si se puede.
export function nextCellInWord(word: PlacedWord, pos: Pos, entries: string[][]): Pos {
  const cells = cellsOf(word);
  const index = cells.findIndex((c) => c.row === pos.row && c.col === pos.col);
  const after = cells.slice(index + 1);
  const empty = after.find((c) => !entries[c.row][c.col]);
  return empty ?? after[0] ?? pos;
}

export function prevCellInWord(word: PlacedWord, pos: Pos): Pos {
  const cells = cellsOf(word);
  const index = cells.findIndex((c) => c.row === pos.row && c.col === pos.col);
  return index > 0 ? cells[index - 1] : pos;
}

export function firstEmptyCell(word: PlacedWord, entries: string[][]): Pos {
  const cells = cellsOf(word);
  return cells.find((c) => !entries[c.row][c.col]) ?? cells[0];
}

// Arma el texto para compartir el resultado, estilo Wordle.
export function shareText(num: number, seconds: number, revealed: number): string {
  const help = revealed === 0 ? '⚽ ¡Sin ayuda!' : `💡 ${revealed} letra${revealed === 1 ? '' : 's'} revelada${revealed === 1 ? '' : 's'}`;
  return `Crucigrama Futbolero #${num}\n⏱️ ${formatTime(seconds)}\n${help}`;
}

export function formatTime(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
