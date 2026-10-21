import { parseLevel, type LevelDef, type LevelJson } from '../levelFormat';

/**
 * Carga todos los src/data/levels/level-NN.json (ordenados por nombre) y los
 * valida al arrancar: un JSON roto falla rápido con el campo exacto.
 */
const files = import.meta.glob<LevelJson>('./level-*.json', { eager: true, import: 'default' });

export const LEVELS: readonly LevelDef[] = Object.keys(files)
  .sort()
  .map((path, i) => parseLevel(files[path], i + 1));
