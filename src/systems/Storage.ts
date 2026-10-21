import { Preferences } from '@capacitor/preferences';
import { isNative } from './Platform';

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

/**
 * Capacitor Preferences (SharedPreferences en Android). A diferencia de
 * localStorage del WebView, el sistema no lo borra al liberar espacio y entra
 * en el backup automático de Android.
 */
export class CapacitorPreferencesStorage implements Storage {
  async get(key: string): Promise<string | null> {
    return (await Preferences.get({ key })).value;
  }

  async set(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }

  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
}

/** En la app: Preferences. En el navegador: localStorage si funciona; si no, memoria. */
export function createDefaultStorage(): Storage {
  if (isNative) return new CapacitorPreferencesStorage();
  try {
    const probe = '__probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return new LocalStorageStorage();
  } catch {
    return new MemoryStorage();
  }
}
