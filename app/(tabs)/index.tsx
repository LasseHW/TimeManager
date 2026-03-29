import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTimer } from '../../hooks/useTimer';
import { useTodayEntries, type TodayEntry } from '../../hooks/useTodayEntries';
import { useTasks } from '../../hooks/useTasks';
import { useFolders } from '../../hooks/useFolders';
import { useProjects, type Project } from '../../contexts/ProjectsContext';
import { useProjectEntries, type ProjectEntry } from '../../hooks/useProjectEntries';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { FolderPanel } from '../../components/FolderPanel';
import { ProjectPanel } from '../../components/ProjectPanel';
import { TaskPanel } from '../../components/TaskPanel';
import { TimeEntryEditModal } from '../../components/TimeEntryEditModal';
import { ProjectFormModal } from '../../components/ProjectFormModal';
import { ExportModal } from '../../components/ExportModal';
import ReportsScreen from './reports';
import { t } from '../../lib/theme';

// ── Constants ────────────────────────────────────────

const MOBILE_BREAK = 768;
const ANIM_DURATION = 250;
const ANIM_EASING = Easing.out(Easing.cubic);

// ── Helpers ──────────────────────────────────────────

function entryDurationMs(e: TodayEntry) {
  if (!e.end_time) return 0;
  return Math.max(0, new Date(e.end_time).getTime() - new Date(e.start_time).getTime() - (e.paused_duration ?? 0) * 1000);
}

// ── Keyboard shortcuts ───────────────────────────────

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

// ── Main ─────────────────────────────────────────────

