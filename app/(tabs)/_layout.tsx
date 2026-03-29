import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileMenu } from '../../components/ProfileMenu';
import { t } from '../../lib/theme';

const TABS = [
  { key: '/', label: 'Timer', icon: '⏱' },
  { key: '/projects', label: 'Projekte', icon: '◆' },
  { key: '/reports', label: 'Reports', icon: '▦' },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
        <View style={styles.tabRow}>
          {TABS.map((tab) => {
            const active = pathname === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[styles.tab, active && styles.tabActive]}
                onPress={() => router.navigate(tab.key)}
              >
                <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{tab.icon}</Text>
                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <ProfileMenu />
      </View>

      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    backgroundColor: t.card,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  tabRow: { flexDirection: 'row', gap: 2 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: t.accent },
  tabIcon: { fontSize: 14, color: t.textTertiary },
  tabIconActive: { color: t.accent },
  tabLabel: { fontSize: 13, fontWeight: '500', color: t.textTertiary },
  tabLabelActive: { color: t.accent, fontWeight: '600' },
  content: { flex: 1 },
});
