import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';

type Props = {
  title: string;
  subtitle: string;
  right?: ReactNode;
  children?: ReactNode;
};

// Encabezado verde compartido por los dos juegos; `children` va debajo (pestañas).
export default function Header({ title, subtitle, right, children }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.pitch },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  titles: { flexShrink: 1 },
  title: { color: colors.chalk, fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#BFE5CD', fontSize: 13, marginTop: 2 },
});
