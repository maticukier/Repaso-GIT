import data from '../data/rankings.json';
import { puzzleNumber } from './daily';
import { getJugador, type Jugador } from './jugadores';
import { createRng, shuffle } from './random';

// "Ranking": cada día 5 preguntas del tipo "¿quién es el goleador histórico
// n.º 28 del Manchester United?". Nombrás un jugador y sumás más puntos cuanto
// más cerca del puesto pedido esté.

export type Lista = {
  id: string;
  t: string; // título: "Goleadores históricos del Manchester United"
  q: string; // pregunta con {n}: "el goleador histórico n.º {n} del Manchester United"
  u: string; // unidad: "goles" | "partidos"
  targets: number[]; // puestos por los que se puede preguntar
  r: [jugador: number, valor: number][]; // ranking, de mayor a menor
};

const LISTAS = data.l as Lista[];

export const RANKING_ROUNDS = 5;
export const RANKING_MAX = 100;
// Puntos según a cuántos puestos quedaste del pedido.
const BY_DISTANCE = [100, 85, 70, 60, 50, 40, 32, 26, 20, 16, 12];
const IN_LIST = 5;

export type Puesto = { jugador: Jugador; value: number; from: number; to: number };

// Puestos con empates: si dos jugadores tienen los mismos goles comparten el
// rango (por ejemplo, ambos ocupan los puestos 12 y 13).
export function standings(lista: Lista): Puesto[] {
  const rows = lista.r;
  return rows.map(([id, value]) => {
    const from = rows.findIndex((r) => r[1] === value) + 1;
    let to = from;
    while (to < rows.length && rows[to][1] === value) to++;
    return { jugador: getJugador(id), value, from, to };
  });
}

export function distanceTo(puesto: Puesto, target: number) {
  if (target >= puesto.from && target <= puesto.to) return 0;
  return Math.min(Math.abs(puesto.from - target), Math.abs(puesto.to - target));
}

export type RankingScore = { points: number; puesto: Puesto | null; distance: number | null };

export function scoreGuess(lista: Lista, target: number, jugadorId: number | null): RankingScore {
  if (jugadorId === null) return { points: 0, puesto: null, distance: null };
  const puesto = standings(lista).find((p) => p.jugador.id === jugadorId) ?? null;
  if (!puesto) return { points: 0, puesto: null, distance: null };
  const distance = distanceTo(puesto, target);
  return { points: BY_DISTANCE[distance] ?? IN_LIST, puesto, distance };
}

export function correctAnswers(lista: Lista, target: number) {
  return standings(lista).filter((p) => distanceTo(p, target) === 0);
}

// "7.º", o "=11.º" cuando comparte el puesto con otros.
export function puestoLabel(p: Puesto) {
  return p.from === p.to ? `${p.from}.º` : `=${p.from}.º`;
}

export type Pregunta = { lista: Lista; target: number; text: string };

// Franja de dificultad de cada ronda: la primera pregunta es de los primeros
// puestos y las últimas, de bien abajo en la tabla.
const BANDS: [min: number, max: number][] = [
  [1, 5],
  [3, 10],
  [6, 15],
  [10, 22],
  [15, 30],
];

export function getDailyPreguntas(day: string): Pregunta[] {
  const rng = createRng(`futbolero:ranking:${day}`);
  // Rotamos las listas día a día para que no se repitan seguido.
  const order = shuffle(LISTAS, createRng('futbolero:ranking:listas'));
  const start = (((puzzleNumber(day) - 1) * RANKING_ROUNDS) % order.length + order.length) % order.length;
  return BANDS.map(([min, max], i) => {
    const lista = order[(start + i) % order.length];
    let options = lista.targets.filter((t) => t >= min && t <= max);
    if (!options.length) options = lista.targets;
    const target = options[Math.floor(rng() * options.length)];
    return { lista, target, text: `¿Quién es ${lista.q.replace('{n}', String(target))}?` };
  });
}

export function allListas() {
  return LISTAS;
}

export function distanceEmoji(score: RankingScore) {
  if (score.distance === 0) return '🎯';
  if (score.distance === null) return '⬛';
  if (score.distance <= 2) return '🟩';
  if (score.distance <= 5) return '🟨';
  return '🟧';
}

export function rankingShareText(num: number, scores: RankingScore[]) {
  const total = scores.reduce((a, s) => a + s.points, 0);
  return `Ranking futbolero #${num}: ${total}/${RANKING_ROUNDS * RANKING_MAX}\n${scores.map(distanceEmoji).join('')}`;
}
