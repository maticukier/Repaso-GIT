import { Image, StyleSheet, Text } from 'react-native';

import { FLAGS } from '../data/flags';

// Bandera como imagen (los emojis de bandera no se ven en todos los dispositivos).
export default function Flag({ code, width = 24 }: { code: string | null; width?: number }) {
  const uri = code ? FLAGS[code] : undefined;
  if (!uri) return <Text style={{ fontSize: width * 0.8 }}>🏳️</Text>;
  return (
    <Image
      source={{ uri }}
      style={[styles.flag, { width, height: Math.round(width * 0.75) }]}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  flag: { borderRadius: 2, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.25)' },
});
