import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  cartaShareText,
  editionLabel,
  FIELD_STATS,
  getDailyCard,
  GK_STATS,
  MAX_CARD_GUESSES,
  nationLabel,
  NEW_CLUE,
  playerName,
  positionLabel,
  revealed,
  searchPlayers,
} from '../lib/cartas';
import { puzzleNumber } from '../lib/daily';
import {
  CARTA_STATS_KEY,
  EMPTY_WORDLE_STATS,
  loadCartaProgress,
  loadWordleStats,
  recordWordleResult,
  saveCartaProgress,
  type WordleStats,
} from '../lib/storage';
import { colors } from '../theme';
import DailyResult from './DailyResult';
import Flag from './Flag';
import Header from './Header';

type Props = {
  day: string;
  subtitle: string;
  tabs: ReactNode;
  onFinished: () => void;
};

export default function CartaGame({ day, subtitle, tabs, onFinished }: Props) {
  const { player, card, statOrder } = useMemo(() => getDailyCard(day), [day]);
  const number = puzzleNumber(day);

  const [guesses, setGuesses] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [won, setWon] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');
  const [stats, setStats] = useState<WordleStats>(EMPTY_WORDLE_STATS);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadCartaProgress(day), loadWordleStats(day, CARTA_STATS_KEY)]).then(
      ([progress, saved]) => {
        if (cancelled) return;
        if (progress) {
          setGuesses(progress.guesses);
          setFinished(progress.finished);
          setWon(progress.won);
        }
        setStats(saved);
        setLoaded(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [day]);

  useEffect(() => {
    if (loaded) saveCartaProgress(day, { guesses, finished, won });
  }, [day, loaded, guesses, finished, won]);

  const misses = guesses.filter((g) => g !== player.id).length;
  const show = revealed(misses, finished);
  const visibleStats = new Set(statOrder.slice(0, show.stats));
  const isGk = card.pos === 'GK';
  const labels = isGk ? GK_STATS : FIELD_STATS;
  const nation = nationLabel(player.nat);
  const [posCode, posName] = positionLabel(card.pos);

  const suggestions = useMemo(
    () => (finished ? [] : searchPlayers(query).filter((s) => !guesses.includes(s.id))),
    [query, finished, guesses],
  );

  const guess = (id: number) => {
    if (finished || !loaded) return;
    const next = [...guesses, id];
    setGuesses(next);
    setQuery('');
    const isWin = id === player.id;
    if (isWin || next.length >= MAX_CARD_GUESSES) {
      setFinished(true);
      setWon(isWin);
      onFinished();
      recordWordleResult(day, isWin, next.length, CARTA_STATS_KEY).then((s) => {
        setStats(s);
        setTimeout(() => setShowResult(true), 700);
      });
    }
  };

  const lastWasMiss = guesses.length > 0 && guesses[guesses.length - 1] !== player.id;

  return (
    <View style={styles.container}>
      <Header
        title="⚽ ¿Quién es la carta?"
        subtitle={subtitle}
        right={
          <Pressable onPress={() => setShowResult(true)} style={styles.headerRight}>
            <Text style={styles.headerStat}>🔥 {stats.currentStreak}</Text>
            <Text style={styles.headerSmall}>Estadísticas</Text>
          </Pressable>
        }
      >
        {tabs}
      </Header>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card} accessibilityLabel="Carta del jugador">
          <View style={styles.cardTop}>
            <View style={styles.cardSide}>
              <Text style={styles.ovr}>{show.overall ? card.ovr : '??'}</Text>
              <Text style={styles.pos}>{show.position ? posCode : '?'}</Text>
              <View style={styles.flag}>
                {show.nation ? (
                  <Flag code={nation.flag} width={34} />
                ) : (
                  <View style={styles.flagHidden}>
                    <Text style={styles.flagHiddenText}>?</Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.silhouette}>
              <Text style={styles.silhouetteText}>{finished ? '⚽' : '?'}</Text>
            </View>
            <View style={styles.edition}>
              <Text style={styles.editionText}>{editionLabel(card.v)}</Text>
            </View>
          </View>
          <Text style={styles.cardName} numberOfLines={1}>
            {finished ? player.name.toUpperCase() : '? ? ?'}
          </Text>
          <View style={styles.divider} />
          <View style={styles.statsGrid}>
            {[0, 1].map((col) => (
              <View key={col} style={styles.statsCol}>
                {[0, 1, 2].map((row) => {
                  const i = col * 3 + row;
                  const visible = visibleStats.has(i);
                  return (
                    <View key={i} style={styles.statRow}>
                      <Text style={[styles.statValue, !visible && styles.statHidden]}>
                        {visible ? card.s[i] : '??'}
                      </Text>
                      <Text style={styles.statLabel}>{labels[i]}</Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.clues}>
          <Clue
            label="Nacionalidad"
            value={show.nation ? nation.name : null}
            flag={show.nation ? nation.flag : undefined}
          />
          <Clue label="Posición" value={show.position ? `${posCode} · ${posName}` : null} />
          {finished && <Clue label="Club" value={card.club} />}
        </View>

        {finished ? (
          <View style={styles.finalBox}>
            <Text style={styles.finalTitle}>
              {won ? '¡Golazo! 🏆' : 'Era...'} {player.name}
            </Text>
            <Pressable onPress={() => setShowResult(true)} style={styles.primary}>
              <Text style={styles.primaryText}>Ver resultado</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.guessArea}>
            <Text style={styles.attempt}>
              Intento {guesses.length + 1} de {MAX_CARD_GUESSES}
              {lastWasMiss && misses < NEW_CLUE.length ? ` · ${NEW_CLUE[misses]}` : ''}
            </Text>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Escribí el nombre del jugador…"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              autoCapitalize="words"
              style={styles.input}
              accessibilityLabel="Buscar jugador"
            />
            {suggestions.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => guess(s.id)}
                style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.suggestionName}>{s.name}</Text>
                <Flag code={nationLabel(s.nat).flag} width={26} />
              </Pressable>
            ))}
            {query.trim().length >= 2 && suggestions.length === 0 && (
              <Text style={styles.noResults}>No encontramos a nadie con ese nombre</Text>
            )}
          </View>
        )}

        {guesses.length > 0 && (
          <View style={styles.history}>
            {guesses.map((id, i) => (
              <Text key={i} style={styles.historyItem}>
                {id === player.id ? '✅' : '❌'} {playerName(id)}
              </Text>
            ))}
          </View>
        )}

        <Text style={styles.source}>Stats de SoFIFA (FIFA 14 a FC 26).</Text>
      </ScrollView>

      <DailyResult
        visible={showResult}
        finished={finished}
        won={won}
        answer={player.name}
        attempts={guesses.length}
        maxAttempts={MAX_CARD_GUESSES}
        shareText={cartaShareText(number, guesses, player.id, won)}
        nextLabel="Próxima carta"
        stats={stats}
        onClose={() => setShowResult(false)}
      />
    </View>
  );
}

function Clue({
  label,
  value,
  flag,
}: {
  label: string;
  value: string | null;
  flag?: string | null;
}) {
  return (
    <View style={styles.clue}>
      <Text style={styles.clueLabel}>{label}</Text>
      <View style={styles.clueRow}>
        {flag !== undefined && <Flag code={flag} width={20} />}
        <Text style={[styles.clueValue, !value && styles.clueLocked]}>{value ?? '🔒'}</Text>
      </View>
    </View>
  );
}

const GOLD = '#E3C46A';
const GOLD_DARK = '#7A5B12';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  headerRight: { alignItems: 'flex-end' },
  headerStat: { color: colors.chalk, fontSize: 18, fontWeight: '700' },
  headerSmall: { color: '#BFE5CD', fontSize: 12, marginTop: 2 },
  content: { padding: 16, gap: 14, alignItems: 'center' },
  card: {
    width: 250,
    borderRadius: 18,
    backgroundColor: GOLD,
    borderWidth: 3,
    borderColor: '#B8912E',
    paddingHorizontal: 16,
    paddingVertical: 14,
    boxShadow: '0 6px 16px rgba(0, 0, 0, 0.25)',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardSide: { alignItems: 'center', width: 48 },
  ovr: { fontSize: 34, fontWeight: '900', color: GOLD_DARK, lineHeight: 38 },
  pos: { fontSize: 16, fontWeight: '800', color: GOLD_DARK },
  flag: { marginTop: 6 },
  flagHidden: {
    width: 34,
    height: 26,
    borderRadius: 3,
    backgroundColor: 'rgba(122, 91, 18, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagHiddenText: { color: GOLD_DARK, fontWeight: '900' },
  silhouette: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(122, 91, 18, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  silhouetteText: { fontSize: 48, fontWeight: '900', color: GOLD_DARK },
  edition: {
    backgroundColor: GOLD_DARK,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  editionText: { color: GOLD, fontSize: 11, fontWeight: '800' },
  cardName: {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '900',
    color: GOLD_DARK,
    marginTop: 10,
    letterSpacing: 0.5,
  },
  divider: { height: 1, backgroundColor: 'rgba(122, 91, 18, 0.4)', marginVertical: 8 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statsCol: { gap: 4 },
  statRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: GOLD_DARK,
    width: 30,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  statHidden: { opacity: 0.45 },
  statLabel: { fontSize: 14, fontWeight: '700', color: GOLD_DARK },
  clues: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  clue: {
    backgroundColor: colors.chalk,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#D5E2D9',
  },
  clueLabel: { fontSize: 11, color: colors.textMuted, fontWeight: '700' },
  clueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clueValue: { fontSize: 14, color: colors.text, fontWeight: '700' },
  clueLocked: { color: colors.textMuted },
  guessArea: { width: '100%', maxWidth: 440, gap: 6 },
  attempt: { fontSize: 13, color: colors.pitchDark, fontWeight: '700', textAlign: 'center' },
  input: {
    backgroundColor: colors.chalk,
    borderWidth: 2,
    borderColor: colors.pitch,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  suggestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.chalk,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#D5E2D9',
  },
  suggestionName: { fontSize: 15, color: colors.text, fontWeight: '600', flexShrink: 1 },
  noResults: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  finalBox: { alignItems: 'center', gap: 10 },
  finalTitle: { fontSize: 18, fontWeight: '800', color: colors.pitchDark, textAlign: 'center' },
  primary: {
    backgroundColor: colors.pitch,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  primaryText: { color: colors.chalk, fontWeight: '700', fontSize: 15 },
  history: { width: '100%', maxWidth: 440, gap: 4 },
  historyItem: { fontSize: 15, color: colors.text },
  source: { fontSize: 11, color: colors.textMuted, marginTop: 8 },
});
