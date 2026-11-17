import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { puzzleNumber } from '../lib/daily';
import type { Jugador } from '../lib/jugadores';
import {
  EMPTY_PUNTOS_STATS,
  loadPuntosProgress,
  loadPuntosStats,
  type PuntosGame,
  type PuntosStats,
  recordPuntosResult,
  savePuntosProgress,
} from '../lib/storage';
import { colors } from '../theme';
import Header from './Header';
import PlayerSearch from './PlayerSearch';
import PuntosResult from './PuntosResult';

type Props<T> = {
  game: PuntosGame;
  day: string;
  title: string;
  subtitle: string;
  rounds: T[];
  maxPerRound: number;
  // Explicación corta de cómo se puntúa, visible mientras se juega.
  help: string;
  renderPrompt: (round: T) => ReactNode;
  score: (round: T, pick: number | null) => number;
  renderReveal: (round: T, pick: number | null) => ReactNode;
  // Nombre corto de la ronda para el resumen final.
  roundLabel: (round: T) => string;
  shareText: (num: number, picks: (number | null)[]) => string;
  nextLabel: string;
  onFinished: () => void;
};

export function pointsColor(points: number, max: number) {
  if (points <= 0) return colors.absent;
  return points >= max / 2 ? colors.correct : colors.present;
}

