import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getJugador } from '../lib/jugadores';
import {
  correctAnswers,
  distanceTo,
  getDailyPreguntas,
  type Pregunta,
  puestoLabel,
  RANKING_MAX,
  rankingShareText,
  scoreGuess,
  standings,
} from '../lib/ranking';
import { colors } from '../theme';
import RondasGame, { pointsColor } from './RondasGame';

type Props = {
  day: string;
  subtitle: string;
  onFinished: () => void;
};

// Cuántos puestos se muestran arriba y abajo del pedido al revelar.
const WINDOW = 3;

export default function RankingGame({ day, subtitle, onFinished }: Props) {
  const preguntas = useMemo(() => getDailyPreguntas(day), [day]);

  return (
    <RondasGame<Pregunta>
      game="ranking"
      day={day}
      title="📊 Ranking"
      subtitle={subtitle}
      rounds={preguntas}
      maxPerRound={RANKING_MAX}
      help="Un solo intento. Si acertás el puesto exacto sumás 100 puntos; si nombrás a alguien que está cerca en la tabla, sumás menos cuanto más lejos esté."
      renderPrompt={(p) => (
        <View style={styles.prompt}>
          <Text style={styles.promptSub}>{p.lista.t}</Text>
          <Text style={styles.promptText}>{p.text}</Text>
        </View>
      )}
      score={(p, pick) => scoreGuess(p.lista, p.target, pick).points}
      renderReveal={(p, pick) => <Reveal pregunta={p} pick={pick} />}
      roundLabel={(p) => `N.º ${p.target} · ${p.lista.t}`}
      shareText={(num, picks) =>
        rankingShareText(
          num,
          picks.map((pick, i) => scoreGuess(preguntas[i].lista, preguntas[i].target, pick)),
        )
      }
      nextLabel="Próximas preguntas"
      onFinished={onFinished}
    />
  );
}

function Reveal({ pregunta, pick }: { pregunta: Pregunta; pick: number | null }) {
  const { lista, target } = pregunta;
  const result = scoreGuess(lista, target, pick);
  const table = useMemo(() => standings(lista), [lista]);
  const correct = correctAnswers(lista, target);

  const rows = table.filter((p) => distanceTo(p, target) <= WINDOW);
  const mine = result.puesto;
  const mineOutside = mine !== null && !rows.some((p) => p.jugador.id === mine.jugador.id);

  let verdict: string;
  if (pick === null) verdict = 'Pasaste: 0 puntos';
  else if (!mine) {
    verdict = `${getJugador(pick).name} no está entre los primeros ${table.length}: 0 puntos`;
  } else if (result.distance === 0) verdict = `¡Exacto! ${mine.jugador.name}: 100 puntos`;
  else {
    const tied = mine.from === mine.to ? '' : ', empatado';
    verdict = `${mine.jugador.name} está ${mine.from}.º${tied} (a ${result.distance} ${
      result.distance === 1 ? 'puesto' : 'puestos'
    }): ${result.points} puntos`;
  }

  return (
    <View style={styles.reveal}>
      <View style={[styles.verdict, { backgroundColor: pointsColor(result.points, RANKING_MAX) }]}>
        <Text style={styles.verdictText}>{verdict}</Text>
      </View>
      <Text style={styles.answer}>
        El n.º {target}: <Text style={styles.answerName}>{correct.map((c) => c.jugador.name).join(' y ')}</Text>{' '}
        ({correct[0]?.value} {lista.u})
      </Text>

      <View style={styles.table}>
        {mineOutside && mine.from < target && (
          <>
            <Row puesto={puestoLabel(mine)} name={mine.jugador.name} value={mine.value} kind="mine" />
            <Text style={styles.ellipsis}>…</Text>
          </>
        )}
        {rows.map((p) => (
          <Row
            key={p.jugador.id}
            puesto={puestoLabel(p)}
            name={p.jugador.name}
            value={p.value}
            kind={
              distanceTo(p, target) === 0 ? 'target' : p.jugador.id === pick ? 'mine' : undefined
            }
          />
        ))}
        {mineOutside && mine.from > target && (
          <>
            <Text style={styles.ellipsis}>…</Text>
            <Row puesto={puestoLabel(mine)} name={mine.jugador.name} value={mine.value} kind="mine" />
          </>
        )}
      </View>
      <Text style={styles.source}>
        Cantidad de {lista.u}. Fuente: Wikipedia en inglés, noviembre de 2026.
      </Text>
    </View>
  );
}

function Row({
  puesto,
  name,
  value,
  kind,
}: {
  puesto: string;
  name: string;
  value: number;
  kind?: 'target' | 'mine';
}) {
  return (
    <View style={[styles.row, kind === 'target' && styles.rowTarget, kind === 'mine' && styles.rowMine]}>
      <Text style={styles.rowPuesto}>{puesto}</Text>
      <Text style={[styles.rowName, kind && styles.rowNameBold]} numberOfLines={1}>
        {name}
        {kind === 'mine' ? '  ← vos' : ''}
      </Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: { gap: 4 },
  promptText: { fontSize: 21, fontWeight: '800', color: colors.pitchDark, lineHeight: 27 },
  promptSub: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  reveal: { gap: 8 },
  verdict: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  verdictText: { color: colors.chalk, fontWeight: '800', fontSize: 15 },
  answer: { fontSize: 15, color: colors.text },
  answerName: { fontWeight: '800', color: colors.pitchDark },
  table: { gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  rowTarget: { backgroundColor: '#CFEFD9' },
  rowMine: { backgroundColor: '#FFF1BF' },
  rowPuesto: {
    width: 52,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  rowName: { flex: 1, fontSize: 15, color: colors.text },
  rowNameBold: { fontWeight: '800' },
  rowValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.pitchDark,
    fontVariant: ['tabular-nums'],
    minWidth: 36,
    textAlign: 'right',
  },
  ellipsis: { textAlign: 'center', color: colors.textMuted },
  source: { fontSize: 11, color: colors.textMuted },
});
