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
  a: number[]; // ids de los jugadores válidos (se muestran al revelar)
  // Otros que también cuentan aunque no se listen; por ejemplo, alguien con
  // doble nacionalidad que jugó para otra selección.
  x?: number[];
};

const CATEGORIAS = data.c as Categoria[];

export const ROUNDS = 5;
export const MAX_POINTS = 100;

// Puntos relativos a cada categoría: se ordenan los valores de "fama" (en cuántas
// Wikipedias tiene artículo cada jugador) de las respuestas válidas; el más conocido
// vale 10, el menos conocido vale 100 y el resto se reparte en el medio, de a 10.
// Así cada categoría tiene siempre al menos una respuesta de 100.
const scales = new WeakMap<Categoria, number[]>();

function scaleOf(categoria: Categoria) {
  let scale = scales.get(categoria);
  if (!scale) {
    scale = [...new Set(categoria.a.map((id) => getJugador(id).fame))].sort((x, y) => y - x);
    scales.set(categoria, scale);
  }
  return scale;
}

export function pointsInCategoria(categoria: Categoria, fame: number) {
  const scale = scaleOf(categoria);
  if (scale.length <= 1) return MAX_POINTS;
  // Cuántos valores de fama de la lista son mayores: 0 = el más conocido.
  const above = scale.filter((f) => f > fame).length;
  const share = Math.min(1, above / (scale.length - 1));
  return Math.round((10 + 90 * share) / 10) * 10;
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

// Palabras que identifican una categoría: la nacionalidad ("Croatas") y los clubes o torneos.
function topics(c: Categoria) {
  const t = c.t.toLowerCase();
  const out = [t.split(' ')[0]];
  for (const m of t.matchAll(/(?:por|en|al|a la) (?:el |la )?([^,]+?)(?= y por|$)/g)) out.push(m[1]);
  return out;
}

function clashes(id: number, picked: number[]) {
  if (picked.includes(id)) return true;
  const mine = topics(CATEGORIAS[id]);
  return picked.some((p) => topics(CATEGORIAS[p]).some((x) => mine.includes(x)));
}

export function getDailyCategorias(day: string): Categoria[] {
  const n = puzzleNumber(day) - 1;
  const picked: number[] = [];
  for (const [group, perDay, offset] of PLAN) {
    const queue = QUEUES[group].length ? QUEUES[group] : QUEUES.nac;
    let pos = n * perDay + offset;
    let id = queue[((pos % queue.length) + queue.length) % queue.length];
    // Si se repite la categoría, la nacionalidad o el club con otra del mismo día, tomamos la siguiente.
    let tries = 0;
    while (tries++ < queue.length && clashes(id, picked)) {
      // Salto grande, para no pisar las categorías de los días siguientes.
      pos += 97;
      id = queue[((pos % queue.length) + queue.length) % queue.length];
    }
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

export function isValid(categoria: Categoria, jugadorId: number) {
  return categoria.a.includes(jugadorId) || (categoria.x ?? []).includes(jugadorId);
}

// Puntos de una respuesta: 0 si no es válida para la categoría.
export function scoreAnswer(categoria: Categoria, jugadorId: number | null) {
  if (jugadorId === null || !isValid(categoria, jugadorId)) return 0;
  return pointsInCategoria(categoria, getJugador(jugadorId).fame);
}

// Respuestas válidas ordenadas de la más valiosa a la más obvia.
export function rankedAnswers(categoria: Categoria) {
  return categoria.a
    .map((id) => {
      const jugador = getJugador(id);
      return { jugador, points: pointsInCategoria(categoria, jugador.fame) };
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