// Juego por rondas con puntaje: una consigna por ronda, una sola respuesta,
// se muestra la solución y se pasa a la siguiente. Lo usan Rebuscado y Ranking.
export default function RondasGame<T>({
  game,
  day,
  title,
  subtitle,
  rounds,
  maxPerRound,
  help,
  renderPrompt,
  score,
  renderReveal,
  roundLabel,
  shareText,
  nextLabel,
  onFinished,
}: Props<T>) {
  const number = puzzleNumber(day);
  const [picks, setPicks] = useState<(number | null)[]>([]);
  // Ronda en pantalla; cuando vale rounds.length se muestra el resumen final.
  const [view, setView] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState<PuntosStats>(EMPTY_PUNTOS_STATS);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadPuntosProgress(game, day), loadPuntosStats(game, day)]).then(
      ([progress, saved]) => {
        if (cancelled) return;
        const savedPicks = (progress?.picks ?? []).slice(0, rounds.length);
        setPicks(savedPicks);
        setView(savedPicks.length);
        setStats(saved);
        setLoaded(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [game, day, rounds.length]);

  const points = picks.map((pick, i) => score(rounds[i], pick));
  const total = points.reduce((a, b) => a + b, 0);
  const finished = picks.length === rounds.length;
  const max = rounds.length * maxPerRound;

  const answer = (pick: number | null) => {
    if (!loaded || picks.length !== view || finished) return;
    const next = [...picks, pick];
    setPicks(next);
    savePuntosProgress(game, day, { picks: next });
    if (next.length === rounds.length) {
      const finalScore = next.reduce<number>((sum, p, i) => sum + score(rounds[i], p), 0);
      onFinished();
      recordPuntosResult(game, day, finalScore).then(setStats);
    }
  };

  const onPick = (jugador: Jugador) => answer(jugador.id);

  const inSummary = view >= rounds.length;
  const round = inSummary ? null : rounds[view];
  const answered = view < picks.length;

  return (
    <View style={styles.container}>
      <Header
        title={title}
        subtitle={subtitle}
        right={
          <Pressable onPress={() => setShowResult(true)} style={styles.headerRight}>
            <Text style={styles.headerScore}>
              {total}
              <Text style={styles.headerMax}> / {max}</Text>
            </Text>
            <Text style={styles.headerSmall}>Estadísticas</Text>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.pills} accessibilityLabel="Progreso de las rondas">
          {rounds.map((_, i) => {
            const done = i < picks.length;
            const current = i === view;
            return (
              <Pressable
                key={i}
                disabled={!done}
                onPress={() => setView(i)}
                accessibilityLabel={`Ronda ${i + 1}`}
                style={[
                  styles.pill,
                  done && { backgroundColor: pointsColor(points[i], maxPerRound) },
                  current && styles.pillCurrent,
                ]}
              >
                <Text style={[styles.pillText, done && styles.pillTextDone]}>
                  {done ? points[i] : i + 1}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {round !== null && (
          <View style={styles.card}>
            <Text style={styles.roundLabel}>
              Ronda {view + 1} de {rounds.length}
            </Text>
            {renderPrompt(round)}
            {!answered && (
              <>
                <Text style={styles.help}>{help}</Text>
                <PlayerSearch onPick={onPick} />
                <Pressable onPress={() => answer(null)} style={styles.skip}>
                  <Text style={styles.skipText}>No sé, paso (0 puntos)</Text>
                </Pressable>
              </>
            )}
            {answered && (
              <>
                {renderReveal(round, picks[view])}
                <Pressable
                  onPress={() => {
                    const last = view + 1 >= rounds.length;
                    setView(finished && last ? rounds.length : view + 1);
                    if (finished && last) setShowResult(true);
                  }}
                  style={styles.primary}
                >
                  <Text style={styles.primaryText}>
                    {view + 1 >= rounds.length ? 'Ver resultado' : 'Siguiente'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {inSummary && (
          <View style={styles.card}>
            <Text style={styles.roundLabel}>Resultado de hoy</Text>
            <Text style={styles.total}>
              {total}
              <Text style={styles.totalMax}> / {max} puntos</Text>
            </Text>
            {rounds.map((r, i) => (
              <Pressable key={i} onPress={() => setView(i)} style={styles.summaryRow}>
                <Text style={styles.summaryLabel} numberOfLines={2}>
                  {roundLabel(r)}
                </Text>
                <View
                  style={[
                    styles.summaryPoints,
                    { backgroundColor: pointsColor(points[i], maxPerRound) },
                  ]}
                >
                  <Text style={styles.summaryPointsText}>{points[i]}</Text>
                </View>
              </Pressable>
            ))}
            <Text style={styles.help}>Tocá una ronda para volver a ver sus respuestas.</Text>
            <Pressable onPress={() => setShowResult(true)} style={styles.primary}>
              <Text style={styles.primaryText}>Estadísticas y compartir</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <PuntosResult
        visible={showResult}
        finished={finished}
        total={total}
        max={max}
        shareText={shareText(number, picks)}
        nextLabel={nextLabel}
        stats={stats}
        onClose={() => setShowResult(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  headerRight: { alignItems: 'flex-end' },
  headerScore: { color: colors.chalk, fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  headerMax: { fontSize: 13, fontWeight: '600', color: '#BFE5CD' },
  headerSmall: { color: '#BFE5CD', fontSize: 12, marginTop: 2 },
  content: { padding: 16, gap: 14, alignItems: 'center' },
  pills: { flexDirection: 'row', gap: 8 },
  pill: {
    width: 46,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCE7E0',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pillCurrent: { borderColor: colors.pitchDark },
  pillText: { fontSize: 14, fontWeight: '800', color: colors.textMuted },
  pillTextDone: { color: colors.chalk },
  card: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.chalk,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#D5E2D9',
  },
  roundLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  help: { fontSize: 13, color: colors.textMuted },
  skip: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 10 },
  skipText: { color: colors.pitchDark, fontWeight: '700', fontSize: 14 },
  primary: {
    backgroundColor: colors.pitch,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: colors.chalk, fontWeight: '700', fontSize: 16 },
  total: { fontSize: 40, fontWeight: '900', color: colors.pitchDark, fontVariant: ['tabular-nums'] },
  totalMax: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D5E2D9',
  },
  summaryLabel: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '600' },
  summaryPoints: {
    minWidth: 44,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryPointsText: { color: colors.chalk, fontWeight: '800', fontSize: 14 },
});
