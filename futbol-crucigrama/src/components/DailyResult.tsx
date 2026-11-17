import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { msUntilNextPuzzle } from '../lib/daily';
import type { WordleStats } from '../lib/storage';
import { colors } from '../theme';

// Resultado y estadísticas de los juegos con intentos (Adiviná el crack y la carta).
export default function DailyResult({
  visible,
  finished,
  won,
  answer,
  attempts,
  maxAttempts,
  shareText,
  nextLabel,
  stats,
  onClose,
}: {
  visible: boolean;
  finished: boolean;
  won: boolean;
  answer: string;
  attempts: number;
  maxAttempts: number;
  shareText: string;
  nextLabel: string;
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
    const text = shareText;
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
              {won ? `Lo sacaste en ${attempts} de ${maxAttempts}. ` : ''}La respuesta era{' '}
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
              const isToday = finished && won && attempts === i + 1;
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
          <Text style={styles.cardBody}>{nextLabel} en {formatCountdown(countdown)}</Text>
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
