import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTimer } from '../../hooks/useTimer';
import { useTodayEntries, type TodayEntry } from '../../hooks/useTodayEntries';
import { useTasks } from '../../hooks/useTasks';
import { useProjects, type Project } from '../../contexts/ProjectsContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Sidebar, SIDEBAR_WIDTH } from '../../components/Sidebar';
import { ActivityCard } from '../../components/ActivityCard';
import { ManualEntryModal } from '../../components/ManualEntryModal';
import { ProjectFormModal } from '../../components/ProjectFormModal';
import ReportsScreen from './reports';
import { t } from '../../lib/theme';

// ── Helpers ──────────────────────────────────────────

const MOBILE_BREAK = 768;

function useWindowWidth() {
  const [width, setWidth] = useState(Dimensions.get('window').width);
  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => setWidth(window.width));
    return () => sub.remove();
  }, []);
  return width;
}

function fmtMs(ms: number) {
  if (ms <= 0) return '0m';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDateHeader(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}`;
}

function entryDurationMs(e: TodayEntry) {
  if (!e.end_time) return 0;
  return new Date(e.end_time).getTime() - new Date(e.start_time).getTime() - (e.paused_duration ?? 0) * 1000;
}

// ── Keyboard shortcuts (web) ─────────────────────────

function useKeyboardShortcuts(
  status: string,
  onPause: () => void,
  onResume: () => void,
  onStop: () => void,
) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (status === 'running') onPause();
        else if (status === 'paused') onResume();
      }
      if (e.code === 'Escape' && status !== 'idle') {
        e.preventDefault();
        onStop();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [status, onPause, onResume, onStop]);
}

// ── Main screen ──────────────────────────────────────

export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < MOBILE_BREAK;

  // Hooks
  const { session } = useAuth();
  const timer = useTimer();
  const { entries, refresh: refreshEntries, totalTodayMs, taskTotals } = useTodayEntries();
  const { projects, addProject, updateProject, deleteProject } = useProjects();
  const { tasks, tasksForProject, addTask, updateTask, deleteTask } = useTasks();

  // State
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'timer' | 'reports'>('timer');
  const [newActivityName, setNewActivityName] = useState('');
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [manualEntryTask, setManualEntryTask] = useState<{ taskId: string; projectId: string } | null>(null);

  // Animated drawer for mobile
  const drawerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isMobile) {
      Animated.timing(drawerAnim, {
        toValue: sidebarOpen ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [sidebarOpen, isMobile, drawerAnim]);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    timer.status,
    timer.pause,
    timer.resume,
    async () => { await timer.stop(); refreshEntries(); },
  );

  // ── Computed ───────────────────────────────────────

  // Per-project totals (today)
  const projectTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      if (!e.project || !e.end_time) continue;
      const ms = entryDurationMs(e);
      map.set(e.project.id, (map.get(e.project.id) ?? 0) + ms);
    }
    if (timer.running?.projectId && timer.status !== 'idle') {
      const pid = timer.running.projectId;
      map.set(pid, (map.get(pid) ?? 0) + timer.elapsed);
    }
    return map;
  }, [entries, timer.running, timer.elapsed, timer.status]);

  // Entries grouped by task
  const entriesByTask = useMemo(() => {
    const map = new Map<string, TodayEntry[]>();
    for (const e of entries) {
      if (!e.task_id) continue;
      if (!map.has(e.task_id)) map.set(e.task_id, []);
      map.get(e.task_id)!.push(e);
    }
    return map;
  }, [entries]);

  // Tasks to display
  const displayTasks = useMemo(() => {
    if (selectedProjectId) return tasksForProject(selectedProjectId);
    return tasks;
  }, [selectedProjectId, tasks, tasksForProject]);

  // Historical entries (grouped by date)
  const groupedEntries = useMemo(() => {
    const filtered = selectedProjectId
      ? entries.filter((e) => e.project?.id === selectedProjectId)
      : entries;
    const map = new Map<string, TodayEntry[]>();
    for (const e of filtered) {
      const dateKey = e.start_time.slice(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(e);
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries, selectedProjectId]);

  const liveTotalMs = totalTodayMs + (timer.status !== 'idle' ? timer.elapsed : 0);

  // ── Handlers ───────────────────────────────────────

  async function handleNewActivity() {
    const name = newActivityName.trim();
    if (!name || !selectedProjectId) return;
    const taskId = await addTask(selectedProjectId, name);
    setNewActivityName('');
    if (taskId) {
      await timer.start({ projectId: selectedProjectId, taskId });
    }
  }

  async function handleStartTask(taskId: string, projectId: string) {
    await timer.start({ projectId, taskId });
  }

  async function handleStop() {
    await timer.stop();
    refreshEntries();
  }

  async function handleUpdateEntryDesc(entryId: string, desc: string) {
    await supabase.from('time_entries').update({ description: desc }).eq('id', entryId);
    refreshEntries();
  }

  async function handleDeleteEntry(entryId: string) {
    await supabase.from('time_entries').delete().eq('id', entryId);
    refreshEntries();
  }

  async function handleSaveProject(name: string, color: string) {
    if (editProject) await updateProject(editProject.id, name, color);
    else await addProject(name, color);
    setShowProjectForm(false);
    setEditProject(null);
  }

  function openEditProject(project: Project) {
    setEditProject(project);
    setShowProjectForm(true);
  }

  function openAddProject() {
    setEditProject(null);
    setShowProjectForm(true);
  }

  // ── Render ─────────────────────────────────────────

  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId)
    : null;

  const sidebarContent = (
    <Sidebar
      projects={projects}
      selectedProjectId={selectedProjectId}
      onSelectProject={(id) => {
        setSelectedProjectId(id);
        setActiveTab('timer');
        if (isMobile) setSidebarOpen(false);
      }}
      projectTotals={projectTotals}
      totalTodayMs={liveTotalMs}
      runningProjectId={timer.running?.projectId ?? null}
      userEmail={session?.user.email ?? ''}
      onAddProject={openAddProject}
      onEditProject={openEditProject}
      activeTab={activeTab}
      onChangeTab={setActiveTab}
    />
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Desktop sidebar ── */}
      {!isMobile && sidebarContent}

      {/* ── Mobile drawer ── */}
      {isMobile && sidebarOpen && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: 'rgba(0,0,0,0.3)', opacity: drawerAnim },
            ]}
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setSidebarOpen(false)} />
          </Animated.View>
          <Animated.View
            style={[
              styles.drawer,
              {
                transform: [
                  {
                    translateX: drawerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-SIDEBAR_WIDTH, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {sidebarContent}
          </Animated.View>
        </View>
      )}

      {/* ── Main panel ── */}
      <View style={styles.main}>
        {/* Top bar (mobile hamburger + title) */}
        <View style={styles.topBar}>
          {isMobile && (
            <Pressable style={styles.hamburger} onPress={() => setSidebarOpen(true)}>
              <Text style={styles.hamburgerIcon}>{'\u2630'}</Text>
            </Pressable>
          )}
          <Text style={styles.topTitle}>
            {selectedProject ? selectedProject.name : 'Alle Projekte'}
          </Text>
          {timer.status !== 'idle' && (
            <View style={styles.topTimerChip}>
              <View style={styles.topTimerDot} />
              <Text style={styles.topTimerText}>{fmtMs(timer.elapsed)}</Text>
            </View>
          )}
        </View>

        {/* ── Reports tab ── */}
        {activeTab === 'reports' && <ReportsScreen />}

        {/* ── Timer tab ── */}
        {activeTab === 'timer' && (
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {/* ── New activity input ── */}
          {selectedProjectId && (
            <View style={styles.newActivityRow}>
              <TextInput
                style={styles.newActivityInput}
                placeholder="Neue Aktivität starten..."
                placeholderTextColor={t.textPlaceholder}
                value={newActivityName}
                onChangeText={setNewActivityName}
                onSubmitEditing={handleNewActivity}
                returnKeyType="go"
              />
            </View>
          )}
          {!selectedProjectId && (
            <View style={styles.newActivityRow}>
              <Text style={styles.newActivityHint}>
                Wähle ein Projekt in der Sidebar, um eine Aktivität zu starten.
              </Text>
            </View>
          )}

          {/* ── Activity cards ── */}
          {displayTasks.length > 0 && (
            <View style={styles.cardsSection}>
              <Text style={styles.sectionLabel}>AKTIVITÄTEN</Text>
              <View style={styles.cardsList}>
                {displayTasks.map((task) => {
                  const isRunning =
                    timer.running?.taskId === task.id && timer.status !== 'idle';
                  const project = projects.find((p) => p.id === task.project_id);
                  return (
                    <ActivityCard
                      key={task.id}
                      task={task}
                      projectColor={project?.color ?? t.textTertiary}
                      entries={entriesByTask.get(task.id) ?? []}
                      isRunning={isRunning}
                      timerStatus={timer.status}
                      elapsed={isRunning ? timer.elapsed : 0}
                      totalMs={taskTotals.get(task.id) ?? 0}
                      onStart={() => handleStartTask(task.id, task.project_id)}
                      onPause={timer.pause}
                      onResume={timer.resume}
                      onStop={handleStop}
                      onRenameTask={(name) => updateTask(task.id, name)}
                      onDeleteTask={() => deleteTask(task.id)}
                      onUpdateEntryDesc={handleUpdateEntryDesc}
                      onDeleteEntry={handleDeleteEntry}
                      onAddManualEntry={() =>
                        setManualEntryTask({ taskId: task.id, projectId: task.project_id })
                      }
                    />
                  );
                })}
              </View>
            </View>
          )}

          {/* Empty state (no tasks for selected project) */}
          {displayTasks.length === 0 && selectedProjectId && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>{'\u25C6'}</Text>
              <Text style={styles.emptyTitle}>Keine Aktivitäten</Text>
              <Text style={styles.emptyHint}>
                Gib oben einen Namen ein und drücke Enter,{'\n'}um eine neue Aktivität
                zu starten.
              </Text>
            </View>
          )}

          {/* Empty state (no projects at all) */}
          {projects.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>{'\u25C6'}</Text>
              <Text style={styles.emptyTitle}>Willkommen bei TimeManager</Text>
              <Text style={styles.emptyHint}>
                Erstelle dein erstes Projekt in der Sidebar,{'\n'}um mit der Zeiterfassung zu
                beginnen.
              </Text>
              <Pressable style={styles.emptyBtn} onPress={openAddProject}>
                <Text style={styles.emptyBtnText}>+ Projekt erstellen</Text>
              </Pressable>
            </View>
          )}

          {/* ── Historical entries ── */}
          {groupedEntries.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.sectionLabel}>ZEITEINTRÄGE</Text>
              {groupedEntries.map(([dateKey, dayEntries]) => (
                <View key={dateKey} style={styles.historyGroup}>
                  <Text style={styles.historyDate}>{fmtDateHeader(dateKey)}</Text>
                  {dayEntries.map((e, i) => (
                    <View
                      key={e.id}
                      style={[styles.historyRow, i % 2 === 1 && styles.historyRowAlt]}
                    >
                      <Text style={styles.historyTime}>
                        {fmtTime(e.start_time)} {'\u2192'}{' '}
                        {e.end_time ? fmtTime(e.end_time) : '...'}
                      </Text>
                      <Text style={styles.historyDuration}>{fmtMs(entryDurationMs(e))}</Text>
                      {e.project && (
                        <View style={[styles.historyChip, { backgroundColor: e.project.color + '18' }]}>
                          <View style={[styles.historyChipDot, { backgroundColor: e.project.color }]} />
                          <Text
                            style={[styles.historyChipText, { color: e.project.color }]}
                            numberOfLines={1}
                          >
                            {e.project.name}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.historyDesc} numberOfLines={1}>
                        {e.description || ''}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}
        </ScrollView>
        )}
      </View>

      {/* ── Modals ── */}
      <ProjectFormModal
        visible={showProjectForm}
        project={editProject}
        onSave={handleSaveProject}
        onClose={() => {
          setShowProjectForm(false);
          setEditProject(null);
        }}
      />

      {manualEntryTask && (
        <ManualEntryModal
          visible
          taskId={manualEntryTask.taskId}
          projectId={manualEntryTask.projectId}
          onClose={() => setManualEntryTask(null)}
          onSaved={() => refreshEntries()}
        />
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: t.bg,
  },

  // Drawer (mobile)
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    zIndex: 10,
  },

  // Main panel
  main: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: t.card,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
    gap: 10,
  },
  hamburger: { padding: 4 },
  hamburgerIcon: { fontSize: 20, color: t.text },
  topTitle: { fontSize: 16, fontWeight: '600', color: t.text, flex: 1 },
  topTimerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: t.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: t.radiusChip,
  },
  topTimerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: t.green,
  },
  topTimerText: {
    fontSize: 12,
    fontWeight: '700',
    color: t.accent,
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined,
  },

  // Scroll
  scrollArea: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },

  // New activity
  newActivityRow: { marginBottom: 20 },
  newActivityInput: {
    fontSize: 16,
    color: t.text,
    fontWeight: '400',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.borderLight,
  },
  newActivityHint: {
    fontSize: 14,
    color: t.textPlaceholder,
    paddingVertical: 12,
  },

  // Cards section
  cardsSection: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: t.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  cardsList: { gap: 8 },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 48, paddingBottom: 32 },
  emptyIcon: { fontSize: 36, color: t.textPlaceholder, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: t.textSecondary },
  emptyHint: {
    fontSize: 13,
    color: t.textTertiary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 16,
    backgroundColor: t.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: t.radiusInput,
  },
  emptyBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // History
  historySection: { marginTop: 8 },
  historyGroup: { marginBottom: 16 },
  historyDate: {
    fontSize: 13,
    fontWeight: '700',
    color: t.accent,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 10,
    borderRadius: 4,
  },
  historyRowAlt: { backgroundColor: t.rowAlt },
  historyTime: {
    fontSize: 12,
    color: t.textTertiary,
    fontVariant: ['tabular-nums'],
    width: 100,
    fontFamily: Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined,
  },
  historyDuration: {
    fontSize: 12,
    fontWeight: '600',
    color: t.textSecondary,
    fontVariant: ['tabular-nums'],
    width: 50,
    fontFamily: Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined,
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: t.radiusChip,
    maxWidth: 120,
  },
  historyChipDot: { width: 5, height: 5, borderRadius: 2.5 },
  historyChipText: { fontSize: 10, fontWeight: '600' },
  historyDesc: { flex: 1, fontSize: 13, color: t.text },
});
