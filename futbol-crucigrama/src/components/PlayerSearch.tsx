import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { type Jugador, jugadorDetail, searchJugadores } from '../lib/jugadores';
import { colors } from '../theme';

type Props = {
  onPick: (jugador: Jugador) => void;
  placeholder?: string;
  onFocus?: () => void;
};

// Buscador de jugadores con sugerencias, compartido por Rebuscado y Ranking.
export default function PlayerSearch({ onPick, placeholder, onFocus }: Props) {
  const [query, setQuery] = useState('');
  const suggestions = useMemo(() => searchJugadores(query), [query]);

  return (
    <View style={styles.wrap}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={placeholder ?? 'Escribí el nombre del jugador…'}
        placeholderTextColor={colors.textMuted}
        autoCorrect={false}
        autoCapitalize="words"
        style={styles.input}
        accessibilityLabel="Buscar jugador"
        onFocus={onFocus}
      />
      {suggestions.map((j) => (
        <Pressable
          key={j.id}
          onPress={() => {
            setQuery('');
            onPick(j);
          }}
          style={({ pressed }) => [styles.suggestion, pressed && styles.pressed]}
        >
          <Text style={styles.name}>{j.name}</Text>
          <Text style={styles.detail}>{jugadorDetail(j)}</Text>
        </Pressable>
      ))}
      {query.trim().length >= 2 && suggestions.length === 0 && (
        <Text style={styles.noResults}>No tenemos a nadie con ese nombre</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 6 },
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
    gap: 10,
    backgroundColor: colors.chalk,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#D5E2D9',
  },
  pressed: { opacity: 0.6 },
  name: { fontSize: 15, color: colors.text, fontWeight: '600', flexShrink: 1 },
  detail: { fontSize: 12, color: colors.textMuted },
  noResults: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
});
