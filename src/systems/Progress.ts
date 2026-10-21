import { UPGRADES, upgradeCost, upgradeDef, type UpgradeId } from '../data/upgrades';
import type { Storage } from './Storage';

const SAVE_KEY = 'save';
const SAVE_VERSION = 1;

export interface Settings {
  sound: boolean;
  vibration: boolean;
}

interface SaveData {
  version: number;
  /** Índice (0-based) del nivel más alto desbloqueado. */
  unlocked: number;
  stars: number[];
  coins: number;
  upgrades: Record<UpgradeId, number>;
  settings: Settings;
}

function defaults(): SaveData {
  return {
    version: SAVE_VERSION,
    unlocked: 0,
    stars: [],
    coins: 0,
    upgrades: { fireRate: 0, ammo: 0, damage: 0, gates: 0 },
    settings: { sound: true, vibration: true },
  };
}

function int(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.floor(v))) : fallback;
}

/** Acepta cualquier JSON y devuelve un SaveData válido (campos rotos -> default). */
function sanitize(raw: unknown): SaveData {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Partial<SaveData>;
  d.unlocked = int(r.unlocked, 0, 10_000, 0);
  d.coins = int(r.coins, 0, 1e9, 0);
  if (Array.isArray(r.stars)) d.stars = r.stars.map((s) => int(s, 0, 3, 0));
  for (const u of UPGRADES) d.upgrades[u.id] = int(r.upgrades?.[u.id], 0, u.maxLevel, 0);
  if (r.settings) {
    d.settings.sound = r.settings.sound !== false;
    d.settings.vibration = r.settings.vibration !== false;
  }
  return d;
}

type Listener = () => void;

/**
 * Progreso del jugador: niveles, estrellas, monedas, mejoras y ajustes.
 * Se carga una vez al arrancar y se guarda en cada cambio (son pocos y
 * puntuales: fin de nivel, compra, ajuste), a través de `Storage`.
 */
class Progress {
  private data: SaveData = defaults();
  private storage: Storage | null = null;
  private readonly listeners = new Set<Listener>();

  async load(storage: Storage): Promise<void> {
    this.storage = storage;
    const raw = await storage.get(SAVE_KEY);
    if (!raw) return;
    try {
      this.data = sanitize(JSON.parse(raw));
    } catch {
      console.warn('Guardado corrupto: se empieza de cero');
      this.data = defaults();
    }
  }

  /** Avisos de cambios (para refrescar UI). Devuelve la función para desuscribirse. */
  onChange(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private commit(): void {
    for (const fn of this.listeners) fn();
    void this.storage?.set(SAVE_KEY, JSON.stringify(this.data));
  }

  // -------------------------------------------------------------- niveles

  isUnlocked(index: number): boolean {
    return index <= this.data.unlocked;
  }

  starsOf(index: number): number {
    return this.data.stars[index] ?? 0;
  }

  totalStars(): number {
    return this.data.stars.reduce((a, b) => a + (b ?? 0), 0);
  }

  isCleared(index: number): boolean {
    return this.starsOf(index) > 0;
  }

  /** Registra una victoria; devuelve true si desbloqueó un nivel nuevo. */
  recordWin(index: number, stars: number, levelCount: number): boolean {
    this.data.stars[index] = Math.max(this.starsOf(index), stars);
    let unlockedNew = false;
    if (index + 1 < levelCount && this.data.unlocked < index + 1) {
      this.data.unlocked = index + 1;
      unlockedNew = true;
    }
    this.commit();
    return unlockedNew;
  }

  // -------------------------------------------------------------- monedas

  get coins(): number {
    return this.data.coins;
  }

  addCoins(n: number): void {
    if (n <= 0) return;
    this.data.coins += Math.floor(n);
    this.commit();
  }

  // -------------------------------------------------------------- mejoras

  upgradeLevel(id: UpgradeId): number {
    return this.data.upgrades[id];
  }

  upgradeLevels(): Readonly<Record<UpgradeId, number>> {
    return this.data.upgrades;
  }

  /** Costo del próximo nivel, o null si ya está al máximo. */
  nextUpgradeCost(id: UpgradeId): number | null {
    const def = upgradeDef(id);
    const level = this.data.upgrades[id];
    return level >= def.maxLevel ? null : upgradeCost(def, level);
  }

  buyUpgrade(id: UpgradeId): boolean {
    const cost = this.nextUpgradeCost(id);
    if (cost === null || cost > this.data.coins) return false;
    this.data.coins -= cost;
    this.data.upgrades[id]++;
    this.commit();
    return true;
  }

  // -------------------------------------------------------------- ajustes

  get settings(): Readonly<Settings> {
    return this.data.settings;
  }

  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.data.settings[key] = value;
    this.commit();
  }
}

export const progress = new Progress();
