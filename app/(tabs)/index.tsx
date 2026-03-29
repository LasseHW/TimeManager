import { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTimer } from '../../hooks/useTimer';
import { useTodayEntries } from '../../hooks/useTodayEntries';
import { useTasks } from '../../hooks/useTasks';
import { useProjects } from '../../contexts/ProjectsContext';
import { DailyProgressBar } from '../../components/DailyProgressBar';
import { ProjectCard } from '../../components/ProjectCard';
import { TodayTimeline } from '../../components/TodayTimeline';
import { t } from '../../lib/theme';

// ── Helpers ──────────────────────────────────────────

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

// ── Keyboard shortcuts (web only) ─────────────────────

function useKeyboardShortcuts(
  status: string,
  modalOpen: boolean,
  onStart: () => void,
  onPause: () => void,
  onResume: () => void,
  onStop: () => void,
) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    function handler(e: KeyboardEvent) {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      // Don't handle shortcuts while modal is open (modal has its own handler)
      if (modalOpen) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (status === 'idle') onStart();
        else if (status === 'running') onPause();
        else if (status === 'paused') onResume();
      }
      if (e.code === 'Escape' && status !== 'idle') {
        e.preventDefault();
        onStop();
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [status, modalOpen, onStart, onPause, onResume, onStop]);
}

// ── New entry form modal ──────────────────────────────

