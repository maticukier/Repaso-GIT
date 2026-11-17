/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import data from '../data/fifa-cards.json';
import { FLAGS } from '../data/flags';
import {
  answerCount,
  cartaShareText,
  editionLabel,
  getDailyCard,
  nationLabel,
  revealed,
  searchPlayers,
} from './cartas';

test('los datos son coherentes', () => {
  const searchIds = new Set(data.search.map((e) => e[0]));
  for (const p of data.answers) {
    assert.ok(searchIds.has(p.id), `${p.name} no está en el buscador`);
    assert.ok(p.cards.length > 0, `${p.name} sin cartas`);
    for (const c of p.cards) {
      assert.ok(c.v >= 14 && c.v <= 26);
      assert.equal(c.s.length, 6);
      assert.ok(c.ovr >= 80 && c.ovr <= 99);
    }
  }
});

test('todas las nacionalidades tienen nombre en español y bandera', () => {
  for (const [, , nat] of data.search) {
    const { flag } = nationLabel(nat as string);
    assert.ok(flag && FLAGS[flag], `sin bandera: ${nat}`);
  }
  assert.deepEqual(nationLabel('Germany'), { name: 'Alemania', flag: 'de' });
  assert.deepEqual(nationLabel('England'), { name: 'Inglaterra', flag: 'gb-eng' });
});

test('una carta por día, sin repetir jugador hasta dar la vuelta', () => {
  const seen = new Set<number>();
  for (let i = 0; i < answerCount(); i++) {
    const day = new Date(Date.UTC(2026, 8, 23 + i)).toISOString().slice(0, 10);
    const { player, card, statOrder } = getDailyCard(day);
    assert.ok(!seen.has(player.id), `repetido: ${player.name}`);
    seen.add(player.id);
    assert.ok(player.cards.includes(card));
    assert.deepEqual([...statOrder].sort(), [0, 1, 2, 3, 4, 5]);
  }
  assert.deepEqual(getDailyCard('2026-10-01'), getDailyCard('2026-10-01'));
});

test('las pistas aparecen en el orden pedido', () => {
  const steps = [0, 1, 2, 3, 4, 5].map((m) => revealed(m, false));
  assert.deepEqual(
    steps.map((r) => [r.stats, r.nation, r.position, r.overall]),
    [
      [2, false, false, false],
      [2, true, false, false],
      [2, true, true, false],
      [4, true, true, false],
      [6, true, true, false],
      [6, true, true, true],
    ],
  );
  assert.deepEqual(revealed(0, true), { stats: 6, nation: true, position: true, overall: true });
});

test('el buscador ignora tildes y mayúsculas', () => {
  assert.ok(searchPlayers('aguero').some((p) => p.name === 'Sergio Agüero'));
  assert.ok(searchPlayers('MESSI').some((p) => p.name === 'Lionel Messi'));
  assert.deepEqual(searchPlayers('m'), []);
});

test('etiquetas y texto para compartir', () => {
  assert.equal(editionLabel(14), 'FIFA 14');
  assert.equal(editionLabel(26), 'FC 26');
  assert.equal(cartaShareText(2, [1, 2, 3], 3, true), '¿Quién es la carta? #2 3/6\n🟥🟥🟩');
});
