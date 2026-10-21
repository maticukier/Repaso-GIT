/**
 * Simulación simplificada de un nivel, para el validador.
 *
 * Modelo ("paquetes"):
 * - Cada disparo es un paquete que sube en línea recta desde la boca del
 *   cañón a velocidad media constante. Al cruzar una puerta que clona, el
 *   paquete se abre en sub-paquetes a los costados (como el abanico de
 *   clones del juego); sub-paquetes en la misma columna se fusionan. Los
 *   enemigos absorben minions hasta morir; lo que llega a la torre es daño.
 * - Puertas móviles, patrulleros y orbitadores se evalúan en el instante en
 *   que el paquete pasa por su Y. Las puertas dinámicas cambian de valor por
 *   cantidad de cruces, igual que en el juego. El brute regenera HP.
 * - La munición replica el cargador/recarga/cadencia del juego.
 * - Respeta el tope de minions vivos del pool: cada paquete cuenta como
 *   vivo hasta llegar a la torre, y una puerta no clona por encima del tope.
 * - La deriva lateral se aproxima con esos sub-paquetes; sigue siendo algo
 *   optimista en puntería, por eso el diseño deja margen.
 *
 * El jugador simulado apunta a un X fijo y, opcionalmente, cambia a otro X
 * después de N disparos (p. ej. para "mejorar" una puerta y después usarla).
 */
import type { EnemyDef, GateDef, LevelDef, MoveDef } from '../src/data/levelFormat';
import { CANNON, MINION, POOL } from '../src/data/tuning';

const SPEED = (MINION.speedMin + MINION.speedMax) / 2;
const MUZZLE_Y = CANNON.y + CANNON.muzzleOffsetY;
const SIM_DT = 1 / 60;
/** Apertura inicial de cada disparo (deriva lateral) y columna de fusión, en px. */
const SHOT_SPREAD = 10;
const COLUMN = 6;

export interface Strategy {
  aimA: number;
  /** Cantidad de disparos apuntando a aimA antes de pasar a aimB. */
  switchAt: number;
  aimB: number;
}

export interface SimResult {
  strategy: Strategy;
  damage: number;
  won: boolean;
  /** Fracción de munición sin disparar en el momento de la victoria. */
  ammoLeft: number;
  timeToWin: number;
}

/** Instantes de cada disparo manteniendo el dedo apretado todo el nivel. */
export function shotTimes(level: LevelDef): Float64Array {
  const { total, magazine: magMax, regenPerSec } = level.ammo;
  const out = new Float64Array(total);
  const interval = 1 / CANNON.fireRate;
  let mag = magMax;
  let reserve = total - magMax;
  let acc = interval; // el primer disparo sale al tocar
  let t = 0;
  let n = 0;
  while (n < total && t < 600) {
    t += SIM_DT;
    let add = Math.min(regenPerSec * SIM_DT, magMax - mag, reserve);
    if (add < 0) add = 0;
    reserve -= add;
    mag += add;
    acc += SIM_DT;
    while (acc >= interval && n < total) {
      if (mag < 1) {
        acc = interval;
        break;
      }
      acc -= interval;
      mag -= 1;
      out[n++] = t;
    }
  }
  return out.subarray(0, n);
}

/** Posición de un vaivén que arranca en x0 hacia la derecha. */
function pingPong(x0: number, m: MoveDef, t: number): number {
  const span = m.maxX - m.minX;
  if (span <= 0) return m.minX;
  const d = (x0 - m.minX + m.speed * t) % (2 * span);
  return m.minX + (d <= span ? d : 2 * span - d);
}

type Obstacle = { y: number; gate?: GateDef; enemy?: EnemyDef };

interface GateState {
  index: number;
  hits: number;
}

interface EnemyState {
  hp: number;
  lastT: number;
}

function enemyPos(e: EnemyDef, t: number): { x: number; y: number } {
  if (e.orbit) {
    const a = e.orbit.phase + e.orbit.speed * t;
    return { x: e.x + Math.cos(a) * e.orbit.radius, y: e.y + Math.sin(a) * e.orbit.radius };
  }
  if (e.patrol) return { x: pingPong(e.x, e.patrol, t), y: e.y };
  return { x: e.x, y: e.y };
}

