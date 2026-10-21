/** Resolución lógica del juego (portrait 9:16). Phaser escala con FIT. */
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

export const COLORS = {
  background: 0x1b1430,
  grass: 0x2a1f4a,
  grassDots: 0x342760,
  lane: 0x3d3266,
  laneEdge: 0x8f7cff,
  laneStripe: 0x5a4a93,
  minion: 0x4fe3c1,
  minionShade: 0x1f9e86,
  minionEye: 0x10202a,
  cannonBase: 0xff7a59,
  cannonShade: 0xc2452b,
  cannonBarrel: 0xffd166,
  cannonBarrelShade: 0xd19a2a,
  gateMul: 0x36d67a,
  gateAdd: 0x3fa9ff,
  gateNeg: 0xff4d6d,
  enemyStatic: 0xe0435c,
  enemyStaticShade: 0x8e1f36,
  enemyPatrol: 0xb35cff,
  enemyPatrolShade: 0x6a2aa8,
  tower: 0x5b4f86,
  towerShade: 0x3a3160,
  towerRoof: 0xff7a59,
  towerBoss: 0x7a3b5e,
  towerBossShade: 0x4f2340,
  crown: 0xffd166,
  enemyBrute: 0xc7663b,
  enemyBruteShade: 0x6e3018,
  enemyOrbiter: 0x39c6e6,
  enemyOrbiterShade: 0x18708a,
  star: 0xffd166,
  starEmpty: 0x3b3160,
  locked: 0x3b3160,
  button: 0x4fe3c1,
  buttonAlt: 0x8f7cff,
  boss: 0xff4d6d,
  bossLocked: 0x5a2440,
  hpBar: 0xff4d6d,
  hpBarBg: 0x241b3d,
  ammoBar: 0xffd166,
  ammoBarEmpty: 0x6b5a2a,
} as const;

export const LANE = {
  /** Borde izquierdo / derecho del carril, en px lógicos. */
  left: 90,
  right: GAME_WIDTH - 90,
} as const;

export const CANNON = {
  y: GAME_HEIGHT - 140,
  /** Distancia mínima del cañón a los bordes del carril. */
  edgeMargin: 40,
  /** Qué tan rápido el cañón alcanza la posición del dedo (1/s). */
  followSharpness: 28,
  /** Minions por segundo mientras el dedo está apretado. */
  fireRate: 14,
  /** Distancia de la boca del cañón respecto del centro de la base. */
  muzzleOffsetY: -78,
  recoilPx: 10,
  recoilRecoverPerSec: 80,
} as const;

export const MINION = {
  /** Tamaño del sprite (cada frame del spritesheet). */
  size: 30,
  /** Hitbox lógica (radio), para colisiones de partes futuras. */
  radius: 11,
  speedMin: 480,
  speedMax: 580,
  spreadVx: 70,
  /** Amortiguación del desvío lateral (1/s). */
  lateralDamping: 1.6,
  /** Frames de animación (squash/stretch) por segundo. */
  animFps: 8,
  /** Red de seguridad: se libera si su centro pasa este Y (la torre los frena antes). */
  despawnY: -40,
} as const;

export const POOL = {
  /** Capacidad fija: nunca se reserva memoria nueva en runtime. Actúa como tope de horda. */
  capacity: 1024,
} as const;

export const GRID = {
  /** ~4 diámetros de minion: pocas celdas por consulta y pocos minions por celda. */
  cellSize: 48,
} as const;

export const GATE = {
  height: 34,
  /** Cada cuánto se emite el número flotante acumulado de una puerta. */
  floatInterval: 0.22,
  /** Radio en el que una puerta negativa se lleva minions extra. */
  negativeRadius: 56,
} as const;

export const FLOATING = {
  poolSize: 20,
  duration: 0.9,
  risePerSec: 90,
} as const;

/** Profundidades de render (de atrás hacia adelante). */
export const DEPTH = {
  lane: 0,
  gate: 10,
  tower: 20,
  enemy: 30,
  minions: 40,
  gateLabel: 50,
  cannon: 60,
  floating: 70,
  hud: 80,
  overlay: 90,
} as const;

export const STRESS = {
  defaultTarget: 600,
  /** Tope de spawns por frame en modo estrés, para no clavar un frame entero. */
  maxSpawnsPerFrame: 40,
  /** Más lentos que lo normal para que la horda llene toda la pantalla. */
  speedMin: 220,
  speedMax: 420,
} as const;

/** Paso máximo de simulación, evita "teleports" tras un tab en background. */
export const MAX_DT = 1 / 20;
