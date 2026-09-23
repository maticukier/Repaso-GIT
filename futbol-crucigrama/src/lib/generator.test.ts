/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { WORDS } from '../data/words';
import { WORDS_DIFICIL } from '../data/words-dificil';
import { WORDS_MEDIO } from '../data/words-medio';
import { daysBetween, getDailyPuzzle, LEVELS, puzzleNumber } from './daily';
import type { Puzzle } from './generator';

function dayKeys(count: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(2026, 8, 23 + i));
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

// Lee todas las secuencias de 2+ letras de la grilla y verifica que cada una
// sea exactamente una palabra colocada (no hay palabras "fantasma").
function readRuns(p: Puzzle) {
  const runs: string[] = [];
  for (let r = 0; r < p.rows; r++) {
    for (let c = 0; c < p.cols; c++) {
      if (!p.solution[r][c]) continue;
      if (c === 0 || !p.solution[r][c - 1]) {
        let s = '';
        for (let cc = c; cc < p.cols && p.solution[r][cc]; cc++) s += p.solution[r][cc];
        if (s.length > 1) runs.push(`across:${r},${c}:${s}`);
      }
      if (r === 0 || !p.solution[r - 1][c]) {
        let s = '';
        for (let rr = r; rr < p.rows && p.solution[rr][c]; rr++) s += p.solution[rr][c];
        if (s.length > 1) runs.push(`down:${r},${c}:${s}`);
      }
    }
  }
  return runs.sort();
}

for (const [name, bank] of Object.entries({ WORDS, WORDS_MEDIO, WORDS_DIFICIL })) {
  test(`las respuestas de ${name} son válidas y únicas`, () => {
    const seen = new Set<string>();
    for (const { answer, clue } of bank) {
      assert.match(answer, /^[A-Z]{3,12}$/, answer);
      assert.ok(clue.length > 0);
      assert.ok(!seen.has(answer), `repetida: ${answer}`);
      seen.add(answer);
    }
  });
}

test('el fácil de hoy no cambió al agregar niveles', () => {
  const words = getDailyPuzzle('2026-09-23', 'facil').words.map((w) => w.answer);
  assert.deepEqual(words.slice(0, 3), ['CRACK', 'SAQUE', 'PALO']);
});

test('el mismo día genera el mismo crucigrama', () => {
  assert.deepEqual(getDailyPuzzle('2026-10-01'), getDailyPuzzle('2026-10-01'));
});

test('días distintos generan crucigramas distintos', () => {
  const a = getDailyPuzzle('2026-10-01').words.map((w) => w.answer).join();
  const b = getDailyPuzzle('2026-10-02').words.map((w) => w.answer).join();
  assert.notEqual(a, b);
});

test('numeración de los crucigramas', () => {
  assert.equal(puzzleNumber('2026-09-23'), 1);
  assert.equal(puzzleNumber('2026-10-23'), 31);
  assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1);
});

for (const { id: level } of LEVELS) for (const key of dayKeys(120)) {
  test(`crucigrama ${level} válido para ${key}`, () => {
    const p = getDailyPuzzle(key, level);
    const max = level === 'dificil' ? 12 : 11;
    assert.ok(p.rows <= max && p.cols <= max, `tamaño ${p.rows}x${p.cols}`);
    assert.ok(p.words.length >= 7, `solo ${p.words.length} palabras`);

    const expected = p.words
      .map((w) => `${w.direction}:${w.row},${w.col}:${w.answer}`)
      .sort();
    assert.deepEqual(readRuns(p), expected);

    for (const w of p.words) {
      assert.equal(p.numbers[w.row][w.col], w.number);
    }
  });
}

test('navegación dentro de una palabra', async () => {
  const { cellsOf, nextCellInWord, prevCellInWord, isSolved, emptyEntries } = await import('./game');
  const p = getDailyPuzzle('2026-09-23');
  const w = p.words[0];
  const cells = cellsOf(w);
  const entries = emptyEntries(p);
  assert.deepEqual(nextCellInWord(w, cells[0], entries), cells[1]);
  entries[cells[1].row][cells[1].col] = 'X';
  assert.deepEqual(nextCellInWord(w, cells[0], entries), cells[2]);
  assert.deepEqual(prevCellInWord(w, cells[0]), cells[0]);
  assert.equal(isSolved(p, entries), false);
  const solved = p.solution.map((row) => row.map((l) => l ?? ''));
  assert.equal(isSolved(p, solved), true);
});

test('racha de victorias', async () => {
  const { applyWin, EMPTY_STATS } = await import('./storage');
  let s = applyWin(EMPTY_STATS, '2026-09-23', true);
  s = applyWin(s, '2026-09-24', false);
  assert.equal(s.currentStreak, 2);
  assert.equal(applyWin(s, '2026-09-24', true), s);
  s = applyWin(s, '2026-09-27', true);
  assert.deepEqual([s.currentStreak, s.maxStreak, s.wins, s.cleanWins], [1, 2, 3, 2]);
});
