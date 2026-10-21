import Phaser from 'phaser';

/**
 * Blitter con lista de render fija.
 *
 * El Blitter de Phaser regenera `renderList` con `Array.filter()` cada vez que
 * un Bob cambia de visibilidad: con cientos de spawns/despawns por segundo eso
 * es una allocation por frame. Acá devolvemos siempre la lista de hijos
 * (pre-creada) y los Bobs inactivos se esconden con alpha 0, que el renderer
 * saltea con un `continue`. Resultado: cero allocs y un único batch de quads.
 */
export class PoolBlitter extends Phaser.GameObjects.Blitter {
  override getRenderList(): Phaser.GameObjects.Bob[] {
    return this.children.list;
  }
}