export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isDesktop = windowWidth >= MOBILE_BREAK;

  // Hooks
  const { session } = useAuth();
  const timer = useTimer();
  const { entries: todayEntries, refresh: refreshToday, totalTodayMs, taskTotals: todayTaskTotals } = useTodayEntries();
  const { folders, addFolder, updateFolder, deleteFolder } = useFolders();
  const { projects, addProject, updateProject, deleteProject } = useProjects();
  const { tasks, tasksForProject, addTask, updateTask, deleteTask } = useTasks();

  // Selection state
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'folders' | 'timer' | 'reports'>('timer');

  // Project entries (all-time for selected project)
  const { entries: projEntries, refresh: refreshProjEntries, taskTotals: projTaskTotals, entriesByTask, totalMs: projTotalMs } = useProjectEntries(selectedProjectId);

  // Modals
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editEntry, setEditEntry] = useState<{
    id?: string; task_id: string; project_id: string;
    start_time?: string; end_time?: string; description?: string | null;
  } | null>(null);
  const [showExport, setShowExport] = useState(false);

  // Mobile drawer
  const drawerAnim = useRef(new Animated.Value(0)).current;
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => {
    if (!isDesktop) {
      Animated.timing(drawerAnim, {
        toValue: drawerOpen ? 1 : 0,
        duration: ANIM_DURATION,
        easing: ANIM_EASING,
        useNativeDriver: true,
      }).start();
    }
  }, [drawerOpen, isDesktop, drawerAnim]);

  useKeyboardShortcuts(
    timer.status,
    timer.pause,
    timer.resume,
    async () => { await timer.stop(); refreshToday(); refreshProjEntries(); },
  );

  // ── Computed ───────────────────────────────────────

  // Projects for selected folder
  const filteredProjects = useMemo(() => {
    if (selectedFolderId === null) return projects;
    return projects.filter((p) => p.folder_id === selectedFolderId);
  }, [projects, selectedFolderId]);

  // Per-project totals (today, for sidebar display)
  const projectTodayTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of todayEntries) {
      if (!e.project) continue;
      map.set(e.project.id, (map.get(e.project.id) ?? 0) + entryDurationMs(e));
    }
    if (timer.running?.projectId && timer.status !== 'idle') {
      const pid = timer.running.projectId;
      map.set(pid, (map.get(pid) ?? 0) + timer.elapsed);
    }
    return map;
  }, [todayEntries, timer.running, timer.elapsed, timer.status]);

  // Per-folder totals (today)
  const folderTodayTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of projects) {
      if (!p.folder_id) continue;
      const ms = projectTodayTotals.get(p.id) ?? 0;
      if (ms > 0) map.set(p.folder_id, (map.get(p.folder_id) ?? 0) + ms);
    }
    return map;
  }, [projects, projectTodayTotals]);

  const liveTotalMs = totalTodayMs + (timer.status !== 'idle' ? timer.elapsed : 0);

  // Selected project/folder info
  const selectedProject = selectedProjectId ? projects.find((p) => p.id === selectedProjectId) : null;
  const selectedFolder = selectedProject?.folder_id ? folders.find((f) => f.id === selectedProject.folder_id) : null;
  const tasksForSelected = selectedProjectId ? tasksForProject(selectedProjectId) : [];

  // Running task id
  const runningTaskId = timer.running?.taskId ?? null;

  // ── Handlers ───────────────────────────────────────

  async function handleStartTask(taskId: string) {
    if (!selectedProjectId) return;
    await timer.start({ projectId: selectedProjectId, taskId });
  }

  async function handleStop() {
    await timer.stop();
    refreshToday();
    refreshProjEntries();
  }

  async function handleUpdateEntryDesc(entryId: string, desc: string) {
    await supabase.from('time_entries').update({ description: desc }).eq('id', entryId);
    refreshProjEntries();
  }

  async function handleDeleteEntry(entryId: string) {
    await supabase.from('time_entries').delete().eq('id', entryId);
    refreshProjEntries();
    refreshToday();
  }

  async function handleSaveProject(name: string, color: string) {
    if (editProject) await updateProject(editProject.id, name, color, editProject.folder_id);
    else await addProject(name, color, selectedFolderId);
    setShowProjectForm(false);
    setEditProject(null);
  }

  function handleAddManualEntry(taskId: string) {
    if (!selectedProjectId) return;
    setEditEntry({ task_id: taskId, project_id: selectedProjectId });
  }

  function handleEditEntry(entry: ProjectEntry) {
    setEditEntry({
      id: entry.id,
      task_id: entry.task_id ?? '',
      project_id: entry.project_id,
      start_time: entry.start_time,
      end_time: entry.end_time,
      description: entry.description,
    });
  }

  // ── Render ─────────────────────────────────────────

  const folderPanel = (
    <FolderPanel
      folders={folders}
      selectedFolderId={selectedFolderId}
      onSelectFolder={setSelectedFolderId}
      folderTotals={folderTodayTotals}
      totalAllMs={liveTotalMs}
      onAddFolder={addFolder}
      onRenameFolder={updateFolder}
      onDeleteFolder={deleteFolder}
      userEmail={session?.user.email ?? ''}
    />
  );

  const projectPanel = (
    <ProjectPanel
      projects={filteredProjects}
      selectedProjectId={selectedProjectId}
      onSelectProject={(id) => {
        setSelectedProjectId(id);
        if (!isDesktop) { setMobileTab('timer'); setDrawerOpen(false); }
      }}
      projectTotals={projectTodayTotals}
      runningProjectId={timer.running?.projectId ?? null}
      onAddProject={() => { setEditProject(null); setShowProjectForm(true); }}
      onEditProject={(p) => { setEditProject(p); setShowProjectForm(true); }}
      onRenameProject={async (id, name) => {
        await supabase.from('projects').update({ name }).eq('id', id);
        // Refresh projects by triggering a re-fetch — use updateProject with current values
        const proj = projects.find((p) => p.id === id);
        if (proj) await updateProject(id, name, proj.color, proj.folder_id);
      }}
    />
  );

  const taskPanel = (
    <TaskPanel
      folderName={selectedFolder?.name ?? null}
      projectName={selectedProject?.name ?? null}
      projectColor={selectedProject?.color ?? t.textTertiary}
      tasks={tasksForSelected}
      entriesByTask={entriesByTask}
      taskTotals={projTaskTotals}
      totalProjectMs={projTotalMs}
      timerStatus={timer.status}
      runningTaskId={timer.status !== 'idle' && timer.running?.projectId === selectedProjectId ? runningTaskId : null}
      elapsed={timer.elapsed}
      onStartTask={handleStartTask}
      onPause={timer.pause}
      onResume={timer.resume}
      onStop={handleStop}
      onAddTask={async (name) => {
        if (selectedProjectId) {
          const id = await addTask(selectedProjectId, name);
          if (id) await timer.start({ projectId: selectedProjectId, taskId: id });
        }
      }}
      onRenameTask={updateTask}
      onDeleteTask={deleteTask}
      onUpdateEntryDesc={handleUpdateEntryDesc}
      onDeleteEntry={handleDeleteEntry}
      onEditEntry={handleEditEntry}
      onAddManualEntry={handleAddManualEntry}
      onExport={() => setShowExport(true)}
    />
  );

  // ════════════════════════════════════════════════════
  // DESKTOP
  // ════════════════════════════════════════════════════
  if (isDesktop) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {folderPanel}
        {projectPanel}
        <View style={styles.mainDesktop}>{taskPanel}</View>

        <ProjectFormModal
          visible={showProjectForm}
          project={editProject}
          onSave={handleSaveProject}
          onClose={() => { setShowProjectForm(false); setEditProject(null); }}
        />
        <TimeEntryEditModal
          entry={editEntry}
          onClose={() => setEditEntry(null)}
          onSaved={() => { refreshProjEntries(); refreshToday(); }}
        />
        <ExportModal
          visible={showExport}
          project={selectedProject ?? null}
          allProjects={projects}
          tasks={tasks}
          onClose={() => setShowExport(false)}
        />
      </View>
    );
  }

  // ════════════════════════════════════════════════════
  // MOBILE
  // ════════════════════════════════════════════════════
  return (
    <View style={[styles.root, { paddingTop: insets.top, flexDirection: 'column' }]}>
      {/* Content area */}
      <View style={styles.mobileContent}>
        {mobileTab === 'folders' && (
          <View style={styles.mobilePanels}>
            {folderPanel}
            <View style={styles.mobileProjectWrap}>{projectPanel}</View>
          </View>
        )}
        {mobileTab === 'timer' && taskPanel}
        {mobileTab === 'reports' && <ReportsScreen />}
      </View>

      {/* Bottom tab bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
        {(['folders', 'timer', 'reports'] as const).map((tab) => {
          const active = mobileTab === tab;
          const labels = { folders: 'Ordner', timer: 'Timer', reports: 'Analyse' };
          const icons = { folders: '\u{1F4C1}', timer: '\u23F1', reports: '\u{1F4CA}' };
          return (
            <Pressable key={tab} style={styles.bottomTab} onPress={() => setMobileTab(tab)}>
              <Text style={[styles.bottomTabIcon, active && styles.bottomTabIconActive]}>
                {icons[tab]}
              </Text>
              <Text style={[styles.bottomTabLabel, active && styles.bottomTabLabelActive]}>
                {labels[tab]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ProjectFormModal
        visible={showProjectForm}
        project={editProject}
        onSave={handleSaveProject}
        onClose={() => { setShowProjectForm(false); setEditProject(null); }}
      />
      <TimeEntryEditModal
        entry={editEntry}
        onClose={() => setEditEntry(null)}
        onSaved={() => { refreshProjEntries(); refreshToday(); }}
      />
      <ExportModal
        visible={showExport}
        project={selectedProject ?? null}
        allProjects={projects}
        tasks={tasks}
        onClose={() => setShowExport(false)}
      />
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

  // Desktop
  mainDesktop: { flex: 1 },

  // Mobile
  mobileContent: { flex: 1 },
  mobilePanels: { flex: 1, flexDirection: 'row' },
  mobileProjectWrap: { flex: 1 },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: t.panelBg,
    borderTopWidth: 1,
    borderTopColor: t.panelBorder,
    paddingTop: 6,
  },
  bottomTab: { flex: 1, alignItems: 'center', gap: 2 },
  bottomTabIcon: { fontSize: 18, color: t.textTertiary },
  bottomTabIconActive: { color: t.accent },
  bottomTabLabel: { fontSize: 10, color: t.textTertiary, fontWeight: '500' },
  bottomTabLabelActive: { color: t.accent, fontWeight: '600' },
});