function NewEntryModal({
  visible,
  projects,
  onStart,
  onClose,
}: {
  visible: boolean;
  projects: { id: string; name: string; color: string }[];
  onStart: (projectId: string) => void;
  onClose: () => void;
}) {
  // Keyboard nav: number keys 1-9 select project, Escape closes
  useEffect(() => {
    if (!visible || Platform.OS !== 'web') return;
    function handler(e: KeyboardEvent) {
      if (e.code === 'Escape') { e.preventDefault(); onClose(); return; }
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= projects.length) {
        e.preventDefault();
        onStart(projects[num - 1].id);
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [visible, projects, onStart, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        {/* Backdrop: absolute-fill catches clicks outside the card */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {/* Card: normal flow, sits on top of the backdrop */}
        <View style={[styles.modalCard, t.cardShadow]}>
          <Text style={styles.modalTitle}>Projekt wählen</Text>
          {projects.map((p, i) => (
            <Pressable key={p.id} style={styles.modalOption} onPress={() => onStart(p.id)}>
              <View style={[styles.modalDot, { backgroundColor: p.color }]} />
              <Text style={styles.modalOptionText}>{p.name}</Text>
              {Platform.OS === 'web' && (
                <Text style={styles.modalShortcut}>{i + 1}</Text>
              )}
            </Pressable>
          ))}
          {projects.length === 0 && (
            <Text style={styles.modalEmpty}>Erstelle zuerst ein Projekt im Projekte-Tab.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────

export default function TimerScreen() {
  const timer = useTimer();
  const { entries, refresh: refreshEntries, totalTodayMs, taskTotals } = useTodayEntries();
  const { projects } = useProjects();
  const { tasks, tasksForProject, addTask, updateTask, deleteTask, refresh: refreshTasks } = useTasks();

  const [showNewEntry, setShowNewEntry] = useState(false);
  // Track last started project/task so Space can quick-restart
  const [lastStart, setLastStart] = useState<{ projectId: string; taskId?: string } | null>(null);

  // Running project info
  const runningProject = timer.running
    ? projects.find((p) => p.id === timer.running?.projectId)
    : null;

  // Keyboard shortcuts: space = play/pause, esc = stop
  useKeyboardShortcuts(
    timer.status,
    showNewEntry,
    () => {
      if (projects.length === 0) return;
      // Quick-restart last project/task, or only project — skip modal
      if (lastStart && projects.some((p) => p.id === lastStart.projectId)) {
        timer.start(lastStart);
      } else if (projects.length === 1) {
        timer.start({ projectId: projects[0].id });
      } else {
        setShowNewEntry(true);
      }
    },
    timer.pause,
    timer.resume,
    async () => { await timer.stop(); await refreshEntries(); },
  );

  async function handleStartTask(taskId: string, projectId: string) {
    setLastStart({ projectId, taskId });
    await timer.start({ projectId, taskId });
  }

  async function handleStop() {
    await timer.stop();
    await refreshEntries();
  }

  function handleNewEntryStart(projectId: string) {
    setShowNewEntry(false);
    setLastStart({ projectId });
    timer.start({ projectId });
  }

  // Calculate project totals from task totals + elapsed
  function projectTotalMs(projectId: string): number {
    let total = 0;
    for (const task of tasksForProject(projectId)) {
      total += taskTotals.get(task.id) ?? 0;
    }
    // Add running elapsed if it's this project
    if (timer.running?.projectId === projectId) total += timer.elapsed;
    return total;
  }

  const timerDisplay = timer.status !== 'idle' ? timer.elapsed : totalTodayMs;
  const hasProjects = projects.length > 0;

  return (
    <View style={styles.container}>
      {/* Daily progress */}
      <DailyProgressBar totalMs={totalTodayMs + (timer.status !== 'idle' ? timer.elapsed : 0)} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Timer display */}
        <View style={styles.timerSection}>
          <Text style={styles.timerText}>{formatTime(timerDisplay)}</Text>

          {/* Running indicator */}
          {timer.status !== 'idle' && runningProject && (
            <View style={[styles.runningChip, { backgroundColor: runningProject.color + '18' }]}>
              <View style={[styles.runningDot, { backgroundColor: runningProject.color }]} />
              <Text style={[styles.runningLabel, { color: runningProject.color }]}>
                {runningProject.name}
              </Text>
              <Text style={styles.runningStatus}>
                {timer.status === 'running' ? 'Recording' : 'Paused'}
              </Text>
            </View>
          )}

          {/* Global start button (idle only) */}
          {timer.status === 'idle' && (
            <Pressable
              style={styles.startButton}
              onPress={() => setShowNewEntry(true)}
            >
              <Text style={styles.startButtonText}>+ Neuen Eintrag starten</Text>
            </Pressable>
          )}

          {/* Keyboard hint (web) */}
          {Platform.OS === 'web' && (
            <Text style={styles.shortcutHint}>
              Space: {timer.status === 'idle'
                ? (lastStart ? 'Fortsetzen' : 'Start')
                : timer.status === 'running' ? 'Pause' : 'Resume'}
              {timer.status !== 'idle' ? '  ·  Esc: Stop' : ''}
            </Text>
          )}
        </View>

        {/* Project cards with tasks */}
        {hasProjects && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROJEKTE</Text>
            <View style={styles.projectList}>
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  tasks={tasksForProject(project.id)}
                  runningTaskId={
                    timer.running?.projectId === project.id ? timer.running.taskId : null
                  }
                  timerStatus={timer.status}
                  elapsed={timer.elapsed}
                  taskTotals={taskTotals}
                  projectTotalMs={projectTotalMs(project.id)}
                  onStartTask={(taskId) => handleStartTask(taskId, project.id)}
                  onPause={timer.pause}
                  onResume={timer.resume}
                  onStop={handleStop}
                  onAddTask={(name) => addTask(project.id, name)}
                  onRenameTask={updateTask}
                  onDeleteTask={deleteTask}
                />
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {!hasProjects && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>◆</Text>
            <Text style={styles.emptyTitle}>Keine Projekte vorhanden</Text>
            <Text style={styles.emptyHint}>
              Erstelle dein erstes Projekt im Projekte-Tab,{'\n'}
              um Zeiten zu erfassen.
            </Text>
          </View>
        )}

        {/* Today timeline */}
        <TodayTimeline entries={entries} />
      </ScrollView>

      {/* New entry modal */}
      <NewEntryModal
        visible={showNewEntry}
        projects={projects}
        onStart={handleNewEntryStart}
        onClose={() => setShowNewEntry(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  // Timer
  timerSection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  timerText: {
    fontSize: 72,
    fontWeight: '200',
    color: t.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: 4,
    fontFamily: Platform.OS === 'web' ? 'ui-monospace, "SF Mono", "Cascadia Code", monospace' : undefined,
  },
  runningChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: t.radiusChip,
    marginTop: 10,
  },
  runningDot: { width: 6, height: 6, borderRadius: 3 },
  runningLabel: { fontSize: 12, fontWeight: '600' },
  runningStatus: { fontSize: 11, color: t.textTertiary, marginLeft: 4 },
  startButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: t.radiusChip,
    backgroundColor: t.accent,
    ...t.cardShadow,
    shadowColor: t.accent,
    shadowOpacity: 0.2,
  },
  startButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  shortcutHint: {
    marginTop: 12,
    fontSize: 11,
    color: t.textPlaceholder,
    letterSpacing: 0.3,
  },

  // Sections
  section: { paddingHorizontal: 16, marginTop: 4 },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: t.textTertiary,
    letterSpacing: 1.5, marginBottom: 10, paddingHorizontal: 4,
  },
  projectList: { gap: 10 },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: 48, paddingBottom: 32 },
  emptyIcon: { fontSize: 40, color: t.textPlaceholder, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: t.textSecondary },
  emptyHint: { fontSize: 13, color: t.textTertiary, textAlign: 'center', marginTop: 4, lineHeight: 20 },

  // Modal
  modalBackdrop: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)', padding: 24,
  },
  modalCard: {
    backgroundColor: t.card, borderRadius: t.radiusCard,
    borderWidth: 1, borderColor: t.border, padding: 20,
    width: '100%', maxWidth: 360,
  },
  modalTitle: { fontSize: 15, fontWeight: '600', color: t.text, marginBottom: 14 },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8,
  },
  modalDot: { width: 8, height: 8, borderRadius: 4 },
  modalOptionText: { fontSize: 14, color: t.text, flex: 1 },
  modalShortcut: {
    fontSize: 11, fontWeight: '600', color: t.textTertiary,
    backgroundColor: t.bg, paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 4, overflow: 'hidden',
  },
  modalEmpty: { fontSize: 13, color: t.textTertiary, paddingVertical: 12 },
});
