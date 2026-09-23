import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { msUntilNextPuzzle, puzzleNumber } from '../lib/daily';
import {
  EMPTY_WORDLE_STATS,
  loadWordleProgress,
  loadWordleStats,
  recordWordleResult,
  saveWordleProgress,
  type WordleStats,
} from '../lib/storage';
import {
  getDailyWord,
  HINT_AFTER,
  keyboardStatuses,
  type LetterStatus,
  MAX_GUESSES,
  scoreGuess,
  wordleShareText,
} from '../lib/wordle';
import { colors } from '../theme';
import Header from './Header';
import Keyboard from './Keyboard';

const TILE_COLORS: Record<LetterStatus, string> = {
  correct: colors.correct,
  present: colors.present,
  absent: colors.absent,
};

type Props = {
  day: string;
  subtitle: string;
  tabs: ReactNode;
  onFinished: () => void;
};

export default function AdivinaGame({ day, subtitle, tabs, onFinished }: Props) {
  const { answer, clue } = useMemo(() => getDailyWord(day), [day]);
  const number = puzzleNumber(day);
  const { width } = useWindowDimensions();

  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [finished, setFinished] = useState(false);
  const [won, setWon] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [stats, setStats] = useState<WordleStats>(EMPTY_WORDLE_STATS);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadWordleProgress(day), loadWordleStats(day)]).then(([progress, saved]) => {
      if (cancelled) return;
      if (progress) {
        setGuesses(progress.guesses);
        setFinished(progress.finished);
        setWon(progress.won);
      }
      setStats(saved);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [day]);

  useEffect(() => {
    if (loaded) saveWordleProgress(day, { guesses, finished, won });
  }, [day, loaded, guesses, finished, won]);

  // Los avisos ("Faltan letras") desaparecen solos.
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), 1800);
    return () => clearTimeout(id);
  }, [message]);

  const onLetter = useCallback(
    (letter: string) => {
      if (!finished) setCurrent((c) => (c.length < answer.length ? c + letter : c));
    },
    [finished, answer.length],
  );

  const onBackspace = useCallback(() => setCurrent((c) => c.slice(0, -1)), []);

  const onEnter = useCallback(() => {
    if (finished || !loaded) return;
    if (current.length < answer.length) {
      setMessage(`Faltan letras: son ${answer.length}`);
      return;
    }
    const next = [...guesses, current];
    setGuesses(next);
    setCurrent('');
    const isWin = current === answer;
    if (isWin || next.length >= MAX_GUESSES) {
      setFinished(true);
      setWon(isWin);
      setMessage(isWin ? '¡Golazo!' : `Era ${answer}`);
      onFinished();
      recordWordleResult(day, isWin, next.length).then((s) => {
        setStats(s);
        setTimeout(() => setShowResult(true), 900);
      });
    }
  }, [finished, loaded, current, answer, guesses, day, onFinished]);

  // Teclado físico en la versión web.
  const handlers = useRef({ onLetter, onBackspace, onEnter, modalOpen: false });
  useEffect(() => {
    handlers.current = { onLetter, onBackspace, onEnter, modalOpen: showResult };
  });
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || handlers.current.modalOpen) return;
      if (/^[a-zA-Z]$/.test(e.key)) handlers.current.onLetter(e.key.toUpperCase());
      else if (e.key === 'Backspace') handlers.current.onBackspace();
      else if (e.key === 'Enter') handlers.current.onEnter();
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const statuses = useMemo(() => keyboardStatuses(guesses, answer), [guesses, answer]);
  const showHint = guesses.length >= HINT_AFTER || finished;
  const tile = Math.min(56, Math.floor((Math.min(width, 460) - 32) / answer.length) - 6);

  const rows = Array.from({ length: MAX_GUESSES }, (_, r) => {
    if (r < guesses.length) return { text: guesses[r], score: scoreGuess(guesses[r], answer) };
    if (r === guesses.length && !finished) return { text: current, score: null };
    return { text: '', score: null };
  });

  return (
    <View style={styles.container}>
      <Header
        title="⚽ Adiviná el crack"
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

      <View style={styles.boardArea}>
        <Text style={styles.intro}>
          {answer.length} letras · jugador, club o palabra de fútbol
        </Text>
        <View style={styles.board}>
          {rows.map((row, r) => (
            <View key={r} style={styles.row}>
              {Array.from({ length: answer.length }, (_, i) => {
                const letter = row.text[i] ?? '';
                const status = row.score?.[i];
                return (
                  <View
                    key={i}
                    style={[
                      styles.tile,
                      { width: tile, height: tile },
                      letter && !status && styles.tileFilled,
                      status && { backgroundColor: TILE_COLORS[status], borderColor: TILE_COLORS[status] },
                    ]}
                  >
                    <Text
                      style={[styles.tileText, { fontSize: tile * 0.5 }, status && styles.tileTextOnColor]}
                    >
                      {letter}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        <View style={styles.hintBox}>
          {showHint ? (
            <Text style={styles.hint}>
              <Text style={styles.hintLabel}>Pista: </Text>
              {clue}
            </Text>
          ) : (
            <Text style={styles.hintLocked}>
              La pista se desbloquea después del intento {HINT_AFTER}
            </Text>
          )}
        </View>
      </View>

      {message && (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{message}</Text>
        </View>
      )}

      <View style={styles.bottom}>
        <Keyboard
          onLetter={onLetter}
          onBackspace={onBackspace}
          onEnter={onEnter}
          statuses={statuses}
        />
      </View>

      <AdivinaResult
        visible={showResult}
        finished={finished}
        won={won}
        answer={answer}
        number={number}
        guesses={guesses}
        stats={stats}
        onClose={() => setShowResult(false)}
      />
    </View>
  );
}

function AdivinaResult({
  visible,
  finished,
  won,
  answer,
  number,
  guesses,
  stats,
  onClose,
}: {
  visible: boolean;
  finished: boolean;
  won: boolean;
  answer: string;
  number: number;
  guesses: string[];
  stats: WordleStats;
  onClose: () => void;
}) {
  const [countdown, setCountdown] = useState(msUntilNextPuzzle());
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setCountdown(msUntilNextPuzzle()), 1000);
    return () => clearInterval(id);
  }, [visible]);

  const share = () => {
    const text = wordleShareText(number, guesses, answer, won);
    if (Platform.OS === 'web') {
      navigator.clipboard
        ?.writeText(text)
        .then(() => setCopied(true))
        .catch(() => {});
      return;
    }
    Share.share({ message: text }).catch(() => {});
  };

  const maxBar = Math.max(1, ...stats.distribution);
  const winPct = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {!finished ? 'Estadísticas' : won ? '¡Golazo! 🏆' : 'Esta vez no fue 😔'}
          </Text>
          {finished && (
            <Text style={styles.cardBody}>
              {won ? `Lo sacaste en ${guesses.length} de ${MAX_GUESSES}. ` : ''}La respuesta era{' '}
              <Text style={styles.answer}>{answer}</Text>.
            </Text>
          )}
          <View style={styles.statsRow}>
            <StatBox value={stats.played} label="Jugados" />
            <StatBox value={winPct} label="% ganados" />
            <StatBox value={stats.currentStreak} label="Racha" />
            <StatBox value={stats.maxStreak} label="Mejor racha" />
          </View>
          <View style={styles.dist}>
            <Text style={styles.distTitle}>Intentos para acertar</Text>
            {stats.distribution.map((count, i) => {
              const isToday = finished && won && guesses.length === i + 1;
              return (
                <View key={i} style={styles.distRow}>
                  <Text style={styles.distLabel}>{i + 1}</Text>
                  <View
                    style={[
                      styles.distBar,
                      { flexGrow: count / maxBar, flexBasis: 0 },
                      isToday && { backgroundColor: colors.correct },
                    ]}
                  >
                    <Text style={styles.distCount}>{count}</Text>
                  </View>
                  <View style={{ flexGrow: 1 - count / maxBar, flexBasis: 0 }} />
                </View>
              );
            })}
          </View>
          <Text style={styles.cardBody}>Próxima palabra en {formatCountdown(countdown)}</Text>
          {finished && (
            <Pressable onPress={share} style={styles.primary}>
              <Text style={styles.primaryText}>{copied ? '¡Copiado!' : 'Compartir resultado'}</Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} style={styles.secondary}>
            <Text style={styles.secondaryText}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  headerRight: { alignItems: 'flex-end' },
  headerStat: { color: colors.chalk, fontSize: 18, fontWeight: '700' },
  headerSmall: { color: '#BFE5CD', fontSize: 12, marginTop: 2 },
  boardArea: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 12 },
  intro: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  board: { gap: 6 },
  row: { flexDirection: 'row', gap: 6 },
  tile: {
    borderWidth: 2,
    borderColor: '#C9D6CE',
    backgroundColor: colors.cell,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  tileFilled: { borderColor: colors.textMuted },
  tileText: { fontWeight: '800', color: colors.text },
  tileTextOnColor: { color: colors.chalk },
  hintBox: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, maxWidth: 440 },
  hint: { fontSize: 15, color: colors.text, textAlign: 'center' },
  hintLabel: { fontWeight: '800', color: colors.pitchDark },
  hintLocked: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  toast: {
    position: 'absolute',
    top: 150,
    alignSelf: 'center',
    backgroundColor: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  toastText: { color: colors.chalk, fontWeight: '700', fontSize: 15 },
  bottom: { paddingBottom: 8 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: colors.chalk,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: colors.pitchDark, textAlign: 'center' },
  cardBody: { fontSize: 15, color: colors.text, textAlign: 'center' },
  answer: { fontWeight: '800', color: colors.pitchDark },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  dist: { gap: 4 },
  distTitle: { fontSize: 13, fontWeight: '800', color: colors.text, marginBottom: 2 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  distLabel: { width: 12, fontSize: 13, fontWeight: '700', color: colors.text },
  distBar: {
    minWidth: 24,
    backgroundColor: colors.absent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'flex-end',
    borderRadius: 3,
  },
  distCount: { color: colors.chalk, fontSize: 12, fontWeight: '700' },
  primary: {
    backgroundColor: colors.pitch,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: colors.chalk, fontWeight: '700', fontSize: 16 },
  secondary: { paddingVertical: 8, alignItems: 'center' },
  secondaryText: { color: colors.pitchDark, fontWeight: '700', fontSize: 15 },
});
