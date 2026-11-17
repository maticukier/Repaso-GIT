import { memo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

export type KeyStatus = 'correct' | 'present' | 'absent';

type Props = {
  onLetter: (letter: string) => void;
  onBackspace: () => void;
  // Si se pasa, aparece la tecla ENVIAR (para Adiviná el crack).
  onEnter?: () => void;
  statuses?: Record<string, KeyStatus>;
  // Teclas más bajas para pantallas con poco alto.
  compact?: boolean;
};

const STATUS_COLORS: Record<KeyStatus, string> = {
  correct: colors.correct,
  present: colors.present,
  absent: colors.absent,
};

function Keyboard({ onLetter, onBackspace, onEnter, statuses, compact }: Props) {
  const keyHeight = compact ? { height: 36 } : null;
  return (
    <View style={[styles.keyboard, compact && styles.keyboardCompact]}>
      {ROWS.map((row, i) => (
        <View key={row} style={styles.row}>
          {i === ROWS.length - 1 && onEnter && (
            <Pressable
              onPress={onEnter}
              accessibilityLabel="Enviar"
              style={({ pressed }) => [styles.key, keyHeight, styles.wide, pressed && styles.pressed]}
            >
              <Text style={styles.enterText}>ENVIAR</Text>
            </Pressable>
          )}
          {Array.from(row).map((letter) => {
            const status = statuses?.[letter];
            return (
              <Pressable
                key={letter}
                onPress={() => onLetter(letter)}
                style={({ pressed }) => [
                  styles.key,
                  keyHeight,
                  status && { backgroundColor: STATUS_COLORS[status] },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.keyText, status && styles.keyTextOnColor]}>{letter}</Text>
              </Pressable>
            );
          })}
          {i === ROWS.length - 1 && (
            <Pressable
              onPress={onBackspace}
              accessibilityLabel="Borrar"
              style={({ pressed }) => [styles.key, keyHeight, styles.wide, pressed && styles.pressed]}
            >
              <Text style={styles.keyText}>⌫</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

export default memo(Keyboard);

// En la web con pantalla ancha (computadora) se escribe con el teclado físico,
// así que el de pantalla se oculta para dejarle lugar a la grilla.
export function hasPhysicalKeyboard(windowWidth: number) {
  return Platform.OS === 'web' && windowWidth >= 900;
}

const styles = StyleSheet.create({
  keyboard: { gap: 6, paddingHorizontal: 4 },
  keyboardCompact: { gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  key: {
    flex: 1,
    maxWidth: 40,
    height: 46,
    borderRadius: 6,
    backgroundColor: colors.key,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 1px rgba(0, 0, 0, 0.15)',
  },
  wide: { flex: 1.6, maxWidth: 64, backgroundColor: colors.keyAction },
  pressed: { opacity: 0.6 },
  keyText: { fontSize: 18, fontWeight: '600', color: colors.text },
  keyTextOnColor: { color: colors.chalk },
  enterText: { fontSize: 11, fontWeight: '800', color: colors.text },
});
