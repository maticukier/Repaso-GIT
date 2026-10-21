/**
 * Almacenamiento clave/valor persistente. Es asíncrono a propósito: así se
 * puede cambiar localStorage por Capacitor Preferences (async) sin tocar a
 * quien lo usa.
 */
export interface Storage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/**
 * localStorage del navegador. Cada acceso va en try/catch: en modo privado,
 * con cookies bloqueadas o cuota llena, localStorage puede tirar.
 */
export class LocalStorageStorage implements Storage {
  constructor(private readonly prefix = 'blobalanche:') {}

  async get(key: string): Promise<string | null> {
    try {
      return window.localStorage.getItem(this.prefix + key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      window.localStorage.setItem(this.prefix + key, value);
    } catch (e) {
      console.warn('No se pudo guardar', key, e);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      window.localStorage.removeItem(this.prefix + key);
    } catch {
      // nada que hacer
    }
  }
}

/** Sin persistencia (fallback y tests). */
export class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async remove(key: string): Promise<void> {
    this.data.delete(key);
  }
}

/** localStorage si está disponible y funciona; si no, memoria. */
export function createDefaultStorage(): Storage {
  try {
    const probe = '__probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return new LocalStorageStorage();
  } catch {
    return new MemoryStorage();
  }
}
