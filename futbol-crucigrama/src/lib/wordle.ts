import { WORDS, type WordEntry } from '../data/words';
import { WORDS_MEDIO } from '../data/words-medio';
import { puzzleNumber } from './daily';
import { createRng, shuffle } from './random';

export const MAX_GUESSES = 6;
// A partir de este intento fallido se muestra la pista.
export const HINT_AFTER = 3;

export type LetterStatus = 'correct' | 'present' | 'absent';

// Palabras de 5 a 7 letras de los niveles fácil y medio.
const POOL: WordEntry[] = shuffle(
  [...WORDS, ...WORDS_MEDIO].filter((w) => w.answer.length >= 5 && w.answer.length <= 7),
  createRng('futbolero:adivina'),
);

// Recorre la lista mezclada día por día, así no se repite hasta dar la vuelta.
export function getDailyWord(day: string): WordEntry {
  const index = (((puzzleNumber(day) - 1) % POOL.length) + POOL.length) % POOL.length;
  return POOL[index];
}

export function poolSize() {
  return POOL.length;
}

// Colorea un intento como en Wordle, respetando letras repetidas.
export function scoreGuess(guess: string, answer: string): LetterStatus[] {
  const result: LetterStatus[] = Array(guess.length).fill('absent');
  const remaining: Record<string, number> = {};
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) result[i] = 'correct';
    else remaining[answer[i]] = (remaining[answer[i]] ?? 0) + 1;
  }
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === 'correct') continue;
    if (remaining[guess[i]]) {
      result[i] = 'present';
      remaining[guess[i]]--;
    }
  }
  return result;
}

const RANK: Record<LetterStatus, number> = { absent: 0, present: 1, correct: 2 };

// El mejor estado conocido de cada letra, para pintar el teclado.
export function keyboardStatuses(guesses: string[], answer: string) {
  const statuses: Record<string, LetterStatus> = {};
  for (const guess of guesses) {
    scoreGuess(guess, answer).forEach((status, i) => {
      const prev = statuses[guess[i]];
      if (!prev || RANK[status] > RANK[prev]) statuses[guess[i]] = status;
    });
  }
  return statuses;
}

const EMOJI: Record<LetterStatus, string> = { correct: '🟩', present: '🟨', absent: '⬛' };

export function wordleShareText(num: number, guesses: string[], answer: string, won: boolean) {
  const rows = guesses.map((g) => scoreGuess(g, answer).map((s) => EMOJI[s]).join(''));
  const score = won ? `${guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  return `Adiviná el crack #${num} ${score}\n${rows.join('\n')}`;
}
