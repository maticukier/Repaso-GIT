/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getDailyWord, keyboardStatuses, poolSize, scoreGuess, wordleShareText } from './wordle';

test('colorea aciertos, presentes y ausentes', () => {
  assert.deepEqual(scoreGuess('MESSI', 'MESSI'), Array(5).fill('correct'));
  assert.deepEqual(scoreGuess('SALAH', 'MESSI'), ['present', 'absent', 'absent', 'absent', 'absent']);
});

test('respeta las letras repetidas', () => {
  // TEVEZ tiene dos E; en VERON solo hay una.
  assert.deepEqual(scoreGuess('TEVEZ', 'VERON'), ['absent', 'correct', 'present', 'absent', 'absent']);
  // La segunda S de SSSSS solo cuenta donde hay S en MESSI.
  assert.deepEqual(scoreGuess('SSSSS', 'MESSI'), ['absent', 'absent', 'correct', 'correct', 'absent']);
});

test('el teclado se queda con el mejor estado de cada letra', () => {
  const s = keyboardStatuses(['SALAH', 'MESSI'], 'MESSI');
  assert.equal(s.S, 'correct');
  assert.equal(s.A, 'absent');
});

test('una palabra distinta por día sin repetir hasta dar la vuelta', () => {
  const seen = new Set<string>();
  for (let i = 0; i < poolSize(); i++) {
    const day = new Date(Date.UTC(2026, 8, 23 + i)).toISOString().slice(0, 10);
    const { answer } = getDailyWord(day);
    assert.match(answer, /^[A-Z]{5,7}$/);
    assert.ok(!seen.has(answer), `repetida: ${answer}`);
    seen.add(answer);
  }
  assert.equal(getDailyWord('2026-10-01').answer, getDailyWord('2026-10-01').answer);
});

test('texto para compartir', () => {
  assert.equal(
    wordleShareText(3, ['SALAH', 'MESSI'], 'MESSI', true),
    'Adiviná el crack #3 2/6\n🟨⬛⬛⬛⬛\n🟩🟩🟩🟩🟩',
  );
});

test('estadísticas de Adiviná el crack', async () => {
  const { applyWordleResult, EMPTY_WORDLE_STATS } = await import('./storage');
  let s = applyWordleResult(EMPTY_WORDLE_STATS, '2026-09-23', true, 3);
  s = applyWordleResult(s, '2026-09-24', true, 5);
  assert.deepEqual([s.currentStreak, s.wins, s.distribution], [2, 2, [0, 0, 1, 0, 1, 0]]);
  s = applyWordleResult(s, '2026-09-25', false, 6);
  assert.deepEqual([s.currentStreak, s.maxStreak, s.played], [0, 2, 3]);
  assert.equal(EMPTY_WORDLE_STATS.distribution[2], 0);
});
