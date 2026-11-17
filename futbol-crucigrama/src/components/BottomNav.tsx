import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme';

export type NavItem<T extends string> = {
  id: T;
  icon: string;
  label: string;
  done: boolean;
};

type Props<T extends string> = {
  items: NavItem<T>[];
  active: T;
  onChange: (id: T) => void;
};

// Barra inferior para cambiar de juego; marca con ✓ los que ya se jugaron hoy.
export default function BottomNav<T extends string>({ items, active, onChange }: Props<T>) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: 4 + insets.bottom }]} accessibilityRole="tablist">
      {items.map((item) => {
        const selected = item.id === active;
        return (
          <Pressable
            key={item.id}
            onPress={() => onChange(item.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${item.label}${item.done ? ', jugado hoy' : ''}`}
            style={styles.item}
          >
            <View style={[styles.iconWrap, selected && styles.iconWrapActive]}>
              <Text style={styles.icon}>{item.icon}</Text>
              {item.done && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>✓</Text>
                </View>
              )}
            </View>
            <Text style={[styles.label, selected && styles.labelActive]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.chalk,
    borderTopWidth: 1,
    borderTopColor: '#D5E2D9',
    paddingTop: 4,
    paddingBottom: 4,
  },
  item: { flex: 1, alignItems: 'center', gap: 1, paddingVertical: 2 },
  iconWrap: {
    width: 48,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: { backgroundColor: colors.cellWord },
  icon: { fontSize: 18 },
  badge: {
    position: 'absolute',
    top: -2,
    right: 0,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: colors.correct,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.chalk, fontSize: 10, fontWeight: '900' },
  label: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  labelActive: { color: colors.pitchDark, fontWeight: '800' },
});
