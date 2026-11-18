import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';

import { type GameResult, setStorageListeners } from './storage';
import { supabase } from './supabase';

// Copia en la nube de todo lo que la app guarda en el dispositivo. Cada clave lleva
// la fecha de su último cambio; al iniciar sesión gana la versión más nueva de cada una.

const TS_KEY = '__sync_ts';
const PUSH_DELAY = 3000;

let userId: string | null = null;
const pending = new Map<string, unknown>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function readTimestamps(): Promise<Record<string, string>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(TS_KEY)) ?? '{}');
  } catch {
    return {};
  }
}

async function writeTimestamps(ts: Record<string, string>) {
  try {
    await AsyncStorage.setItem(TS_KEY, JSON.stringify(ts));
  } catch {
    // sin almacenamiento: no hay nada que sincronizar
  }
}

// Claves de la app (no las de la sesión de Supabase ni las propias de la sincronización).
function isAppKey(key: string) {
  return !key.startsWith('sb-') && !key.startsWith('__') && !key.startsWith('supabase');
}

async function flush() {
  timer = null;
  if (!userId || pending.size === 0) return;
  const ts = await readTimestamps();
  const rows = [...pending.entries()].map(([key, value]) => ({
    user_id: userId!,
    key,
    value,
    updated_at: ts[key] ?? new Date().toISOString(),
  }));
  pending.clear();
  const { error } = await supabase.from('user_kv').upsert(rows);
  if (error) {
    // Se reintenta con el próximo cambio.
    for (const r of rows) pending.set(r.key, r.value);
  }
}

function onWrite(key: string, value: unknown) {
  if (!isAppKey(key)) return;
  const now = new Date().toISOString();
  readTimestamps().then((ts) => writeTimestamps({ ...ts, [key]: now }));
  if (!userId) return;
  pending.set(key, value);
  if (!timer) timer = setTimeout(flush, PUSH_DELAY);
}

function onResult(result: GameResult) {
  if (!userId) return;
  supabase
    .from('results')
    .upsert({
      user_id: userId,
      game: result.game,
      variant: result.variant,
      day: result.day,
      score: result.score,
      details: result.details,
    })
    .then(() => flush());
}

setStorageListeners(onWrite, onResult);

// Une lo local con lo de la nube. Devuelve true si cambió algo en el dispositivo.
export async function syncNow(session: Session): Promise<boolean> {
  userId = session.user.id;
  const { data, error } = await supabase.from('user_kv').select('key, value, updated_at');
  if (error) throw error;
  const ts = await readTimestamps();
  const remote = new Map((data ?? []).map((r) => [r.key as string, r]));
  let changed = false;

  // Lo de la nube que es más nuevo que lo local, se baja.
  for (const [key, row] of remote) {
    const local = ts[key];
    if (!local || local < row.updated_at) {
      await AsyncStorage.setItem(key, JSON.stringify(row.value));
      ts[key] = row.updated_at;
      changed = true;
    }
  }
  await writeTimestamps(ts);

  // Lo local que no está en la nube o es más nuevo, se sube.
  const keys = (await AsyncStorage.getAllKeys()).filter(isAppKey);
  for (const key of keys) {
    const row = remote.get(key);
    if (row && ts[key] && ts[key] <= row.updated_at) continue;
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) continue;
    try {
      pending.set(key, JSON.parse(raw));
    } catch {
      // valor que no es JSON: no es nuestro
    }
    if (!ts[key]) ts[key] = new Date().toISOString();
  }
  await writeTimestamps(ts);
  await flush();

  // Resultados guardados en el dispositivo (también los jugados antes de iniciar sesión).
  const results = [];
  for (const key of keys.filter((k) => k.startsWith('result:'))) {
    try {
      const r = JSON.parse((await AsyncStorage.getItem(key)) ?? 'null') as GameResult | null;
      if (r) results.push({ user_id: userId, game: r.game, variant: r.variant, day: r.day, score: r.score, details: r.details });
    } catch {
      // ignorar
    }
  }
  if (results.length) await supabase.from('results').upsert(results);
  return changed;
}

export function stopSync() {
  userId = null;
  pending.clear();
}

// Sube ya lo pendiente (por ejemplo, al terminar una partida o cerrar la página).
export function flushNow() {
  if (timer) clearTimeout(timer);
  return flush();
}
