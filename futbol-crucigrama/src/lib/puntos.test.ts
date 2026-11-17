/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getJugador, jugadorCount, normalize, searchJugadores } from './jugadores';
import {
  allListas,
  correctAnswers,
  distanceTo,
  getDailyPreguntas,
  type Lista,
  RANKING_ROUNDS,
  rankingShareText,
  scoreGuess,
  standings,
} from './ranking';
import {
  allCategorias,
  getDailyCategorias,
  pointsForFame,
  rankedAnswers,
  rebuscadoShareText,
  ROUNDS,
  scoreAnswer,
} from './rebuscado';
import { applyPuntosResult, EMPTY_PUNTOS_STATS } from './storage';

function dayKeys(count: number): string[] {
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.UTC(2026, 8, 23 + i)).toISOString().slice(0, 10),
  );
}

// --- Base de jugadores

test('el buscador ignora tildes y ordena por fama', () => {
  assert.equal(normalize('  Ángel   Di María '), 'angel di maria');
  assert.equal(normalize('Martin Ødegaard'), 'martin odegaard');
  const messi = searchJugadores('messi');
  assert.equal(messi[0].name, 'Lionel Messi');
  assert.ok(searchJugadores('aguero').some((j) => j.name === 'Sergio Agüero'));
  assert.deepEqual(searchJugadores('m'), []);
  const fames = searchJugadores('ronaldo').map((j) => j.fame);
  assert.ok(fames.length > 0);
});

test('todos los jugadores tienen nombre', () => {
  for (let i = 0; i < jugadorCount(); i++) {
    const j = getJugador(i);
    assert.ok(j.name.length > 1, `jugador ${i} sin nombre`);
    assert.ok(!/\(.*\)$/.test(j.name), `nombre con aclaración: ${j.name}`);
  }
});

// --- Rebuscado

test('menos fama, más puntos', () => {
  assert.equal(pointsForFame(228), 10);
  assert.equal(pointsForFame(57), 30);
  assert.equal(pointsForFame(3), 100);
  let prev = 0;
  for (const fame of [300, 80, 60, 45, 35, 25, 18, 12, 7, 2]) {
    const p = pointsForFame(fame);
    assert.ok(p >= prev, 'los puntos no bajan cuando baja la fama');
    prev = p;
  }
});

test('las categorías son coherentes', () => {
  const titles = new Set<string>();
  for (const c of allCategorias()) {
    assert.ok(!titles.has(c.t), `repetida: ${c.t}`);
    titles.add(c.t);
    assert.ok(c.a.length >= 4, `${c.t}: pocas respuestas`);
    assert.equal(new Set(c.a).size, c.a.length, `${c.t}: respuestas repetidas`);
    for (const id of c.a) assert.ok(id >= 0 && id < jugadorCount());
  }
});

test('cinco categorías distintas por día, iguales para todos', () => {
  for (const day of dayKeys(200)) {
    const cats = getDailyCategorias(day);
    assert.equal(cats.length, ROUNDS);
    assert.equal(new Set(cats.map((c) => c.t)).size, ROUNDS, `repetidas el ${day}`);
    const firsts = cats.filter((c) => !c.t.startsWith('Pasaron')).map((c) => c.t.split(' ')[0]);
    assert.equal(new Set(firsts).size, firsts.length, `nacionalidad repetida el ${day}: ${cats.map((c) => c.t)}`);
  }
  assert.deepEqual(getDailyCategorias('2026-12-01'), getDailyCategorias('2026-12-01'));
  const days = dayKeys(60).map((d) => new Set(getDailyCategorias(d).map((c) => c.t)));
  for (let i = 1; i < days.length; i++) {
    const shared = [...days[i]].filter((t) => days[i - 1].has(t));
    assert.deepEqual(shared, [], 'categoría repetida en días seguidos');
  }
});

test('puntaje de una respuesta de Rebuscado', () => {
  const c = allCategorias()[0];
  const ranked = rankedAnswers(c);
  assert.equal(ranked.length, c.a.length);
  assert.ok(ranked[0].points >= ranked[ranked.length - 1].points);
  assert.equal(scoreAnswer(c, ranked[0].jugador.id), ranked[0].points);
  assert.equal(scoreAnswer(c, null), 0);
  const outsider = Array.from({ length: jugadorCount() }, (_, i) => i).find(
    (i) => !c.a.includes(i) && !(c.x ?? []).includes(i),
  )!;
  assert.equal(scoreAnswer(c, outsider), 0);
  assert.equal(rebuscadoShareText(3, [100, 70, 50, 30, 0]), 'Rebuscado #3: 250/500\n🟪🟦🟩🟨⬛');
});

// --- Ranking

const FAKE: Lista = {
  id: 'fake',
  t: 'Goleadores',
  q: 'el goleador n.º {n}',
  u: 'goles',
  targets: [1, 2, 3, 4, 5],
  // 100, 90, 90, 80, 70 ... con un empate en el 2.º y 3.º puesto
  r: [
    [0, 100],
    [1, 90],
    [2, 90],
    [3, 80],
    [4, 70],
    [5, 60],
    [6, 50],
    [7, 40],
    [8, 30],
    [9, 20],
    [10, 10],
    [11, 9],
    [12, 8],
    [13, 7],
    [14, 6],
  ],
};

test('los empates comparten puesto', () => {
  const table = standings(FAKE);
  assert.deepEqual([table[1].from, table[1].to], [2, 3]);
  assert.deepEqual([table[2].from, table[2].to], [2, 3]);
  assert.equal(distanceTo(table[1], 3), 0);
  assert.equal(distanceTo(table[1], 5), 2);
  assert.deepEqual(
    correctAnswers(FAKE, 2).map((p) => p.jugador.id),
    [1, 2],
  );
});

