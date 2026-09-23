import { WORDS, type WordEntry } from '../data/words';
import { WORDS_DIFICIL } from '../data/words-dificil';
import { WORDS_MEDIO } from '../data/words-medio';
import { generatePuzzle, type GeneratorOptions, type Puzzle } from './generator';
import { createRng } from './random';

export type Level = 'facil' | 'medio' | 'dificil';

type LevelConfig = {
  id: Level;
  label: string;
  bank: WordEntry[];
  options: Partial<GeneratorOptions>;
  seed: string;
};

export const LEVELS: LevelConfig[] = [
  // El fácil conserva la semilla original para no cambiar los crucigramas ya publicados.
  { id: 'facil', label: 'Fácil', bank: WORDS, options: {}, seed: 'futbol-crucigrama' },
  {
    id: 'medio',
    label: 'Medio',
    bank: WORDS_MEDIO,
    options: { targetWords: 11 },
    seed: 'futbol-crucigrama:medio',
  },
  {
    id: 'dificil',
    label: 'Difícil',
    bank: WORDS_DIFICIL,
    options: { maxSize: 12, targetWords: 12 },
    seed: 'futbol-crucigrama:dificil',
  },
];

export const levelLabel = (level: Level) => LEVELS.find((l) => l.id === level)!.label;

// Día en que se publicó el crucigrama #1.
const FIRST_DAY = '2026-09-23';
const DAY_MS = 24 * 60 * 60 * 1000;

export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function keyToUtc(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((keyToUtc(toKey) - keyToUtc(fromKey)) / DAY_MS);
}

export function puzzleNumber(key: string): number {
  return daysBetween(FIRST_DAY, key) + 1;
}

export function msUntilNextPuzzle(now: Date = new Date()): number {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return tomorrow.getTime() - now.getTime();
}

const cache = new Map<string, Puzzle>();

export function getDailyPuzzle(key: string = dateKey(), level: Level = 'facil'): Puzzle {
  const cacheKey = `${level}:${key}`;
  let puzzle = cache.get(cacheKey);
  if (!puzzle) {
    const config = LEVELS.find((l) => l.id === level)!;
    puzzle = generatePuzzle(config.bank, createRng(`${config.seed}:${key}`), config.options);
    cache.set(cacheKey, puzzle);
  }
  return puzzle;
}
