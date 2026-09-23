import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import Grid from './src/components/Grid';
import Keyboard from './src/components/Keyboard';
import { dateKey, getDailyPuzzle, msUntilNextPuzzle, puzzleNumber } from './src/lib/daily';
import type { Direction, PlacedWord } from './src/lib/generator';
import {
  cellsOf,
  emptyEntries,
  firstEmptyCell,
  formatTime,
  isSolved,
  nextCellInWord,
  type Pos,
  prevCellInWord,
  shareText,
  wordAt,
} from './src/lib/game';
import {
  EMPTY_STATS,
  loadProgress,
  loadStats,
  recordWin,
  saveProgress,
  type Stats,
} from './src/lib/storage';
import { colors } from './src/theme';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <Game />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Game() {
  const [day, setDay] = useState(dateKey);

  // A la medianoche aparece el crucigrama nuevo.
  useEffect(() => {
    const id = setInterval(() => setDay(dateKey()), 1000);
    return () => clearInterval(id);
  }, []);

  return <DailyGame key={day} day={day} />;
}

function DailyGame({ day }: { day: string }) {
  const puzzle = useMemo(() => getDailyPuzzle(day), [day]);
  const { width } = useWindowDimensions();

  const [entries, setEntries] = useState(() => emptyEntries(puzzle));
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [elapsed, setElapsed] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [showResult, setShowResult] = useState(false);
  const [showClues, setShowClues] = useState(false);

  const firstWord = puzzle.words[0];
  const [selected, setSelected] = useState<Pos>({ row: firstWord.row, col: firstWord.col });
  const [direction, setDirection] = useState<Direction>(firstWord.direction);

  // Cargar el progreso guardado del día.
  useEffect(() => {
    let cancelled = false;
    Promise.all([loadProgress(day), loadStats(day)]).then(([progress, savedStats]) => {
      if (cancelled) return;
      if (progress) {
        setEntries(progress.entries);
        setRevealed(new Set(progress.revealed));
        setElapsed(progress.elapsed);
        setCompleted(progress.completed);
      }
      setStats(savedStats);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [day, puzzle]);

  // Reloj: suma segundos mientras se juega.
  useEffect(() => {
    if (!loaded || completed) return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [loaded, completed]);

  // Guardar el progreso.
  useEffect(() => {
    if (!loaded) return;
    saveProgress(day, { entries, revealed: [...revealed], elapsed, completed });
  }, [day, loaded, entries, revealed, elapsed, completed]);

  // Detectar cuando se completa el crucigrama.
  useEffect(() => {
    if (!loaded || completed || !isSolved(puzzle, entries)) return;
    setCompleted(true);
    setShowResult(true);
    recordWin(day, revealed.size === 0).then(setStats);
  }, [loaded, completed, puzzle, entries, day, revealed]);

  const activeWord: PlacedWord =
    wordAt(puzzle, selected, direction) ??
    wordAt(puzzle, selected, direction === 'across' ? 'down' : 'across') ??
    firstWord;

  const highlighted = useMemo(
    () => new Set(cellsOf(activeWord).map((c) => `${c.row},${c.col}`)),
    [activeWord],
  );

  const selectWord = useCallback(
    (word: PlacedWord) => {
      setDirection(word.direction);
      setSelected(firstEmptyCell(word, entries));
    },
    [entries],
  );

  const onCellPress = useCallback(
    (pos: Pos) => {
      if (pos.row === selected.row && pos.col === selected.col) {
        // Tocar la misma casilla cambia la dirección si hay palabra cruzada.
        const other = direction === 'across' ? 'down' : 'across';
        if (wordAt(puzzle, pos, other)) setDirection(other);
        return;
      }
      setSelected(pos);
      if (!wordAt(puzzle, pos, direction)) {
        setDirection(direction === 'across' ? 'down' : 'across');
      }
    },
    [puzzle, selected, direction],
  );

  const setCell = useCallback((pos: Pos, letter: string) => {
    const k = `${pos.row},${pos.col}`;
    setEntries((prev) => {
      const next = prev.map((row) => row.slice());
      next[pos.row][pos.col] = letter;
      return next;
    });
    setWrong((prev) => {
      if (!prev.has(k)) return prev;
      const next = new Set(prev);
      next.delete(k);
      return next;
    });
  }, []);

  const isLocked = useCallback(
    (pos: Pos) => completed || revealed.has(`${pos.row},${pos.col}`),
    [completed, revealed],
  );

  const onLetter = useCallback(
    (letter: string) => {
      if (completed) return;
      if (!isLocked(selected)) setCell(selected, letter);
      const updated = entries.map((row) => row.slice());
      updated[selected.row][selected.col] = letter;
      setSelected(nextCellInWord(activeWord, selected, updated));
    },
    [completed, isLocked, selected, setCell, entries, activeWord],
  );

  const onBackspace = useCallback(() => {
    if (completed) return;
    if (entries[selected.row][selected.col] && !isLocked(selected)) {
      setCell(selected, '');
      return;
    }
    const prev = prevCellInWord(activeWord, selected);
    setSelected(prev);
    if (!isLocked(prev)) setCell(prev, '');
  }, [completed, entries, selected, isLocked, setCell, activeWord]);

  const moveWord = useCallback(
    (delta: number) => {
      const index = puzzle.words.indexOf(activeWord);
      const next = puzzle.words[(index + delta + puzzle.words.length) % puzzle.words.length];
      selectWord(next);
    },
    [puzzle, activeWord, selectWord],
  );

  const checkAnswers = () => {
    const bad = new Set<string>();
    puzzle.solution.forEach((row, r) =>
      row.forEach((letter, c) => {
        const value = entries[r][c];
        if (letter && value && value !== letter) bad.add(`${r},${c}`);
      }),
    );
    setWrong(bad);
  };

  const revealLetter = () => {
    if (completed) return;
    const { row, col } = selected;
    const letter = puzzle.solution[row][col];
    if (!letter || entries[row][col] === letter) return;
    setRevealed((prev) => new Set(prev).add(`${row},${col}`));
    setCell(selected, letter);
  };

  // Teclado físico en la versión web.
  const handlers = useRef({ onLetter, onBackspace, moveWord, modalOpen: false });
  handlers.current = { onLetter, onBackspace, moveWord, modalOpen: showClues || showResult };
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || handlers.current.modalOpen) return;
      if (/^[a-zA-Z]$/.test(e.key)) handlers.current.onLetter(e.key.toUpperCase());
      else if (e.key === 'Backspace') handlers.current.onBackspace();
      else if (e.key === 'Tab' || e.key === 'Enter') handlers.current.moveWord(e.shiftKey ? -1 : 1);
      else return;
      // Evita que la tecla active además el botón que tenga el foco.
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const number = puzzleNumber(day);
  const boardSize = Math.min(width - 24, 460);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>⚽ Crucigrama Futbolero</Text>
          <Text style={styles.subtitle}>
            #{number} · {formatDay(day)}
          </Text>
        </View>
        <Pressable onPress={() => setShowResult(true)} style={styles.timer}>
          <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
          <Text style={styles.streak}>🔥 {stats.currentStreak}</Text>
        </Pressable>
      </View>

      <View style={styles.boardArea}>
        <Grid
          puzzle={puzzle}
          entries={entries}
          selected={selected}
          highlighted={highlighted}
          wrong={wrong}
          revealed={revealed}
          size={boardSize}
          onPress={onCellPress}
        />
        <View style={styles.actions}>
          <ActionButton label="Pistas" onPress={() => setShowClues(true)} />
          <ActionButton label="Revisar" onPress={checkAnswers} disabled={completed} />
          <ActionButton label="Revelar letra" onPress={revealLetter} disabled={completed} />
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.clueBar}>
          <Pressable onPress={() => moveWord(-1)} style={styles.arrow} accessibilityLabel="Pista anterior">
            <Text style={styles.arrowText}>‹</Text>
          </Pressable>
          <Pressable
            style={styles.clueTextWrap}
            onPress={() => onCellPress(selected)}
            accessibilityLabel="Cambiar dirección"
          >
            <Text style={styles.clueLabel}>
              {activeWord.number} {activeWord.direction === 'across' ? 'Horizontal' : 'Vertical'} ·{' '}
              {activeWord.answer.length} letras
            </Text>
            <Text style={styles.clueText} numberOfLines={2}>
              {activeWord.clue}
            </Text>
          </Pressable>
          <Pressable onPress={() => moveWord(1)} style={styles.arrow} accessibilityLabel="Pista siguiente">
            <Text style={styles.arrowText}>›</Text>
          </Pressable>
        </View>
        <Keyboard onLetter={onLetter} onBackspace={onBackspace} />
      </View>

      <CluesModal
        visible={showClues}
        words={puzzle.words}
        entries={entries}
        onClose={() => setShowClues(false)}
        onSelect={(w) => {
          selectWord(w);
          setShowClues(false);
        }}
      />
      <ResultModal
        visible={showResult}
        completed={completed}
        number={number}
        elapsed={elapsed}
        revealedCount={revealed.size}
        stats={stats}
        onClose={() => setShowResult(false)}
      />
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.7 },
      ]}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

