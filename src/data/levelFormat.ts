/**
 * Formato de nivel (JSON en src/data/levels/level-NN.json) y su conversión a
 * las definiciones que usan las entidades. Este módulo es TypeScript puro
 * (sin Phaser) para que lo compartan el juego y el validador de niveles.
 *
 * Ejemplo mínimo:
 * {
 *   "name": "Primer disparo",
 *   "tower": { "hp": 40 },
 *   "ammo": { "total": 80 },
 *   "gates": [
 *     { "x": 360, "y": 700, "width": 200, "type": "mul", "value": 2 },
 *     { "x": 360, "y": 500, "width": 170, "type": "mul", "value": 3,
 *       "move": { "minX": 190, "maxX": 530, "speed": 120 } },
 *     { "x": 200, "y": 380, "width": 160, "type": "add", "value": 25,
 *       "change": { "mode": "wear", "every": 5,
 *                   "to": [{ "type": "add", "value": 10 }, { "type": "add", "value": -5 }] } }
 *   ],
 *   "enemies": [
 *     { "type": "static", "x": 360, "y": 775, "radius": 36, "hp": 60 },
 *     { "type": "patrol", "x": 200, "y": 510, "radius": 30, "hp": 45,
 *       "patrol": { "minX": 140, "maxX": 580, "speed": 170 } }
 *   ]
 * }
 */
import { LANE } from './tuning';

// ---------------------------------------------------------------- runtime

export interface GateValue {
  op: 'mul' | 'add';
  /** mul: x2, x3. add: +10, +25, -5. */
  n: number;
}

/**
 * - upgrade: mejora a medida que le disparás (cada minion que la cruza suma).
 * - wear: se gasta a medida que pasan minions.
 * Ambas recorren `values` en orden cada `hitsPerStep` cruces.
 */
export type GateDynamic = 'none' | 'upgrade' | 'wear';

export interface MoveDef {
  minX: number;
  maxX: number;
  speed: number;
}

export interface GateDef {
  x: number;
  y: number;
  width: number;
  values: readonly GateValue[];
  dynamic: GateDynamic;
  hitsPerStep: number;
  /** Movimiento horizontal ida y vuelta (arranca hacia la derecha). */
  move?: MoveDef;
}

/**
 * - static: quieto.
 * - patrol: va y viene en horizontal.
 * - brute (jefe): grande y regenera vida si no lo presionás.
 * - orbiter (jefe): gira alrededor de un punto.
 */
export type EnemyKind = 'static' | 'patrol' | 'brute' | 'orbiter';

export interface EnemyDef {
  kind: EnemyKind;
  x: number;
  y: number;
  radius: number;
  /** Cada minion que lo toca muere y le saca 1 de HP. */
  hp: number;
  patrol?: MoveDef;
  /** HP/s que recupera (brute). */
  regenPerSec: number;
  /** Órbita alrededor de (x, y): radio en px y velocidad en rad/s (orbiter). */
  orbit?: { radius: number; speed: number; phase: number };
}

export interface AmmoDef {
  /** Disparos totales del nivel. */
  total: number;
  /** Tamaño del cargador (la barra). */
  magazine: number;
  regenPerSec: number;
}

export interface LevelDef {
  /** 1-based. */
  number: number;
  name: string;
  boss: boolean;
  tower: { hp: number; lineY: number };
  ammo: AmmoDef;
  /** Fracción de munición sobrante para 2 y 3 estrellas. */
  stars: { two: number; three: number };
  gates: GateDef[];
  enemies: EnemyDef[];
}

// ------------------------------------------------------------------- json

export interface GateValueJson {
  type: 'mul' | 'add';
  value: number;
}

export interface GateJson extends GateValueJson {
  x: number;
  y: number;
  width: number;
  move?: MoveDef;
  change?: { mode: 'upgrade' | 'wear'; every: number; to: GateValueJson[] };
}

export interface EnemyJson {
  type: EnemyKind;
  x: number;
  y: number;
  radius: number;
  hp: number;
  patrol?: MoveDef;
  regenPerSec?: number;
  orbit?: { radius: number; speed: number; phase?: number };
}

export interface LevelJson {
  name: string;
  boss?: boolean;
  tower: { hp: number };
  ammo: { total: number; magazine?: number; regenPerSec?: number };
  stars?: { two: number; three: number };
  gates?: GateJson[];
  enemies?: EnemyJson[];
}

export const LEVEL_DEFAULTS = {
  magazine: 40,
  regenPerSec: 7,
  stars: { two: 0.15, three: 0.35 },
  towerLineY: 250,
  bossTowerLineY: 300,
} as const;

/** Zona jugable entre la torre y el cañón (y de puertas/enemigos). */
const MIN_Y = 300;
const MAX_Y = 960;

const GATE_VALUES: Record<'mul' | 'add', readonly number[]> = {
  mul: [2, 3],
  add: [10, 25, -5],
};

class LevelError extends Error {}

function fail(where: string, msg: string): never {
  throw new LevelError(`${where}: ${msg}`);
}

function num(v: unknown, where: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(where, `debe ser un número (vino ${JSON.stringify(v)})`);
  if (v < min || v > max) fail(where, `${v} fuera de rango [${min}, ${max}]`);
  return v;
}

