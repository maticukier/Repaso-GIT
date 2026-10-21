/**
 * Mejoras permanentes y economía de monedas. TypeScript puro (sin Phaser).
 */

export type UpgradeId = 'fireRate' | 'ammo' | 'damage' | 'gates';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  /** Qué hace cada nivel. */
  description: string;
  maxLevel: number;
  /** Costo del nivel 1; cada nivel siguiente multiplica por `growth`. */
  baseCost: number;
  growth: number;
  /** Texto del efecto acumulado a un nivel dado (0 = sin mejora). */
  effect(level: number): string;
}

export const UPGRADE_MAX = 10;

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'fireRate',
    name: 'Cadencia',
    description: 'Dispara y recarga la barra más rápido',
    maxLevel: UPGRADE_MAX,
    baseCost: 60,
    growth: 1.6,
    effect: (l) => `+${Math.round((fireRateMult(l) - 1) * 100)}%`,
  },
  {
    id: 'ammo',
    name: 'Munición máxima',
    description: 'Más disparos por nivel y cargador más grande',
    maxLevel: UPGRADE_MAX,
    baseCost: 70,
    growth: 1.6,
    effect: (l) => `+${Math.round((ammoMult(l) - 1) * 100)}%`,
  },
  {
    id: 'damage',
    name: 'Daño por minion',
    description: 'Cada minion pega más fuerte a torres y defensores',
    maxLevel: UPGRADE_MAX,
    baseCost: 80,
    growth: 1.6,
    effect: (l) => `x${minionDamage(l).toFixed(1)}`,
  },
  {
    id: 'gates',
    name: 'Puertas potenciadas',
    description: 'Suma +1 por nivel, resta -1 cada 3 niveles y chance de clon extra en multiplicadores',
    maxLevel: UPGRADE_MAX,
    baseCost: 70,
    growth: 1.6,
    effect: (l) => (l === 0 ? '+0' : `+${gateAddBonus(l)} / ${Math.round(gateExtraCloneChance(l) * 100)}%`),
  },
];

export function upgradeDef(id: UpgradeId): UpgradeDef {
  const d = UPGRADES.find((u) => u.id === id);
  if (!d) throw new Error(`Mejora desconocida: ${id}`);
  return d;
}

/**
 * Costo de pasar de `level` a `level + 1`, redondeado a múltiplos de 5.
 * Con x1.6 por nivel, las primeras compras llegan cada 2-3 niveles y el
 * máximo (nivel 10) queda como meta de largo plazo (~4000 monedas).
 */
export function upgradeCost(def: UpgradeDef, level: number): number {
  return Math.round((def.baseCost * Math.pow(def.growth, level)) / 5) * 5;
}

// ---------------------------------------------------------------- efectos

export function fireRateMult(level: number): number {
  return 1 + 0.06 * level;
}

export function ammoMult(level: number): number {
  return 1 + 0.08 * level;
}

export function minionDamage(level: number): number {
  return 1 + 0.1 * level;
}

export function gateAddBonus(level: number): number {
  return level;
}

/** Cuánto se achican (en módulo) las puertas de resta: 1 cada 3 niveles (-5 -> -2 al máximo). */
export function gateSubReduction(level: number): number {
  return Math.floor(level / 3);
}

export function gateExtraCloneChance(level: number): number {
  return 0.03 * level;
}

/** Stats efectivos para una partida, según los niveles comprados. */
export interface Loadout {
  fireRateMult: number;
  ammoMult: number;
  damage: number;
  gateAddBonus: number;
  gateSubReduction: number;
  gateExtraCloneChance: number;
}

export function loadoutFor(levels: Readonly<Record<UpgradeId, number>>): Loadout {
  return {
    fireRateMult: fireRateMult(levels.fireRate),
    ammoMult: ammoMult(levels.ammo),
    damage: minionDamage(levels.damage),
    gateAddBonus: gateAddBonus(levels.gates),
    gateSubReduction: gateSubReduction(levels.gates),
    gateExtraCloneChance: gateExtraCloneChance(levels.gates),
  };
}

export const BASE_LOADOUT: Loadout = loadoutFor({ fireRate: 0, ammo: 0, damage: 0, gates: 0 });

// ---------------------------------------------------------------- monedas

export interface CoinReward {
  total: number;
  /** Partes, para mostrar el desglose. */
  base: number;
  starBonus: number;
  firstClear: number;
}

/**
 * Monedas al terminar un nivel. Crece con el número de nivel; las estrellas
 * suman, el primer pase da un bonus y perder deja algo proporcional al daño
 * hecho (para que intentar siempre sume).
 */
export function coinReward(levelNumber: number, won: boolean, stars: number, firstClear: boolean, damageFraction: number): CoinReward {
  const base = 5 + levelNumber;
  if (!won) {
    const consolation = Math.floor(base * 0.4 * Math.max(0, Math.min(1, damageFraction)));
    return { total: consolation, base: consolation, starBonus: 0, firstClear: 0 };
  }
  const starBonus = Math.round(base * 0.35 * stars);
  const first = firstClear ? 10 + levelNumber * 2 : 0;
  return { total: base + starBonus + first, base, starBonus, firstClear: first };
}