export function simulate(level: LevelDef, strategy: Strategy, shots: Float64Array): SimResult {
  const obstacles: Obstacle[] = [
    ...level.gates.map((gate) => ({ y: gate.y, gate })),
    ...level.enemies.map((enemy) => ({ y: enemy.y, enemy })),
  ].sort((a, b) => b.y - a.y);
  const gateState = new Map<GateDef, GateState>(level.gates.map((g) => [g, { index: 0, hits: 0 }]));
  const enemyState = new Map<EnemyDef, EnemyState>(level.enemies.map((e) => [e, { hp: e.hp, lastT: 0 }]));
  const towerT = (MUZZLE_Y - level.tower.lineY) / SPEED;
  const total = level.ammo.total;

  // Paquetes en vuelo: [instante de llegada a la torre, cantidad], en orden.
  const flightEnd: number[] = [];
  const flightCount: number[] = [];
  let head = 0;
  let aliveOthers = 0;
  const retire = (t: number): void => {
    while (head < flightEnd.length && flightEnd[head] <= t) aliveOthers -= flightCount[head++];
  };

  let damage = 0;
  let px: number[] = [];
  let pc: number[] = [];
  let nx: number[] = [];
  let nc: number[] = [];
  /** Agrega un sub-paquete fusionándolo con otro en la misma columna. */
  const put = (x: number, c: number): void => {
    if (c <= 0) return;
    for (let k = 0; k < nx.length; k++) {
      if (Math.abs(nx[k] - x) < COLUMN) {
        nc[k] += c;
        return;
      }
    }
    nx.push(x);
    nc.push(c);
  };

  for (let s = 0; s < shots.length; s++) {
    const t0 = shots[s];
    const aim = s < strategy.switchAt ? strategy.aimA : strategy.aimB;
    px = [aim - SHOT_SPREAD, aim + SHOT_SPREAD];
    pc = [0.5, 0.5];
    let count = 1;

    for (const ob of obstacles) {
      if (count <= 0) break;
      nx = [];
      nc = [];
      if (ob.gate) {
        const g = ob.gate;
        const t = t0 + (MUZZLE_Y - g.y) / SPEED;
        const gx = g.move ? pingPong(g.x, g.move, t) : g.x;
        const half = g.width / 2;
        const fan = Math.min(60, half) / 2;
        const st = gateState.get(g)!;
        retire(t);
        let room = Math.max(0, POOL.capacity - aliveOthers - count);
        for (let k = 0; k < px.length; k++) {
          const x = px[k];
          if (Math.abs(x - gx) > half) {
            put(x, pc[k]);
            continue;
          }
          // Se procesa por tramos: el valor puede cambiar a mitad del paquete.
          let pending = pc[k];
          let survivors = 0;
          let clones = 0;
          while (pending > 1e-9) {
            const last = st.index >= g.values.length - 1;
            const dynamic = g.dynamic !== 'none' && !last;
            const take = dynamic ? Math.min(pending, g.hitsPerStep - st.hits) : pending;
            const v = g.values[st.index];
            // add negativo: cada cruce mata 5 (él + vecinos); el paquete cruza junto.
            if (v.op === 'mul') {
              survivors += take;
              clones += take * (v.n - 1);
            } else if (v.n > 0) {
              survivors += take;
              clones += take * v.n;
            }
            pending -= take;
            if (dynamic) {
              st.hits += take;
              if (st.hits >= g.hitsPerStep - 1e-9) {
                st.hits = 0;
                st.index++;
              }
            }
          }
          clones = Math.min(clones, room);
          room -= clones;
          put(x, survivors);
          // Abanico de clones dentro del ancho de la puerta.
          put(Math.max(gx - half, x - fan), clones / 2);
          put(Math.min(gx + half, x + fan), clones / 2);
        }
      } else if (ob.enemy) {
        const e = ob.enemy;
        const st = enemyState.get(e)!;
        if (st.hp <= 0) continue;
        // Instante en que el paquete pasa por la Y actual del enemigo.
        let t = t0 + (MUZZLE_Y - e.y) / SPEED;
        let p = enemyPos(e, t);
        t = t0 + (MUZZLE_Y - p.y) / SPEED;
        p = enemyPos(e, t);
        if (e.regenPerSec > 0) st.hp = Math.min(e.hp, st.hp + e.regenPerSec * (t - st.lastT));
        st.lastT = t;
        const reach = e.radius + MINION.radius;
        for (let k = 0; k < px.length; k++) {
          let c = pc[k];
          if (st.hp > 0 && Math.abs(px[k] - p.x) <= reach) {
            const absorbed = Math.min(c, st.hp);
            st.hp -= absorbed;
            c -= absorbed;
          }
          put(px[k], c);
        }
      } else {
        continue;
      }
      px = nx;
      pc = nc;
      count = 0;
      for (let k = 0; k < pc.length; k++) count += pc[k];
    }

    flightEnd.push(t0 + towerT);
    flightCount.push(count);
    aliveOthers += count;

    damage += count;
    if (damage >= level.tower.hp) {
      const tWin = t0 + towerT;
      let fired = s + 1;
      while (fired < shots.length && shots[fired] <= tWin) fired++;
      return { strategy, damage, won: true, ammoLeft: (total - fired) / total, timeToWin: tWin };
    }
  }
  return { strategy, damage, won: false, ammoLeft: 0, timeToWin: Infinity };
}

/** Mejor estrategia encontrada: gana con más munición sobrante; si ninguna gana, la de más daño. */
export function bestStrategy(level: LevelDef, laneLeft: number, laneRight: number): SimResult {
  const shots = shotTimes(level);
  // Mismo rango al que llega el cañón en el juego.
  const aims: number[] = [];
  for (let x = laneLeft + CANNON.edgeMargin; x <= laneRight - CANNON.edgeMargin; x += 20) aims.push(x);
  const switches = [0, 10, 25];

  let best: SimResult | null = null;
  const better = (a: SimResult, b: SimResult | null): boolean => {
    if (!b) return true;
    if (a.won !== b.won) return a.won;
    if (a.won) return a.ammoLeft > b.ammoLeft + 1e-9;
    return a.damage > b.damage;
  };
  for (const sw of switches) {
    for (const a of sw === 0 ? [aims[0]] : aims) {
      for (const b of aims) {
        const r = simulate(level, { aimA: a, switchAt: sw, aimB: b }, shots);
        if (better(r, best)) best = r;
      }
    }
  }
  return best!;
}

/**
 * Daño máximo que la mejor estrategia le haría a una torre "infinita".
 * Sirve para dimensionar el HP de la torre al diseñar.
 */
export function maxDamage(level: LevelDef, laneLeft: number, laneRight: number): SimResult {
  const big = { ...level, tower: { ...level.tower, hp: Number.MAX_SAFE_INTEGER } };
  return bestStrategy(big, laneLeft, laneRight);
}
