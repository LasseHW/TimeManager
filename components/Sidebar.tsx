import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { t } from '../lib/theme';
import type { Project } from '../contexts/ProjectsContext';

type Props = {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  projectTotals: Map<string, number>;
  totalTodayMs: number;
  runningProjectId: string | null;
  userEmail: string;
  onAddProject: () => void;
  onEditProject: (project: Project) => void;
};

function fmtMs(ms: number) {
  if (ms <= 0) return '0m';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function Sidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  projectTotals,
  totalTodayMs,
  runningProjectId,
  userEmail,
  onAddProject,
  onEditProject,
}: Props) {
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const filtered = search
    ? projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : projects;

  const initial = (userEmail ?? '?')[0].toUpperCase();

  return (
    <View style={styles.container}>
      {/* ── User info ── */}
      <View style={styles.userSection}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userEmail} numberOfLines={1}>
              {userEmail}
            </Text>
          </View>
        </View>

        {/* Search */}
        <TextInput
          style={styles.searchInput}
          placeholder="Suchen..."
          placeholderTextColor={t.textPlaceholder}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* ── Today total ── */}
      <View style={styles.statsSection}>
        <Text style={styles.statsLabel}>Heute gesamt</Text>
        <Text style={styles.statsValue}>{fmtMs(totalTodayMs)}</Text>
      </View>

      {/* ── Project list ── */}
      <ScrollView style={styles.projectScroll} contentContainerStyle={styles.projectScrollContent}>
        {/* "Alle" option */}
        <Pressable
          style={[styles.projectRow, selectedProjectId === null && styles.projectRowActive]}
          onPress={() => onSelectProject(null)}
        >
          <View style={[styles.projectDot, { backgroundColor: t.textTertiary }]} />
          <Text
            style={[
              styles.projectName,
              selectedProjectId === null && styles.projectNameActive,
            ]}
          >
            Alle Projekte
          </Text>
        </Pressable>

        {/* Projects */}
        {filtered.map((p) => {
          const isSelected = selectedProjectId === p.id;
          const isRunning = runningProjectId === p.id;
          const total = projectTotals.get(p.id) ?? 0;

          return (
            <Pressable
              key={p.id}
              style={[styles.projectRow, isSelected && styles.projectRowActive]}
              onPress={() => onSelectProject(p.id)}
              onLongPress={() => onEditProject(p)}
            >
              <View style={styles.projectRowInner}>
                {isRunning && <View style={styles.runningBar} />}
                <View style={[styles.projectDot, { backgroundColor: p.color }]} />
                <Text
                  style={[styles.projectName, isSelected && styles.projectNameActive]}
                  numberOfLines={1}
                >
                  {p.name}
                </Text>
              </View>
              {total > 0 && <Text style={styles.projectTime}>{fmtMs(total)}</Text>}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Bottom actions ── */}
      <View style={styles.bottomSection}>
        <Pressable style={styles.addProjectBtn} onPress={onAddProject}>
          <Text style={styles.addProjectIcon}>+</Text>
          <Text style={styles.addProjectText}>Neues Projekt</Text>
        </Pressable>

        <Pressable style={styles.settingsBtn} onPress={() => setShowSettings(true)}>
          <Text style={styles.settingsIcon}>&#9881;</Text>
        </Pressable>
      </View>

      {/* Settings modal */}
      <Modal visible={showSettings} transparent animationType="fade">
        <View style={styles.settingsBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowSettings(false)} />
          <View style={[styles.settingsMenu, t.cardShadow]}>
            <Text style={styles.settingsEmail} numberOfLines={1}>
              {userEmail}
            </Text>
            <View style={styles.settingsDivider} />
            <Pressable
              style={styles.settingsItem}
              onPress={() => {
                setShowSettings(false);
                supabase.auth.signOut();
              }}
            >
              <Text style={styles.logoutText}>Abmelden</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 280,
    backgroundColor: t.sidebar,
    borderRightWidth: 1,
    borderRightColor: t.sidebarBorder,
    flex: 1,
  },

  // User
  userSection: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.borderLight,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: t.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  userInfo: { flex: 1 },
  userEmail: { fontSize: 12, color: t.textSecondary, fontWeight: '500' },
  searchInput: {
    backgroundColor: t.bg,
    borderRadius: t.radiusInput,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: t.text,
    borderWidth: 1,
    borderColor: t.border,
  },

  // Stats
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.borderLight,
  },
  statsLabel: { fontSize: 12, color: t.textSecondary, fontWeight: '500' },
  statsValue: { fontSize: 14, fontWeight: '700', color: t.accent },

  // Project list
  projectScroll: { flex: 1 },
  projectScrollContent: { paddingVertical: 6 },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 16,
    marginHorizontal: 6,
    borderRadius: t.radiusInput,
  },
  projectRowActive: { backgroundColor: t.sidebarActive },
  projectRowInner: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  runningBar: {
    width: 3,
    height: 16,
    borderRadius: 1.5,
    backgroundColor: t.accent,
    marginRight: 2,
  },
  projectDot: { width: 8, height: 8, borderRadius: 4 },
  projectName: { fontSize: 13, color: t.text, fontWeight: '400', flex: 1 },
  projectNameActive: { fontWeight: '600', color: t.accent },
  projectTime: {
    fontSize: 11,
    color: t.textTertiary,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    marginLeft: 8,
    fontFamily:
      Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined,
  },

  // Bottom
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: t.borderLight,
  },
  addProjectBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addProjectIcon: { fontSize: 16, color: t.accent, fontWeight: '600' },
  addProjectText: { fontSize: 12, color: t.accent, fontWeight: '600' },
  settingsBtn: { padding: 4 },
  settingsIcon: { fontSize: 18, color: t.textTertiary },

  // Settings modal
  settingsBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingBottom: 60,
    paddingLeft: 16,
  },
  settingsMenu: {
    backgroundColor: t.card,
    borderRadius: t.radiusCard,
    borderWidth: 1,
    borderColor: t.border,
    padding: 4,
    minWidth: 200,
  },
  settingsEmail: {
    fontSize: 12,
    color: t.textSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  settingsDivider: { height: 1, backgroundColor: t.borderLight, marginVertical: 2 },
  settingsItem: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 6 },
  logoutText: { fontSize: 13, color: t.red, fontWeight: '500' },
});
