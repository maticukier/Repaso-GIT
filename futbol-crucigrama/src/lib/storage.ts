import AsyncStorage from '@react-native-async-storage/async-storage';

import { daysBetween, type Level } from './daily';

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

// El nivel fácil usa las claves originales para conservar el progreso guardado.
const progressKey = (day: string, level: Level) =>
  level === 'facil' ? `progress:${day}` : `progress:${level}:${day}`;
const statsKey = (level: Level) => (level === 'facil' ? 'stats' : `stats:${level}`);

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

export const loadProgress = (day: string, level: Level) =>
  readJson<Progress>(progressKey(day, level));
export const saveProgress = (day: string, level: Level, progress: Progress) =>
  writeJson(progressKey(day, level), progress);

// La racha se corta si el último crucigrama ganado no fue ni hoy ni ayer.
export async function loadStats(today: string, level: Level): Promise<Stats> {
  const stats = { ...EMPTY_STATS, ...(await readJson<Stats>(statsKey(level))) };
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

export async function recordWin(day: string, level: Level, clean: boolean): Promise<Stats> {
  const stats = applyWin(await loadStats(day, level), day, clean);
  await writeJson(statsKey(level), stats);
  return stats;
}

// "Adiviná el crack"

export type WordleProgress = {
  guesses: string[];
  finished: boolean;
  won: boolean;
};

export type WordleStats = {
  played: number;
  wins: number;
  currentStreak: number;
  maxStreak: number;
  lastWinDate: string | null;
  // distribution[i] = partidas ganadas en i + 1 intentos
  distribution: number[];
};

export const EMPTY_WORDLE_STATS: WordleStats = {
  played: 0,
  wins: 0,
  currentStreak: 0,
  maxStreak: 0,
  lastWinDate: null,
  distribution: [0, 0, 0, 0, 0, 0],
};

const WORDLE_STATS_KEY = 'stats:adivina';

export const loadWordleProgress = (day: string) => readJson<WordleProgress>(`adivina:${day}`);
export const saveWordleProgress = (day: string, progress: WordleProgress) =>
  writeJson(`adivina:${day}`, progress);

// Las estadísticas con intentos sirven para Adiviná el crack y para ¿Quién es la carta?.
export async function loadWordleStats(
  today: string,
  key: string = WORDLE_STATS_KEY,
): Promise<WordleStats> {
  const stats = { ...EMPTY_WORDLE_STATS, ...(await readJson<WordleStats>(key)) };
  if (stats.lastWinDate && daysBetween(stats.lastWinDate, today) > 1) stats.currentStreak = 0;
  return stats;
}

export function applyWordleResult(
  stats: WordleStats,
  day: string,
  won: boolean,
  attempts: number,
): WordleStats {
  if (!won) return { ...stats, played: stats.played + 1, currentStreak: 0 };
  const continues = stats.lastWinDate !== null && daysBetween(stats.lastWinDate, day) === 1;
  const currentStreak = continues ? stats.currentStreak + 1 : 1;
  const distribution = stats.distribution.slice();
  distribution[attempts - 1]++;
  return {
    played: stats.played + 1,
    wins: stats.wins + 1,
    currentStreak,
    maxStreak: Math.max(stats.maxStreak, currentStreak),
    lastWinDate: day,
    distribution,
  };
}

export async function recordWordleResult(
  day: string,
  won: boolean,
  attempts: number,
  key: string = WORDLE_STATS_KEY,
) {
  const stats = applyWordleResult(await loadWordleStats(day, key), day, won, attempts);
  await writeJson(key, stats);
  return stats;
}

// "¿Quién es la carta?"

export type CartaProgress = {
  guesses: number[]; // ids de los jugadores elegidos
  finished: boolean;
  won: boolean;
};

export const CARTA_STATS_KEY = 'stats:cartas';
export const loadCartaProgress = (day: string) => readJson<CartaProgress>(`cartas:${day}`);
export const saveCartaProgress = (day: string, progress: CartaProgress) =>
  writeJson(`cartas:${day}`, progress);
