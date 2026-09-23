import AsyncStorage from '@react-native-async-storage/async-storage';

import { daysBetween } from './daily';

export type Progress = {
  entries: string[][];
  revealed: string[];
  elapsed: number;
  completed: boolean;
};

export type Stats = {
  wins: number;
  cleanWins: number; // ganados sin revelar letras
  currentStreak: number;
  maxStreak: number;
  lastWinDate: string | null;
};

export const EMPTY_STATS: Stats = {
  wins: 0,
  cleanWins: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastWinDate: null,
};

const PROGRESS_PREFIX = 'progress:';
const STATS_KEY = 'stats';

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Si falla el guardado, el juego sigue funcionando en memoria.
  }
}

export const loadProgress = (day: string) => readJson<Progress>(PROGRESS_PREFIX + day);
export const saveProgress = (day: string, progress: Progress) =>
  writeJson(PROGRESS_PREFIX + day, progress);

// La racha se corta si el último crucigrama ganado no fue ni hoy ni ayer.
export async function loadStats(today: string): Promise<Stats> {
  const stats = { ...EMPTY_STATS, ...(await readJson<Stats>(STATS_KEY)) };
  if (stats.lastWinDate && daysBetween(stats.lastWinDate, today) > 1) {
    stats.currentStreak = 0;
  }
  return stats;
}

export function applyWin(stats: Stats, day: string, clean: boolean): Stats {
  if (stats.lastWinDate === day) return stats;
  const continues = stats.lastWinDate !== null && daysBetween(stats.lastWinDate, day) === 1;
  const currentStreak = continues ? stats.currentStreak + 1 : 1;
  return {
    wins: stats.wins + 1,
    cleanWins: stats.cleanWins + (clean ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    lastWinDate: day,
  };
}

export async function recordWin(day: string, clean: boolean): Promise<Stats> {
  const stats = applyWin(await loadStats(day), day, clean);
  await writeJson(STATS_KEY, stats);
  return stats;
}
