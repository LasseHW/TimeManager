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
  activeTab: 'timer' | 'reports';
  onChangeTab: (tab: 'timer' | 'reports') => void;
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
  activeTab,
  onChangeTab,
}: Props) {
  const [search, setSearch] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const filtered = search
    ? projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : projects;

  const initial = userEmail ? userEmail[0].toUpperCase() : '?';

  return (
    <View style={styles.container}>
      {/* ── User row + settings ── */}
      <View style={styles.userSection}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.userEmail} numberOfLines={1}>
            {userEmail}
          </Text>
          <Pressable style={styles.settingsBtn} onPress={() => setShowSettings(true)}>
            <Text style={styles.settingsIcon}>{'⚙'}</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Tabs: Timer | Reports ── */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, activeTab === 'timer' && styles.tabActive]}
          onPress={() => onChangeTab('timer')}
        >
          <Text style={[styles.tabText, activeTab === 'timer' && styles.tabTextActive]}>
            Timer
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'reports' && styles.tabActive]}
          onPress={() => onChangeTab('reports')}
        >
          <Text style={[styles.tabText, activeTab === 'reports' && styles.tabTextActive]}>
            Analyse
          </Text>
        </Pressable>
      </View>

      {/* ── Today total ── */}
      <View style={styles.statsRow}>
        <Text style={styles.statsLabel}>Heute</Text>
        <Text style={styles.statsValue}>{fmtMs(totalTodayMs)}</Text>
      </View>

      {/* ── Add project button (prominent, at top) ── */}
      <Pressable style={styles.addProjectBtn} onPress={onAddProject}>
        <Text style={styles.addProjectIcon}>+</Text>
        <Text style={styles.addProjectText}>Neues Projekt</Text>
      </Pressable>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Suchen..."
          placeholderTextColor={t.textPlaceholder}
          value={search}
          onChangeText={setSearch}
        />
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
            style={[styles.projectName, selectedProjectId === null && styles.projectNameActive]}
          >
            Alle
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

      {/* Settings modal */}
      <Modal visible={showSettings} transparent animationType="fade">
        <View style={styles.settingsBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowSettings(false)} />
          <View style={[styles.settingsMenu, t.cardShadow]}>
            <Text style={styles.settingsMenuEmail} numberOfLines={1}>
              {userEmail}
            </Text>
            <View style={styles.settingsDivider} />
            <Pressable
              style={styles.settingsMenuItem}
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

const SIDEBAR_WIDTH = 580;

const styles = StyleSheet.create({
  container: {
    width: SIDEBAR_WIDTH,
    backgroundColor: t.sidebar,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },

  // User
  userSection: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: t.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  userEmail: { flex: 1, fontSize: 10, color: t.textTertiary, fontWeight: '400' },
  settingsBtn: { padding: 2 },
  settingsIcon: { fontSize: 13, color: t.textTertiary },

  // Tabs
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 10,
    marginTop: 4,
    marginBottom: 6,
    borderRadius: t.radiusInput,
    backgroundColor: t.bg,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 4,
    alignItems: 'center',
    borderRadius: t.radiusInput - 2,
  },
  tabActive: { backgroundColor: t.card, ...t.cardShadow },
  tabText: { fontSize: 10, fontWeight: '500', color: t.textTertiary },
  tabTextActive: { color: t.accent, fontWeight: '600' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  statsLabel: { fontSize: 10, color: t.textTertiary, fontWeight: '500' },
  statsValue: { fontSize: 12, fontWeight: '700', color: t.accent },

  // Add project
  addProjectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginHorizontal: 10,
    marginTop: 2,
    marginBottom: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: t.accentLight,
    borderRadius: t.radiusInput,
    borderWidth: 1,
    borderColor: t.accentBorder,
  },
  addProjectIcon: { fontSize: 13, color: t.accent, fontWeight: '700' },
  addProjectText: { fontSize: 12, color: t.accent, fontWeight: '600' },

  // Search
  searchWrap: { paddingHorizontal: 10, marginBottom: 4 },
  searchInput: {
    backgroundColor: t.bg,
    borderRadius: t.radiusInput,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    color: t.text,
  },

  // Project list
  projectScroll: { flex: 1 },
  projectScrollContent: { paddingVertical: 2 },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: t.radiusInput,
  },
  projectRowActive: { backgroundColor: t.sidebarActive },
  projectRowInner: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  runningBar: {
    width: 2,
    height: 12,
    borderRadius: 1,
    backgroundColor: t.accent,
    marginRight: 1,
  },
  projectDot: { width: 6, height: 6, borderRadius: 3 },
  projectName: { fontSize: 13, color: t.text, fontWeight: '400', flex: 1 },
  projectNameActive: { fontWeight: '600', color: t.accent },
  projectTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
    marginLeft: 6,
    fontFamily: Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined,
  },

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
    minWidth: 180,
  },
  settingsMenuEmail: {
    fontSize: 11,
    color: t.textSecondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  settingsDivider: { height: 1, backgroundColor: t.borderLight, marginVertical: 2 },
  settingsMenuItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  logoutText: { fontSize: 12, color: t.red, fontWeight: '500' },
});

export { SIDEBAR_WIDTH };
