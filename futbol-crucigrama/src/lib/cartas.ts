import data from '../data/fifa-cards.json';
import { puzzleNumber } from './daily';
import { createRng, shuffle } from './random';

// "¿Quién es la carta?": adiviná el jugador por su carta de FIFA 14 a FC 26.
// Datos de SoFIFA vía github.com/mzafram2001/ea-fc (MIT), generados con
// scripts/build-fifa-data.py.

export type Card = {
  v: number; // edición: 14 = FIFA 14, 24 = FC 24
  club: string;
  pos: string;
  ovr: number;
  s: number[]; // ritmo, tiro, pase, regate, defensa, físico (o stats de arquero)
};

export type CardPlayer = {
  id: number;
  name: string;
  nat: string;
  cards: Card[];
};

type SearchEntry = [id: number, name: string, nat: string];

const ANSWERS = data.answers as CardPlayer[];
const SEARCH = data.search as SearchEntry[];

export const MAX_CARD_GUESSES = 6;

export const FIELD_STATS = ['RIT', 'TIR', 'PAS', 'REG', 'DEF', 'FÍS'];
export const GK_STATS = ['EST', 'PAR', 'SAQ', 'REF', 'VEL', 'COL'];

export function editionLabel(v: number) {
  return v >= 24 ? `FC ${v}` : `FIFA ${v}`;
}

const POSITIONS: Record<string, [string, string]> = {
  GK: ['POR', 'Arquero'],
  CB: ['DFC', 'Defensor central'],
  LB: ['LI', 'Lateral izquierdo'],
  RB: ['LD', 'Lateral derecho'],
  LWB: ['CAI', 'Carrilero izquierdo'],
  RWB: ['CAD', 'Carrilero derecho'],
  CDM: ['MCD', 'Mediocampista defensivo'],
  CM: ['MC', 'Mediocampista central'],
  CAM: ['MCO', 'Mediapunta'],
  LM: ['MI', 'Volante izquierdo'],
  RM: ['MD', 'Volante derecho'],
  LW: ['EI', 'Extremo izquierdo'],
  RW: ['ED', 'Extremo derecho'],
  CF: ['SD', 'Segundo delantero'],
  ST: ['DC', 'Delantero centro'],
};

export function positionLabel(pos: string): [string, string] {
  return POSITIONS[pos] ?? [pos, pos];
}

// Nombre en español y código ISO para armar la bandera.
const NATIONS: Record<string, [string, string]> = {
  Albania: ['Albania', 'AL'],
  Algeria: ['Argelia', 'DZ'],
  Argentina: ['Argentina', 'AR'],
  Armenia: ['Armenia', 'AM'],
  Australia: ['Australia', 'AU'],
  Austria: ['Austria', 'AT'],
  Belgium: ['Bélgica', 'BE'],
  'Bosnia and Herzegovina': ['Bosnia y Herzegovina', 'BA'],
  Brazil: ['Brasil', 'BR'],
  Bulgaria: ['Bulgaria', 'BG'],
  'Burkina Faso': ['Burkina Faso', 'BF'],
  'Cabo Verde': ['Cabo Verde', 'CV'],
  Cameroon: ['Camerún', 'CM'],
  Canada: ['Canadá', 'CA'],
  'Central African Republic': ['República Centroafricana', 'CF'],
  Chile: ['Chile', 'CL'],
  Colombia: ['Colombia', 'CO'],
  'Congo DR': ['RD del Congo', 'CD'],
  'Costa Rica': ['Costa Rica', 'CR'],
  Croatia: ['Croacia', 'HR'],
  Czechia: ['Chequia', 'CZ'],
  "Côte d'Ivoire": ['Costa de Marfil', 'CI'],
  Denmark: ['Dinamarca', 'DK'],
  'Dominican Republic': ['República Dominicana', 'DO'],
  Ecuador: ['Ecuador', 'EC'],
  Egypt: ['Egipto', 'EG'],
  England: ['Inglaterra', 'ENG'],
  Finland: ['Finlandia', 'FI'],
  France: ['Francia', 'FR'],
  Gabon: ['Gabón', 'GA'],
  Gambia: ['Gambia', 'GM'],
  Georgia: ['Georgia', 'GE'],
  Germany: ['Alemania', 'DE'],
  Ghana: ['Ghana', 'GH'],
  Greece: ['Grecia', 'GR'],
  Guadeloupe: ['Guadalupe', 'GP'],
  Guinea: ['Guinea', 'GN'],
  'Guinea-Bissau': ['Guinea-Bisáu', 'GW'],
  Hungary: ['Hungría', 'HU'],
  Iceland: ['Islandia', 'IS'],
  Iran: ['Irán', 'IR'],
  Israel: ['Israel', 'IL'],
  Italy: ['Italia', 'IT'],
  Jamaica: ['Jamaica', 'JM'],
  Japan: ['Japón', 'JP'],
  Kenya: ['Kenia', 'KE'],
  'Korea Republic': ['Corea del Sur', 'KR'],
  Kosovo: ['Kosovo', 'XK'],
  Libya: ['Libia', 'LY'],
  Mali: ['Malí', 'ML'],
  Mexico: ['México', 'MX'],
  Montenegro: ['Montenegro', 'ME'],
  Morocco: ['Marruecos', 'MA'],
  Mozambique: ['Mozambique', 'MZ'],
  Netherlands: ['Países Bajos', 'NL'],
  'New Zealand': ['Nueva Zelanda', 'NZ'],
  Nigeria: ['Nigeria', 'NG'],
  'North Macedonia': ['Macedonia del Norte', 'MK'],
  'Northern Ireland': ['Irlanda del Norte', 'NIR'],
  Norway: ['Noruega', 'NO'],
  Paraguay: ['Paraguay', 'PY'],
  Peru: ['Perú', 'PE'],
  Poland: ['Polonia', 'PL'],
  Portugal: ['Portugal', 'PT'],
  'Republic of Ireland': ['Irlanda', 'IE'],
  Romania: ['Rumania', 'RO'],
  Russia: ['Rusia', 'RU'],
  'Saudi Arabia': ['Arabia Saudita', 'SA'],
  Scotland: ['Escocia', 'SCT'],
  Senegal: ['Senegal', 'SN'],
  Serbia: ['Serbia', 'RS'],
  Slovakia: ['Eslovaquia', 'SK'],
  Slovenia: ['Eslovenia', 'SI'],
  'South Africa': ['Sudáfrica', 'ZA'],
  Spain: ['España', 'ES'],
  Sweden: ['Suecia', 'SE'],
  Switzerland: ['Suiza', 'CH'],
  Syria: ['Siria', 'SY'],
  Togo: ['Togo', 'TG'],
  Tunisia: ['Túnez', 'TN'],
  Türkiye: ['Turquía', 'TR'],
  Ukraine: ['Ucrania', 'UA'],
  'United States': ['Estados Unidos', 'US'],
  Uruguay: ['Uruguay', 'UY'],
  Uzbekistan: ['Uzbekistán', 'UZ'],
  Venezuela: ['Venezuela', 'VE'],
  Wales: ['Gales', 'WLS'],
};

