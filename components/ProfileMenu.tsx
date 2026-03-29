import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/theme';

export function ProfileMenu() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  if (!session) return null;

  const initials = (session.user.email ?? '?')[0].toUpperCase();

  return (
    <>
      <Pressable style={styles.avatar} onPress={() => setOpen(true)}>
        <Text style={styles.initials}>{initials}</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={[styles.menu, t.cardShadow]} onStartShouldSetResponder={() => true}>
            <Text style={styles.email} numberOfLines={1}>{session.user.email}</Text>
            <View style={styles.divider} />
            <Pressable
              style={styles.menuItem}
              onPress={() => { setOpen(false); supabase.auth.signOut(); }}
            >
              <Text style={styles.logoutText}>Abmelden</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center',
  },
  initials: { color: '#fff', fontSize: 13, fontWeight: '700' },
  backdrop: {
    flex: 1, justifyContent: 'flex-start', alignItems: 'flex-end',
    paddingTop: 56, paddingRight: 16,
  },
  menu: {
    backgroundColor: t.card, borderRadius: t.radiusCard,
    borderWidth: 1, borderColor: t.border, padding: 4, minWidth: 200,
  },
  email: {
    fontSize: 12, color: t.textSecondary, paddingHorizontal: 12, paddingVertical: 8,
  },
  divider: { height: 1, backgroundColor: t.border, marginVertical: 2 },
  menuItem: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  logoutText: { fontSize: 13, color: t.red, fontWeight: '500' },
});