function CluesModal({
  visible,
  words,
  entries,
  onClose,
  onSelect,
}: {
  visible: boolean;
  words: PlacedWord[];
  entries: string[][];
  onClose: () => void;
  onSelect: (w: PlacedWord) => void;
}) {
  const sections: [string, Direction][] = [
    ['Horizontales', 'across'],
    ['Verticales', 'down'],
  ];
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, styles.cluesCard]}>
          <Text style={styles.modalTitle}>Pistas</Text>
          <ScrollView>
            {sections.map(([title, dir]) => (
              <View key={dir} style={styles.clueSection}>
                <Text style={styles.clueSectionTitle}>{title}</Text>
                {words
                  .filter((w) => w.direction === dir)
                  .map((w) => {
                    const done = cellsOf(w).every((c) => entries[c.row][c.col]);
                    return (
                      <Pressable key={`${dir}-${w.number}`} onPress={() => onSelect(w)} style={styles.clueRow}>
                        <Text style={[styles.clueRowText, done && styles.clueDone]}>
                          <Text style={styles.clueNumber}>{w.number}. </Text>
                          {w.clue} ({w.answer.length})
                        </Text>
                      </Pressable>
                    );
                  })}
              </View>
            ))}
          </ScrollView>
          <Pressable onPress={onClose} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ResultModal({
  visible,
  completed,
  number,
  elapsed,
  revealedCount,
  stats,
  onClose,
}: {
  visible: boolean;
  completed: boolean;
  number: number;
  elapsed: number;
  revealedCount: number;
  stats: Stats;
  onClose: () => void;
}) {
  const [countdown, setCountdown] = useState(msUntilNextPuzzle());
  useEffect(() => {
    if (!visible) return;
    setCountdown(msUntilNextPuzzle());
    const id = setInterval(() => setCountdown(msUntilNextPuzzle()), 1000);
    return () => clearInterval(id);
  }, [visible]);

  const [copied, setCopied] = useState(false);
  const share = () => {
    const message = shareText(number, elapsed, revealedCount);
    if (Platform.OS === 'web') {
      // En el navegador copiamos el resultado para pegarlo donde quieras.
      navigator.clipboard
        ?.writeText(message)
        .then(() => setCopied(true))
        .catch(() => {});
      return;
    }
    Share.share({ message }).catch(() => {});
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{completed ? '¡GOOOOL! 🏆' : 'Estadísticas'}</Text>
          {completed && (
            <Text style={styles.modalBody}>
              Completaste el crucigrama #{number} en {formatTime(elapsed)}
              {revealedCount === 0 ? ' sin ayuda.' : ` con ${revealedCount} letra(s) revelada(s).`}
            </Text>
          )}
          <View style={styles.statsRow}>
            <Stat value={stats.wins} label="Ganados" />
            <Stat value={stats.cleanWins} label="Sin ayuda" />
            <Stat value={stats.currentStreak} label="Racha" />
            <Stat value={stats.maxStreak} label="Mejor racha" />
          </View>
          <Text style={styles.modalBody}>Próximo crucigrama en {formatCountdown(countdown)}</Text>
          {completed && (
            <Pressable onPress={share} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>
                {copied ? '¡Copiado!' : 'Compartir resultado'}
              </Text>
            </Pressable>
          )}
          <Pressable onPress={onClose} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function formatDay(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function formatCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.pitch },
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.pitch,
  },
  title: { color: colors.chalk, fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#BFE5CD', fontSize: 13, marginTop: 2 },
  timer: { alignItems: 'flex-end' },
  timerText: { color: colors.chalk, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  streak: { color: colors.chalk, fontSize: 13, marginTop: 2 },
  boardArea: { flex: 1, justifyContent: 'center', paddingVertical: 12, gap: 12 },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  actionButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.keyAction,
  },
  actionText: { color: colors.pitchDark, fontWeight: '700', fontSize: 14 },
  bottom: { paddingBottom: 8, gap: 8 },
  clueBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cellWord,
    minHeight: 64,
  },
  arrow: { paddingHorizontal: 14, paddingVertical: 10 },
  arrowText: { fontSize: 30, color: colors.pitchDark, fontWeight: '600' },
  clueTextWrap: { flex: 1 },
  clueLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
  clueText: { fontSize: 16, color: colors.text, fontWeight: '600' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.chalk,
    borderRadius: 16,
    padding: 20,
    gap: 14,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  cluesCard: { maxHeight: '85%' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: colors.pitchDark, textAlign: 'center' },
  modalBody: { fontSize: 15, color: colors.text, textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  primaryButton: {
    backgroundColor: colors.pitch,
    borderRadius: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.chalk, fontWeight: '700', fontSize: 16 },
  secondaryButton: { paddingVertical: 8, alignItems: 'center' },
  secondaryButtonText: { color: colors.pitchDark, fontWeight: '700', fontSize: 15 },
  clueSection: { marginBottom: 12 },
  clueSectionTitle: { fontSize: 15, fontWeight: '800', color: colors.pitchDark, marginBottom: 6 },
  clueRow: { paddingVertical: 6 },
  clueRowText: { fontSize: 15, color: colors.text },
  clueNumber: { fontWeight: '800' },
  clueDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
});