test('más cerca del puesto, más puntos', () => {
  assert.equal(scoreGuess(FAKE, 4, 3).points, 100);
  assert.equal(scoreGuess(FAKE, 4, 4).points, 85);
  assert.equal(scoreGuess(FAKE, 4, 1).points, 85); // empatado en 2.º-3.º: a un puesto
  assert.equal(scoreGuess(FAKE, 1, 14).points, 5); // está en la lista pero muy lejos
  assert.equal(scoreGuess(FAKE, 4, null).points, 0);
  const outsider = scoreGuess(FAKE, 4, 999999 % jugadorCount() === 0 ? 15 : 15);
  assert.equal(outsider.points, 0);
  let prev = 101;
  for (let id = 3; id <= 13; id++) {
    const p = scoreGuess(FAKE, 4, id).points;
    assert.ok(p < prev, 'los puntos bajan al alejarse');
    prev = p;
  }
});

test('los rankings están ordenados y las preguntas son válidas', () => {
  for (const l of allListas()) {
    assert.ok(l.r.length >= 13, `${l.id}: lista corta`);
    assert.ok(l.q.includes('{n}'));
    for (let i = 1; i < l.r.length; i++) assert.ok(l.r[i - 1][1] >= l.r[i][1], `${l.id}: desordenado`);
    assert.equal(new Set(l.r.map((r) => r[0])).size, l.r.length, `${l.id}: jugador repetido`);
    assert.ok(l.targets.length >= 3, `${l.id}: pocos puestos`);
    for (const t of l.targets) {
      assert.ok(t >= 1 && t <= l.r.length - 5, `${l.id}: puesto ${t} sin margen`);
      assert.ok(correctAnswers(l, t).length <= 3, `${l.id}: demasiado empate en el ${t}`);
    }
  }
});

test('cinco preguntas por día de listas distintas', () => {
  for (const day of dayKeys(200)) {
    const qs = getDailyPreguntas(day);
    assert.equal(qs.length, RANKING_ROUNDS);
    assert.equal(new Set(qs.map((q) => q.lista.id)).size, RANKING_ROUNDS, `lista repetida el ${day}`);
    for (const q of qs) {
      assert.ok(q.lista.targets.includes(q.target));
      assert.ok(q.text.includes(`n.º ${q.target}`));
    }
  }
  assert.deepEqual(getDailyPreguntas('2026-12-01'), getDailyPreguntas('2026-12-01'));
});

test('datos conocidos de los rankings', () => {
  const top = (id: string) => {
    const l = allListas().find((x) => x.id === id)!;
    return getJugador(l.r[0][0]).name;
  };
  assert.equal(top('manutd-g'), 'Wayne Rooney');
  assert.equal(top('realmadrid-g'), 'Cristiano Ronaldo');
  assert.equal(top('argentina-g'), 'Lionel Messi');
  assert.equal(top('inter-p'), 'Javier Zanetti');
});

test('texto para compartir del Ranking', () => {
  const scores = [scoreGuess(FAKE, 4, 3), scoreGuess(FAKE, 4, 4), scoreGuess(FAKE, 1, 14), scoreGuess(FAKE, 4, null)];
  assert.equal(rankingShareText(7, scores), 'Ranking futbolero #7: 190/500\n🎯🟩🟧⬛');
});

// --- Estadísticas

test('estadísticas de los juegos por puntos', () => {
  let s = applyPuntosResult(EMPTY_PUNTOS_STATS, '2026-11-17', 320);
  s = applyPuntosResult(s, '2026-11-18', 400);
  assert.deepEqual([s.played, s.total, s.best, s.currentStreak], [2, 720, 400, 2]);
  assert.equal(applyPuntosResult(s, '2026-11-18', 500), s);
  s = applyPuntosResult(s, '2026-11-21', 100);
  assert.deepEqual([s.currentStreak, s.maxStreak, s.best], [1, 2, 400]);
});

// --- Rebuscado: categorías completas con casos conocidos

function categoria(title: string) {
  const c = allCategorias().find((x) => x.t === title);
  assert.ok(c, `falta la categoría: ${title}`);
  return c!;
}

function valida(title: string, ...names: string[]) {
  const c = categoria(title);
  for (const name of names) {
    const ids = searchJugadores(name, 20).filter((j) => j.name === name).map((j) => j.id);
    assert.ok(ids.length > 0, `${name} no está en la base`);
    assert.ok(
      ids.some((id) => scoreAnswer(c, id) > 0),
      `${name} debería contar en "${title}"`,
    );
  }
}

test('las categorías incluyen a todos los que corresponden', () => {
  valida('Argentinos que pasaron por el Liverpool', 'Alexis Mac Allister', 'Maxi Rodríguez', 'Javier Mascherano');
  valida('Argentinos campeones del mundo', 'Julián Alvarez', 'Gonzalo Montiel', 'Diego Maradona', 'Mario Kempes');
  valida('Argentinos convocados a la Copa América 2021', 'Joaquín Correa', 'Lionel Messi');
  valida('Argentinos que pasaron por el Real Madrid', 'Fernando Redondo', 'Santiago Solari');
  valida('Pasaron por Boca y por River', 'Gabriel Batistuta', 'Claudio Caniggia');
  // Doble nacionalidad: Paletta jugó para Italia pero es argentino.
  valida('Argentinos que pasaron por el Liverpool', 'Gabriel Paletta');
  assert.equal(categoria('Argentinos convocados al Mundial 2022').a.length, 26);
  assert.equal(categoria('Argentinos convocados al Mundial 2006').a.length, 23);
});
