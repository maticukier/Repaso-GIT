import { WORDS } from '../data/words';
import { generatePuzzle, type Puzzle } from './generator';
import { createRng } from './random';

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

export function getDailyPuzzle(key: string = dateKey()): Puzzle {
  let puzzle = cache.get(key);
  if (!puzzle) {
    puzzle = generatePuzzle(WORDS, createRng(`futbol-crucigrama:${key}`));
    cache.set(key, puzzle);
  }
  return puzzle;
}
