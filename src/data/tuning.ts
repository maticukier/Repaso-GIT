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
} as const;

export const LANE = {
  /** Borde izquierdo / derecho del carril, en px lógicos. */
  left: 90,
  right: GAME_WIDTH - 90,
} as const;

export const CANNON = {
  y: GAME_HEIGHT - 140,
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
  /** Un minion se libera al pool cuando su centro pasa este Y. */
  despawnY: -40,
} as const;

export const POOL = {
  /** Capacidad fija: nunca se reserva memoria nueva en runtime. */
  capacity: 1024,
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
