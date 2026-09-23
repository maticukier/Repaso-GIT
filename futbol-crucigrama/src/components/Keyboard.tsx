import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

const ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

type Props = {
  onLetter: (letter: string) => void;
  onBackspace: () => void;
};

function Keyboard({ onLetter, onBackspace }: Props) {
  return (
    <View style={styles.keyboard}>
      {ROWS.map((row, i) => (
        <View key={row} style={styles.row}>
          {Array.from(row).map((letter) => (
            <Pressable
              key={letter}
              onPress={() => onLetter(letter)}
              style={({ pressed }) => [styles.key, pressed && styles.pressed]}
            >
              <Text style={styles.keyText}>{letter}</Text>
            </Pressable>
          ))}
          {i === ROWS.length - 1 && (
            <Pressable
              onPress={onBackspace}
              accessibilityLabel="Borrar"
              style={({ pressed }) => [styles.key, styles.wide, pressed && styles.pressed]}
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

const styles = StyleSheet.create({
  keyboard: { gap: 6, paddingHorizontal: 4 },
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
});
