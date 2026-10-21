/**
 * Validador de niveles: npm run validate
 *
 * 1. Parsea cada src/data/levels/level-NN.json con el mismo parser del juego.
 * 2. Busca con la simulación simple (scripts/levelSim.ts) una estrategia que
 *    gane sin mejoras. Si no la hay, el nivel es imposible -> falla.
 * 3. Avisa (sin fallar) niveles muy justos, 3 estrellas inalcanzables y
 *    picos de dificultad entre niveles consecutivos.
 *
 * --json imprime los resultados en JSON (para herramientas de diseño).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLevel, type LevelDef, type LevelJson } from '../src/data/levelFormat';
import { LANE } from '../src/data/tuning';
import { bestStrategy, maxDamage } from './levelSim';

/** El modelo es optimista: por debajo de este margen el nivel real puede quedar injusto. */
const MIN_MARGIN = 1.25;
/**
 * Un nivel no debería ser más de esto "más difícil" que el anterior
 * (dificultad = 1/margen). Contra partidas reales con bots, el modelo erra
 * hasta ~15% por nivel, así que dos vecinos pueden diferir ~1.3 sólo por el
 * modelo; por encima de eso es un pico real.
 */
const MAX_DIFFICULTY_JUMP = 1.3;

const dir = join(dirname(fileURLToPath(import.meta.url)), '../src/data/levels');
const files = readdirSync(dir)
  .filter((f) => /^level-\d+\.json$/.test(f))
  .sort();

const asJson = process.argv.includes('--json');
const errors: string[] = [];
const warnings: string[] = [];
const rows: Record<string, unknown>[] = [];
let prevDifficulty = 0;

files.forEach((file, i) => {
  let level: LevelDef;
  try {
    level = parseLevel(JSON.parse(readFileSync(join(dir, file), 'utf8')) as LevelJson, i + 1);
  } catch (e) {
    errors.push(`${file}: ${(e as Error).message}`);
    return;
  }

  const win = bestStrategy(level, LANE.left, LANE.right);
  const potential = maxDamage(level, LANE.left, LANE.right);
  const margin = potential.damage / level.tower.hp;
  const difficulty = 1 / margin;
  const s = win.strategy;
  const strat = s.switchAt > 0 ? `x=${s.aimA} (${s.switchAt} tiros) -> x=${s.aimB}` : `x=${s.aimB}`;

  rows.push({
    nivel: level.number,
    nombre: level.name + (level.boss ? ' [JEFE]' : ''),
    hpTorre: level.tower.hp,
    dañoMax: Math.round(potential.damage),
    margen: Number(margin.toFixed(2)),
    gana: win.won,
    estrategia: win.won ? strat : '-',
    sobra: win.won ? `${Math.round(win.ammoLeft * 100)}%` : '-',
    _strategy: s,
    _potential: potential.damage,
    _potentialStrategy: potential.strategy,
    _ammoLeft: win.ammoLeft,
  });

  if (!win.won) {
    errors.push(`nivel ${level.number} (${level.name}): IMPOSIBLE sin mejoras — daño máximo ${potential.damage} < HP ${level.tower.hp}`);
    return;
  }
  if (margin < MIN_MARGIN) warnings.push(`nivel ${level.number}: muy justo (margen ${margin.toFixed(2)} < ${MIN_MARGIN})`);
  if (win.ammoLeft < level.stars.three) {
    warnings.push(`nivel ${level.number}: 3 estrellas inalcanzables (sobra ${(win.ammoLeft * 100).toFixed(0)}%, pide ${level.stars.three * 100}%)`);
  }
  if (prevDifficulty > 0 && difficulty > prevDifficulty * MAX_DIFFICULTY_JUMP) {
    warnings.push(`nivel ${level.number}: pico de dificultad (x${(difficulty / prevDifficulty).toFixed(2)} vs. nivel anterior)`);
  }
  prevDifficulty = difficulty;
});

if (asJson) {
  console.log(JSON.stringify({ rows, errors, warnings }, null, 2));
} else {
  console.table(rows.map(({ _strategy, _potential, _potentialStrategy, _ammoLeft, ...r }) => r));
  for (const w of warnings) console.warn(`⚠  ${w}`);
  for (const e of errors) console.error(`✖  ${e}`);
  console.log(errors.length === 0 ? `✔ ${files.length} niveles válidos y ganables sin mejoras.` : `✖ ${errors.length} error(es).`);
}
process.exit(errors.length === 0 ? 0 : 1);