function gateValue(v: GateValueJson, where: string): GateValue {
  const allowed = GATE_VALUES[v.type];
  if (!allowed) fail(where, `type "${v.type}" inválido (mul | add)`);
  if (!allowed.includes(v.value)) fail(where, `valor ${v.value} inválido para ${v.type} (${allowed.join(', ')})`);
  return { op: v.type, n: v.value };
}

function move(m: MoveDef, where: string, halfWidth: number): MoveDef {
  const minX = num(m.minX, `${where}.minX`, LANE.left + halfWidth, LANE.right - halfWidth);
  const maxX = num(m.maxX, `${where}.maxX`, minX, LANE.right - halfWidth);
  return { minX, maxX, speed: num(m.speed, `${where}.speed`, 10, 600) };
}

function parseGate(g: GateJson, where: string): GateDef {
  const width = num(g.width, `${where}.width`, 60, LANE.right - LANE.left);
  const half = width / 2;
  const x = num(g.x, `${where}.x`, LANE.left + half, LANE.right - half);
  const values = [gateValue(g, where)];
  let dynamic: GateDynamic = 'none';
  let hitsPerStep = 0;
  if (g.change) {
    if (g.change.mode !== 'upgrade' && g.change.mode !== 'wear') fail(`${where}.change.mode`, 'upgrade | wear');
    if (!Array.isArray(g.change.to) || g.change.to.length === 0) fail(`${where}.change.to`, 'lista vacía');
    dynamic = g.change.mode;
    hitsPerStep = num(g.change.every, `${where}.change.every`, 1, 500);
    g.change.to.forEach((v, i) => values.push(gateValue(v, `${where}.change.to[${i}]`)));
  }
  return {
    x,
    y: num(g.y, `${where}.y`, MIN_Y, MAX_Y),
    width,
    values,
    dynamic,
    hitsPerStep,
    move: g.move ? move(g.move, `${where}.move`, half) : undefined,
  };
}

function parseEnemy(e: EnemyJson, where: string): EnemyDef {
  const kinds: EnemyKind[] = ['static', 'patrol', 'brute', 'orbiter'];
  if (!kinds.includes(e.type)) fail(`${where}.type`, `"${e.type}" inválido (${kinds.join(' | ')})`);
  const radius = num(e.radius, `${where}.radius`, 12, 90);
  const def: EnemyDef = {
    kind: e.type,
    x: num(e.x, `${where}.x`, LANE.left, LANE.right),
    y: num(e.y, `${where}.y`, MIN_Y, MAX_Y),
    radius,
    hp: Math.round(num(e.hp, `${where}.hp`, 1, 5000)),
    regenPerSec: e.regenPerSec === undefined ? 0 : num(e.regenPerSec, `${where}.regenPerSec`, 0, 100),
  };
  if (e.type === 'patrol') {
    if (!e.patrol) fail(where, 'un patrol necesita "patrol"');
    def.patrol = move(e.patrol, `${where}.patrol`, 0);
  }
  if (e.type === 'orbiter') {
    if (!e.orbit) fail(where, 'un orbiter necesita "orbit"');
    def.orbit = {
      radius: num(e.orbit.radius, `${where}.orbit.radius`, 20, 260),
      speed: num(e.orbit.speed, `${where}.orbit.speed`, -6, 6),
      phase: e.orbit.phase ?? 0,
    };
  }
  return def;
}

/** Valida y convierte un nivel. Tira un error con la ruta exacta del campo inválido. */
export function parseLevel(json: LevelJson, number: number): LevelDef {
  const where = `nivel ${number}`;
  if (typeof json.name !== 'string' || json.name.length === 0) fail(`${where}.name`, 'falta el nombre');
  const boss = json.boss === true;
  const total = Math.round(num(json.ammo?.total, `${where}.ammo.total`, 1, 5000));
  const magazine = Math.round(num(json.ammo.magazine ?? LEVEL_DEFAULTS.magazine, `${where}.ammo.magazine`, 1, total));
  const gates = (json.gates ?? []).map((g, i) => parseGate(g, `${where}.gates[${i}]`));
  if (gates.length > 32) fail(where, 'máximo 32 puertas');
  const stars = json.stars ?? LEVEL_DEFAULTS.stars;
  return {
    number,
    name: json.name,
    boss,
    tower: {
      hp: Math.round(num(json.tower?.hp, `${where}.tower.hp`, 1, 100000)),
      lineY: boss ? LEVEL_DEFAULTS.bossTowerLineY : LEVEL_DEFAULTS.towerLineY,
    },
    ammo: {
      total,
      magazine,
      regenPerSec: num(json.ammo.regenPerSec ?? LEVEL_DEFAULTS.regenPerSec, `${where}.ammo.regenPerSec`, 0.5, 60),
    },
    stars: {
      two: num(stars.two, `${where}.stars.two`, 0, 1),
      three: num(stars.three, `${where}.stars.three`, stars.two, 1),
    },
    gates,
    enemies: (json.enemies ?? []).map((e, i) => parseEnemy(e, `${where}.enemies[${i}]`)),
  };
}

/** Estrellas según la fracción de munición que sobró al ganar. */
export function starsFor(level: LevelDef, ammoLeftFraction: number): number {
  if (ammoLeftFraction >= level.stars.three) return 3;
  if (ammoLeftFraction >= level.stars.two) return 2;
  return 1;
}