const SUBDIVISIONS: Record<string, string> = {
  ENG: 'gb-eng',
  SCT: 'gb-sct',
  WLS: 'gb-wls',
  NIR: 'gb-nir',
};

// `flag` es el código de la imagen en src/data/flags.ts.
export function nationLabel(nat: string): { name: string; flag: string | null } {
  const entry = NATIONS[nat];
  if (!entry) return { name: nat, flag: null };
  const [name, code] = entry;
  return { name, flag: SUBDIVISIONS[code] ?? code.toLowerCase() };
}

// Cada día un jugador distinto (sin repetir hasta dar la vuelta) y una
// de sus cartas al azar.
const ORDER = shuffle(ANSWERS, createRng('futbolero:cartas'));

export type DailyCard = {
  player: CardPlayer;
  card: Card;
  // Orden en que se van mostrando los stats.
  statOrder: number[];
};

export function getDailyCard(day: string): DailyCard {
  const n = ORDER.length;
  const player = ORDER[(((puzzleNumber(day) - 1) % n) + n) % n];
  const rng = createRng(`futbolero:cartas:${day}`);
  const card = player.cards[Math.floor(rng() * player.cards.length)];
  const statOrder = shuffle([0, 1, 2, 3, 4, 5], rng);
  return { player, card, statOrder };
}

export function answerCount() {
  return ORDER.length;
}

// Qué se ve de la carta según la cantidad de intentos fallidos.
export function revealed(misses: number, finished: boolean) {
  if (finished) return { stats: 6, nation: true, position: true, overall: true };
  return {
    stats: misses >= 4 ? 6 : misses >= 3 ? 4 : 2,
    nation: misses >= 1,
    position: misses >= 2,
    overall: misses >= 5,
  };
}

// Pista que se acaba de desbloquear con el último error.
export const NEW_CLUE = [
  '',
  'Nueva pista: nacionalidad',
  'Nueva pista: posición',
  'Nueva pista: 2 stats más',
  'Nueva pista: todos los stats',
  'Última pista: la media',
];

export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

// Busca por nombre sin importar tildes; primero los que empiezan igual.
export function searchPlayers(query: string, limit = 8): { id: number; name: string; nat: string }[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const starts: SearchEntry[] = [];
  const contains: SearchEntry[] = [];
  for (const entry of SEARCH) {
    const name = normalize(entry[1]);
    if (name.startsWith(q) || name.split(' ').some((w) => w.startsWith(q))) starts.push(entry);
    else if (name.includes(q)) contains.push(entry);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains]
    .slice(0, limit)
    .map(([id, name, nat]) => ({ id, name, nat }));
}

export function playerName(id: number) {
  return SEARCH.find((e) => e[0] === id)?.[1] ?? '?';
}

export function cartaShareText(num: number, guesses: number[], answerId: number, won: boolean) {
  const row = guesses.map((g) => (g === answerId ? '🟩' : '🟥')).join('');
  const score = won ? `${guesses.length}/${MAX_CARD_GUESSES}` : `X/${MAX_CARD_GUESSES}`;
  return `¿Quién es la carta? #${num} ${score}\n${row}`;
}
