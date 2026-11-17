import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { msUntilNextPuzzle } from '../lib/daily';
import type { PuntosStats } from '../lib/storage';
import { colors } from '../theme';

type Props = {
  visible: boolean;
  finished: boolean;
  total: number;
  max: number;
  shareText: string;
  nextLabel: string;
  stats: PuntosStats;
  onClose: () => void;
};

// Resultado y estadísticas de los juegos por puntos (Rebuscado y Ranking).
export default function PuntosResult({
  visible,
  finished,
  total,
  max,
  shareText,
  nextLabel,
  stats,
  onClose,
}: Props) {
  const [countdown, setCountdown] = useState(msUntilNextPuzzle());
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setCountdown(msUntilNextPuzzle()), 1000);
    return () => clearInterval(id);
  }, [visible]);

  const share = () => {
    if (Platform.OS === 'web') {
      navigator.clipboard
        ?.writeText(shareText)
        .then(() => setCopied(true))
        .catch(() => {});
      return;
    }
    Share.share({ message: shareText }).catch(() => {});
  };

  const average = stats.played ? Math.round(stats.total / stats.played) : 0;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{finished ? 'Resultado de hoy' : 'Estadísticas'}</Text>
          {finished && (
            <Text style={styles.total}>
              {total}
              <Text style={styles.totalMax}> / {max}</Text>
            </Text>
          )}
          <View style={styles.statsRow}>
            <StatBox value={stats.played} label="Jugados" />
            <StatBox value={average} label="Promedio" />
            <StatBox value={stats.best} label="Mejor día" />
            <StatBox value={stats.currentStreak} label="Racha" />
          </View>
          <Text style={styles.body}>
            {nextLabel} en {formatCountdown(countdown)}
          </Text>
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
  title: { fontSize: 22, fontWeight: '800', color: colors.pitchDark, textAlign: 'center' },
  total: {
    fontSize: 44,
    fontWeight: '900',
    color: colors.pitchDark,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  totalMax: { fontSize: 18, fontWeight: '700', color: colors.textMuted },
  body: { fontSize: 15, color: colors.text, textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
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
