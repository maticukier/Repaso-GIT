import data from '../data/players.json';

// Base de jugadores compartida por Rebuscado y Ranking (datos de Wikidata y
// Wikipedia, generados con scripts/data-tools). Cada jugador se identifica por
// su posición en la lista.

// `alt` es otro nombre con el que se lo puede buscar (su título en Wikipedia en español).
type Row = [name: string, year: number, country: number, fame: number, alt?: string];

const ROWS = data.p as Row[];
const COUNTRIES = data.countries as string[];

export type Jugador = {
  id: number;
  name: string;
  // Año de nacimiento y país, para distinguir homónimos en el buscador.
  year: number | null;
  country: string | null;
  // Cantidad de Wikipedias que tienen artículo del jugador: cuanto más alto, más conocido.
  fame: number;
};

export function getJugador(id: number): Jugador {
  const [name, year, country, fame] = ROWS[id];
  return { id, name, year: year || null, country: country >= 0 ? COUNTRIES[country] : null, fame };
}

export function jugadorCount() {
  return ROWS.length;
}

export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ø/gi, 'o')
    .replace(/ß/g, 'ss')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

let index: string[] | null = null;

function getIndex() {
  // Dos espacios separan el nombre del alternativo, así ambos cuentan como inicio de palabra.
  if (!index) index = ROWS.map((r) => normalize(r[0]) + (r[4] ? '  ' + normalize(r[4]) : ''));
  return index;
}

// Busca por nombre sin importar tildes ni mayúsculas. Primero los que tienen
// una palabra que empieza con lo escrito; dentro de cada grupo, los más conocidos.
export function searchJugadores(query: string, limit = 8, exclude: number[] = []): Jugador[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const names = getIndex();
  // Tres grupos: coincide el inicio de una palabra del nombre, del nombre
  // alternativo, o aparece en el medio de una palabra.
  const groups: number[][] = [[], [], []];
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    let at = name.indexOf(q);
    if (at < 0 || exclude.includes(i)) continue;
    const altStart = name.indexOf('  ');
    let group = 2;
    while (at >= 0) {
      if (at === 0 || name[at - 1] === ' ') {
        const inAlt = altStart >= 0 && at > altStart;
        group = Math.min(group, inAlt ? 1 : 0);
      }
      at = name.indexOf(q, at + 1);
    }
    groups[group].push(i);
  }
  const byFame = (a: number, b: number) => ROWS[b][3] - ROWS[a][3];
  return groups
    .flatMap((g) => g.sort(byFame))
    .slice(0, limit)
    .map(getJugador);
}

// Texto corto para distinguir homónimos: "Argentina, 1987".
export function jugadorDetail(j: Jugador) {
  return [j.country, j.year].filter(Boolean).join(', ');
}
