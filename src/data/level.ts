import type { EnemyDef } from '../entities/Enemy';
import type { GateDef } from '../entities/Gate';
import { LANE } from './tuning';

/**
 * Único nivel del juego por ahora, hardcodeado.
 * Carril: x de 90 a 630 (centro 360). La boca del cañón sale en y≈1062
 * y la horda avanza hacia y=0.
 */
export const LEVEL = {
  tower: { hp: 400, lineY: 250 },

  ammo: { magazine: 40, total: 220, regenPerSec: 7 },

  gates: [
    // Fila 1: x2 seguro a la izquierda; a la derecha una puerta que arranca
    // en -5 pero mejora si le seguís disparando (-5 -> x2 -> x3).
    { x: 225, y: 900, width: 230, values: [{ op: 'mul', n: 2 }] },
    {
      x: 495,
      y: 900,
      width: 230,
      values: [
        { op: 'add', n: -5 },
        { op: 'mul', n: 2 },
        { op: 'mul', n: 3 },
      ],
      dynamic: 'upgrade',
      hitsPerStep: 8,
    },

    // Fila 2: x3 que se mueve de lado a lado.
    {
      x: 360,
      y: 640,
      width: 170,
      values: [{ op: 'mul', n: 3 }],
      move: { minX: LANE.left + 95, maxX: LANE.right - 95, speed: 120 },
    },

    // Fila 3: +25 que se gasta con el uso (+25 -> +10 -> -5) y un -5 fijo.
    // Quedan dos pasillos libres a los lados del defensor central.
    {
      x: 180,
      y: 380,
      width: 150,
      values: [
        { op: 'add', n: 25 },
        { op: 'add', n: 10 },
        { op: 'add', n: -5 },
      ],
      dynamic: 'wear',
      hitsPerStep: 5,
    },
    { x: 540, y: 380, width: 150, values: [{ op: 'add', n: -5 }] },
  ] satisfies GateDef[],

  enemies: [
    { kind: 'static', x: 360, y: 775, radius: 36, hp: 60 },
    { kind: 'patrol', x: 200, y: 510, radius: 30, hp: 45, patrol: { minX: LANE.left + 50, maxX: LANE.right - 50, speed: 170 } },
    { kind: 'static', x: 360, y: 330, radius: 28, hp: 40 },
  ] satisfies EnemyDef[],
} as const;
