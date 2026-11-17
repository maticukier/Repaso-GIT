import data from '../data/rebuscado.json';
import { puzzleNumber } from './daily';
import { getJugador } from './jugadores';
import { createRng, shuffle } from './random';

// "Rebuscado": cada día 5 categorías (ej. "Argentinos que jugaron en el
// Liverpool"). Das una respuesta por categoría y cuanto menos conocido es el
// jugador, más puntos suma.

export type Categoria = {
  t: string; // consigna
  g: string; // grupo: 'arg' | 'nac' | 'par' | 'tit'
  a: number[]; // ids de los jugadores válidos
};

const CATEGORIAS = data.c as Categoria[];

export const ROUNDS = 5;
export const MAX_POINTS = 100;

// Puntos según en cuántas Wikipedias aparece el jugador (su "fama").
const TIERS: [minFame: number, points: number][] = [
  [90, 10],
  [70, 20],
  [55, 30],
  [42, 40],
  [32, 50],
  [24, 60],
  [17, 70],
  [11, 80],
  [6, 90],
];

export function pointsForFame(fame: number) {
  for (const [min, points] of TIERS) if (fame >= min) return points;
  return MAX_POINTS;
}

export function rarityLabel(points: number) {
  if (points >= 90) return 'Joya oculta';
  if (points >= 70) return 'Rebuscado';
  if (points >= 50) return 'Poco conocido';
  if (points >= 30) return 'Conocido';
  return 'Obvio';
}

// Cada grupo de categorías se recorre en un orden fijo mezclado, así no se
// repite una categoría hasta dar toda la vuelta.
const GROUPS = ['arg', 'nac', 'par', 'tit'] as const;
const QUEUES: Record<string, number[]> = {};
for (const g of GROUPS) {
  const ids = CATEGORIAS.map((c, i) => (c.g === g ? i : -1)).filter((i) => i >= 0);
  QUEUES[g] = shuffle(ids, createRng(`futbolero:rebuscado:${g}`));
}

// Qué grupo y qué posición de su cola toca en cada ronda del día n.
const PLAN: [group: string, perDay: number, offset: number][] = [
  ['arg', 1, 0],
  ['nac', 2, 0],
  ['par', 1, 0],
  ['nac', 2, 1],
  ['tit', 1, 0],
];

export function getDailyCategorias(day: string): Categoria[] {
  const n = puzzleNumber(day) - 1;
  const picked: number[] = [];
  for (const [group, perDay, offset] of PLAN) {
    const queue = QUEUES[group].length ? QUEUES[group] : QUEUES.nac;
    let pos = n * perDay + offset;
    let id = queue[((pos % queue.length) + queue.length) % queue.length];
    // Si justo coincide con otra del mismo día, tomamos la siguiente.
    while (picked.includes(id)) id = queue[(((++pos % queue.length) + queue.length) % queue.length)];
    picked.push(id);
  }
  return picked.map((i) => CATEGORIAS[i]);
}

export function categoriaCount() {
  return CATEGORIAS.length;
}

export function allCategorias() {
  return CATEGORIAS;
}

// Puntos de una respuesta: 0 si no es válida para la categoría.
export function scoreAnswer(categoria: Categoria, jugadorId: number | null) {
  if (jugadorId === null || !categoria.a.includes(jugadorId)) return 0;
  return pointsForFame(getJugador(jugadorId).fame);
}

// Respuestas válidas ordenadas de la más valiosa a la más obvia.
export function rankedAnswers(categoria: Categoria) {
  return categoria.a
    .map((id) => {
      const jugador = getJugador(id);
      return { jugador, points: pointsForFame(jugador.fame) };
    })
    .sort((x, y) => y.points - x.points || x.jugador.fame - y.jugador.fame);
}

const SQUARES: [min: number, emoji: string][] = [
  [90, '🟪'],
  [70, '🟦'],
  [50, '🟩'],
  [30, '🟨'],
  [1, '🟧'],
];

export function pointsEmoji(points: number) {
  for (const [min, emoji] of SQUARES) if (points >= min) return emoji;
  return '⬛';
}

export function rebuscadoShareText(num: number, points: number[]) {
  const total = points.reduce((a, b) => a + b, 0);
  return `Rebuscado #${num}: ${total}/${ROUNDS * MAX_POINTS}\n${points.map(pointsEmoji).join('')}`;
}
