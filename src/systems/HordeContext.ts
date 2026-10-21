import type { MinionPool } from './MinionPool';
import type { SpatialGrid } from './SpatialGrid';

/**
 * Lo que necesita cualquier objeto que interactúa con la horda: el pool, la
 * grilla del frame y dos buffers de consulta pre-reservados (dos porque una
 * puerta negativa hace una consulta anidada).
 */
export interface HordeContext {
  pool: MinionPool;
  grid: SpatialGrid;
  scratchA: Int32Array;
  scratchB: Int32Array;
  /** En el test de estrés torre y enemigos no reciben daño. */
  invulnerable: boolean;
}
