import { createContext, useContext } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme';
import { useAccount } from './Account';

export type MenuItem<T extends string> = {
  id: T;
  icon: string;
  label: string;
  done: boolean;
};

// El encabezado de cada juego usa este contexto para mostrar el botón ☰.
export const MenuContext = createContext<{ open: () => void; pending: number } | null>(null);

export function MenuButton() {
  const menu = useContext(MenuContext);
  if (!menu) return null;
  return (
    <Pressable
      onPress={menu.open}
      accessibilityRole="button"
      accessibilityLabel="Abrir el menú de juegos"
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.buttonIcon}>☰</Text>
      {menu.pending > 0 && (
        <View style={styles.dot}>
          <Text style={styles.dotText}>{menu.pending}</Text>
        </View>
      )}
    </Pressable>
  );
}

type Props<T extends string> = {
  visible: boolean;
  items: MenuItem<T>[];
  active: T;
  onChange: (id: T) => void;
  onClose: () => void;
};

// Panel lateral con la lista de juegos; marca con ✓ los que ya se jugaron hoy.
export default function GameMenu<T extends string>({ visible, items, active, onChange, onClose }: Props<T>) {
  const insets = useSafeAreaInsets();
  const account = useAccount();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.panel, { paddingTop: 16 + insets.top, paddingBottom: 16 + insets.bottom }]}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>⚽ Juegos de hoy</Text>
            <Pressable onPress={onClose} accessibilityLabel="Cerrar el menú" hitSlop={8}>
              <Text style={styles.close}>✕</Text>
            </Pressable>
          </View>
          {account && <AccountBox />}
          {items.map((item) => {
            const selected = item.id === active;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  onChange(item.id);
                  onClose();
                }}
                accessibilityRole="menuitem"
                accessibilityState={{ selected }}
                style={({ pressed }) => [styles.item, selected && styles.itemActive, pressed && styles.pressed]}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <Text style={[styles.itemLabel, selected && styles.itemLabelActive]}>{item.label}</Text>
                <Text style={[styles.status, item.done && styles.statusDone]}>
                  {item.done ? '✓ Jugado' : 'Pendiente'}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable style={styles.outside} onPress={onClose} accessibilityLabel="Cerrar el menú" />
      </View>
    </Modal>
  );
}

function AccountBox() {
  const account = useAccount()!;
  if (!account.available) {
    return (
      <View style={styles.account}>
        <Text style={styles.accountHint}>Para guardar tus resultados con una cuenta, entrá desde la página web.</Text>
      </View>
    );
  }
  if (!account.session) {
    return (
      <View style={styles.account}>
        <Pressable
          onPress={account.signIn}
          accessibilityRole="button"
          style={({ pressed }) => [styles.google, pressed && styles.pressed]}
        >
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.googleText}>Entrar con Google</Text>
        </Pressable>
        <Text style={styles.accountHint}>Guardá tus resultados y seguí desde cualquier dispositivo.</Text>
      </View>
    );
  }
  const status =
    account.sync === 'syncing'
      ? 'Sincronizando…'
      : account.sync === 'error'
        ? 'No se pudo sincronizar: se reintenta solo'
        : '✓ Resultados guardados en tu cuenta';
  return (
    <View style={[styles.account, styles.accountRow]}>
      {account.avatar ? (
        <Image source={{ uri: account.avatar }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarEmpty]}>
          <Text style={styles.avatarLetter}>{(account.name ?? '?')[0]}</Text>
        </View>
      )}
      <View style={styles.accountInfo}>
        <Text style={styles.accountName} numberOfLines={1}>
          {account.name}
        </Text>
        <Text style={[styles.accountStatus, account.sync === 'error' && styles.accountError]}>{status}</Text>
        <Pressable onPress={account.signOut} hitSlop={6}>
          <Text style={styles.signOut}>Cerrar sesión</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  account: {
    backgroundColor: colors.chalk,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D5E2D9',
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accountHint: { fontSize: 12, color: colors.textMuted },
  google: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#C9D6CE',
    paddingVertical: 10,
    backgroundColor: colors.chalk,
  },
  googleG: { fontSize: 17, fontWeight: '900', color: '#4285F4' },
  googleText: { fontSize: 15, fontWeight: '700', color: colors.text },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarEmpty: { backgroundColor: colors.cellWord, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 18, fontWeight: '800', color: colors.pitchDark },
  accountInfo: { flex: 1, gap: 2 },
  accountName: { fontSize: 15, fontWeight: '800', color: colors.text },
  accountStatus: { fontSize: 12, color: colors.correct, fontWeight: '600' },
  accountError: { color: colors.present },
  signOut: { fontSize: 13, color: colors.pitchDark, fontWeight: '700', marginTop: 2 },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  buttonIcon: { color: colors.chalk, fontSize: 24, fontWeight: '700' },
  pressed: { opacity: 0.6 },
  dot: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.cellActive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { color: colors.text, fontSize: 11, fontWeight: '900' },
  backdrop: { flex: 1, flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.45)' },
  panel: {
    width: 290,
    maxWidth: '85%',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    gap: 6,
  },
  outside: { flex: 1 },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
  },
  panelTitle: { fontSize: 19, fontWeight: '800', color: colors.pitchDark },
  close: { fontSize: 22, color: colors.textMuted, paddingHorizontal: 6 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  itemActive: { backgroundColor: colors.cellWord },
  itemIcon: { fontSize: 22 },
  itemLabel: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '600' },
  itemLabelActive: { color: colors.pitchDark, fontWeight: '800' },
  status: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  statusDone: { color: colors.correct, fontWeight: '800' },
});
