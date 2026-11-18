import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getJugador } from '../lib/jugadores';
import {
  type Categoria,
  getDailyCategorias,
  MAX_POINTS,
  rankedAnswers,
  rarityLabel,
  rebuscadoShareText,
  scoreAnswer,
} from '../lib/rebuscado';
import { colors } from '../theme';
import RondasGame, { pointsColor } from './RondasGame';

type Props = {
  day: string;
  subtitle: string;
  onFinished: () => void;
};

const PREVIEW = 12;

export default function RebuscadoGame({ day, subtitle, onFinished }: Props) {
  const categorias = useMemo(() => getDailyCategorias(day), [day]);

  return (
    <RondasGame<Categoria>
      game="rebuscado"
      day={day}
      title="🕵️ Rebuscado"
      subtitle={subtitle}
      rounds={categorias}
      maxPerRound={MAX_POINTS}
      help="Una sola respuesta. Cuanto menos conocido sea el jugador, más puntos: de 10 por el más obvio a 100 por una joya oculta."
      renderPrompt={(c) => (
        <View style={styles.prompt}>
          <Text style={styles.promptText}>{c.t}</Text>
          <Text style={styles.promptSub}>{c.a.length} respuestas válidas</Text>
        </View>
      )}
      score={scoreAnswer}
      renderReveal={(c, pick) => <Reveal categoria={c} pick={pick} />}
      roundLabel={(c) => c.t}
      shareText={(num, picks) =>
        rebuscadoShareText(
          num,
          picks.map((p, i) => scoreAnswer(categorias[i], p)),
        )
      }
      nextLabel="Próximas categorías"
      onFinished={onFinished}
    />
  );
}

function Reveal({ categoria, pick }: { categoria: Categoria; pick: number | null }) {
  const [showAll, setShowAll] = useState(false);
  const points = scoreAnswer(categoria, pick);
  // De los más conocidos a los más rebuscados.
  const answers = useMemo(() => rankedAnswers(categoria).reverse(), [categoria]);
  const pickIndex = answers.findIndex((a) => a.jugador.id === pick);
  const visible = showAll ? answers : answers.slice(0, PREVIEW);
  const pickHidden = pickIndex >= visible.length;

  return (
    <View style={styles.reveal}>
      <View style={[styles.verdict, { backgroundColor: pointsColor(points, MAX_POINTS) }]}>
        {pick === null ? (
          <Text style={styles.verdictText}>Pasaste: 0 puntos</Text>
        ) : points > 0 ? (
          <Text style={styles.verdictText}>
            {getJugador(pick).name}: {points} puntos · {rarityLabel(points)}
          </Text>
        ) : (
          <Text style={styles.verdictText}>{getJugador(pick).name} no es válido: 0 puntos</Text>
        )}
      </View>

      <Text style={styles.listTitle}>Respuestas válidas, de la más obvia a la más rebuscada</Text>
      {visible.map((a) => (
        <AnswerRow key={a.jugador.id} name={a.jugador.name} points={a.points} mine={a.jugador.id === pick} />
      ))}
      {pick !== null && points > 0 && pickIndex < 0 && (
        <>
          <Text style={styles.ellipsis}>…</Text>
          <AnswerRow name={getJugador(pick).name} points={points} mine />
        </>
      )}
      {pickHidden && pickIndex >= 0 && (
        <>
          <Text style={styles.ellipsis}>…</Text>
          <AnswerRow name={answers[pickIndex].jugador.name} points={answers[pickIndex].points} mine />
        </>
      )}
      {answers.length > PREVIEW && (
        <Pressable onPress={() => setShowAll((v) => !v)} style={styles.more}>
          <Text style={styles.moreText}>
            {showAll ? 'Ver menos' : `Ver las ${answers.length} respuestas`}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function AnswerRow({ name, points, mine }: { name: string; points: number; mine?: boolean }) {
  return (
    <View style={[styles.row, mine && styles.rowMine]}>
      <Text style={[styles.rowName, mine && styles.rowNameMine]} numberOfLines={1}>
        {name}
        {mine ? '  ← tu respuesta' : ''}
      </Text>
      <Text style={styles.rowPoints}>{points}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: { gap: 4 },
  promptText: { fontSize: 22, fontWeight: '800', color: colors.pitchDark, lineHeight: 28 },
  promptSub: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  reveal: { gap: 6 },
  verdict: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  verdictText: { color: colors.chalk, fontWeight: '800', fontSize: 15 },
  listTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginTop: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  rowMine: { backgroundColor: colors.cellWord },
  rowName: { flex: 1, fontSize: 15, color: colors.text },
  rowNameMine: { fontWeight: '800' },
  rowPoints: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.pitchDark,
    fontVariant: ['tabular-nums'],
    minWidth: 30,
    textAlign: 'right',
  },
  ellipsis: { textAlign: 'center', color: colors.textMuted },
  more: { alignSelf: 'center', paddingVertical: 6 },
  moreText: { color: colors.pitchDark, fontWeight: '700', fontSize: 14 },
});
