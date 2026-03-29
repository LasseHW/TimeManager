import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { t } from '../lib/theme';
import type { Task } from '../hooks/useTasks';
import type { ProjectEntry } from '../hooks/useProjectEntries';
import type { TimerStatus } from '../hooks/useTimer';

// ── Helpers ──────────────────────────────────────────

function fmtMs(ms: number) {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function entryMs(e: ProjectEntry) {
  return Math.max(0, new Date(e.end_time).getTime() - new Date(e.start_time).getTime() - (e.paused_duration ?? 0) * 1000);
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d.getTime() === today.getTime()) return 'Heute';
  const y = new Date(today);
  y.setDate(today.getDate() - 1);
  if (d.getTime() === y.getTime()) return 'Gestern';
  const days = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  return `${days[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function groupByDate(entries: ProjectEntry[]): [string, ProjectEntry[]][] {
  const map = new Map<string, ProjectEntry[]>();
  for (const e of entries) {
    const key = e.start_time.slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

// ── Types ────────────────────────────────────────────

type Props = {
  folderName: string | null;
  projectName: string | null;
  projectColor: string;
  tasks: Task[];
  entriesByTask: Map<string, ProjectEntry[]>;
  taskTotals: Map<string, number>;
  totalProjectMs: number;
  timerStatus: TimerStatus;
  runningTaskId: string | null;
  elapsed: number;
  onStartTask: (taskId: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onAddTask: (name: string) => void;
  onRenameTask: (id: string, name: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateEntryDesc: (entryId: string, desc: string) => void;
  onDeleteEntry: (entryId: string) => void;
  onEditEntry: (entry: ProjectEntry) => void;
  onAddManualEntry: (taskId: string) => void;
  onExport: () => void;
};

// ── Component ────────────────────────────────────────

export function TaskPanel({
  folderName, projectName, projectColor, tasks, entriesByTask, taskTotals,
  totalProjectMs, timerStatus, runningTaskId, elapsed,
  onStartTask, onPause, onResume, onStop,
  onAddTask, onRenameTask, onDeleteTask,
  onUpdateEntryDesc, onDeleteEntry, onEditEntry, onAddManualEntry, onExport,
}: Props) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null);

  // Inline task rename
  const [renamingTaskId, setRenamingTaskId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameOriginal, setRenameOriginal] = useState('');
  const taskClickRef = useRef<{ id: string; time: number } | null>(null);

  function handleTaskPress(taskId: string) {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
    if (Platform.OS === 'web') {
      const now = Date.now();
      if (taskClickRef.current?.id === taskId && now - taskClickRef.current.time < 400) {
        startTaskRename(taskId);
        taskClickRef.current = null;
      } else {
        taskClickRef.current = { id: taskId, time: now };
      }
    }
  }

  function startTaskRename(taskId: string) {
    const task = tasks.find((tk) => tk.id === taskId);
    if (!task) return;
    setRenamingTaskId(taskId);
    setRenameValue(task.name);
    setRenameOriginal(task.name);
  }

  function commitTaskRename(taskId: string) {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== renameOriginal) onRenameTask(taskId, trimmed);
    else setRenameValue(renameOriginal);
    setRenamingTaskId(null);
  }

  function cancelTaskRename() {
    setRenamingTaskId(null);
  }

  function handleAddTask() {
    const trimmed = newTaskName.trim();
    if (trimmed) onAddTask(trimmed);
    setNewTaskName('');
  }

  function handleSaveDesc(entryId: string) {
    setEditingEntryId(null);
    onUpdateEntryDesc(entryId, editDesc);
  }

  const entryHover = (id: string) =>
    Platform.OS === 'web'
      ? { onMouseEnter: () => setHoveredEntryId(id), onMouseLeave: () => setHoveredEntryId(null) }
      : {};

  if (!projectName) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>{'\u25C6'}</Text>
        <Text style={styles.emptyTitle}>Projekt auswählen</Text>
        <Text style={styles.emptyHint}>Wähle ein Projekt aus der Liste, um Aufgaben und Zeiteinträge zu sehen.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Breadcrumb + stats ── */}
      <View style={styles.headerBar}>
        <View style={styles.breadcrumb}>
          {folderName && (
            <>
              <Text style={styles.breadcrumbFolder}>{folderName}</Text>
              <Text style={styles.breadcrumbSep}>{'>'}</Text>
            </>
          )}
          <View style={[styles.breadcrumbDot, { backgroundColor: projectColor }]} />
          <Text style={styles.breadcrumbProject}>{projectName}</Text>
        </View>
        <Text style={styles.totalTime}>{fmtMs(totalProjectMs + (runningTaskId ? elapsed : 0))}</Text>
      </View>

      {/* ── Task list ── */}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {tasks.map((task) => {
          const isRunning = runningTaskId === task.id;
          const isExpanded = expandedTaskId === task.id;
          const totalMs = taskTotals.get(task.id) ?? 0;
          const displayMs = isRunning ? totalMs + elapsed : totalMs;
          const taskEntries = entriesByTask.get(task.id) ?? [];
          const grouped = isExpanded ? groupByDate(taskEntries) : [];

          return (
            <View key={task.id}>
              {/* Task row */}
              <Pressable
                style={[styles.taskRow, isRunning && styles.taskRowActive]}
                onPress={() => handleTaskPress(task.id)}
                onLongPress={() => startTaskRename(task.id)}
              >
                {/* Play/Pause/Stop */}
                <View style={styles.taskControls}>
                  {!isRunning ? (
                    <Pressable
                      style={styles.playBtn}
                      onPress={() => onStartTask(task.id)}
                    >
                      <Text style={styles.playIcon}>{'\u25B6'}</Text>
                    </Pressable>
                  ) : timerStatus === 'running' ? (
                    <Pressable
                      style={[styles.ctrlBtn, { backgroundColor: t.yellowBg }]}
                      onPress={onPause}
                    >
                      <Text style={[styles.ctrlIcon, { color: t.yellow }]}>{'\u23F8'}</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.ctrlBtn, { backgroundColor: t.greenBg }]}
                      onPress={onResume}
                    >
                      <Text style={[styles.ctrlIcon, { color: t.green }]}>{'\u25B6'}</Text>
                    </Pressable>
                  )}
                  {isRunning && (
                    <Pressable
                      style={[styles.ctrlBtn, { backgroundColor: t.redBg }]}
                      onPress={onStop}
                    >
                      <Text style={[styles.ctrlIcon, { color: t.red }]}>{'\u23F9'}</Text>
                    </Pressable>
                  )}
                </View>

                {/* Task name — inline rename on double-click/long-press */}
                {renamingTaskId === task.id ? (
                  <TextInput
                    style={styles.taskNameInput}
                    value={renameValue}
                    onChangeText={setRenameValue}
                    onBlur={() => commitTaskRename(task.id)}
                    onSubmitEditing={() => commitTaskRename(task.id)}
                    onKeyPress={(e) => {
                      if ((e as any).nativeEvent?.key === 'Escape') cancelTaskRename();
                    }}
                    autoFocus
                    selectTextOnFocus
                  />
                ) : (
                  <Text style={[styles.taskName, isRunning && styles.taskNameActive]} numberOfLines={1}>
                    {task.name}
                  </Text>
                )}

                <Text style={[styles.taskTime, isRunning && styles.taskTimeActive]}>
                  {displayMs > 0 ? fmtMs(displayMs) : '-'}
                </Text>

                <Text style={styles.expandIcon}>{isExpanded ? '\u25BE' : '\u25B8'}</Text>
              </Pressable>

              {/* Expanded entries */}
              {isExpanded && (
                <View style={styles.entriesWrap}>
                  {grouped.length === 0 && (
                    <Text style={styles.noEntries}>Keine Einträge</Text>
                  )}
                  {grouped.map(([dateKey, dayEntries]) => (
                    <View key={dateKey}>
                      <Text style={styles.dateHeader}>{formatDateHeader(dateKey)}</Text>
                      {dayEntries.map((e) => {
                        const isHovered = hoveredEntryId === e.id;
                        const isEditingDesc = editingEntryId === e.id;
                        return (
                          <View key={e.id} style={styles.entryRow} {...entryHover(e.id)}>
                            <Text style={styles.entryTime}>
                              {fmtTime(e.start_time)} {'\u2192'} {fmtTime(e.end_time)}
                            </Text>
                            <Text style={styles.entryDuration}>{fmtMs(entryMs(e))}</Text>
                            <View style={styles.entryDescWrap}>
                              {isEditingDesc ? (
                                <TextInput
                                  style={styles.entryDescInput}
                                  value={editDesc}
                                  onChangeText={setEditDesc}
                                  onBlur={() => handleSaveDesc(e.id)}
                                  onSubmitEditing={() => handleSaveDesc(e.id)}
                                  autoFocus
                                />
                              ) : (
                                <Pressable
                                  onPress={() => { setEditingEntryId(e.id); setEditDesc(e.description ?? ''); }}
                                >
                                  <Text style={styles.entryDesc} numberOfLines={1}>
                                    {e.description || 'Beschreibung...'}
                                  </Text>
                                </Pressable>
                              )}
                            </View>
                            {isHovered && (
                              <View style={styles.entryActions}>
                                <Pressable style={styles.entryActionBtn} onPress={() => onEditEntry(e)}>
                                  <Text style={styles.entryActionIcon}>{'\u270E'}</Text>
                                </Pressable>
                                <Pressable style={styles.entryActionBtn} onPress={() => onDeleteEntry(e.id)}>
                                  <Text style={[styles.entryActionIcon, { color: t.red }]}>{'×'}</Text>
                                </Pressable>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Add task inline */}
        <View style={styles.addTaskRow}>
          <TextInput
            style={styles.addTaskInput}
            placeholder="+ Aufgabe hinzufügen..."
            placeholderTextColor={t.textPlaceholder}
            value={newTaskName}
            onChangeText={setNewTaskName}
            onSubmitEditing={handleAddTask}
            returnKeyType="done"
          />
        </View>
      </ScrollView>

      {/* ── Bottom action bar ── */}
      <View style={styles.actionBar}>
        <View style={{ flex: 1 }} />
        <Pressable style={styles.actionBtn} onPress={onExport}>
          <Text style={styles.actionBtnText}>{'\u2191'} Export</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────

const mono = Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  emptyContainer: { flex: 1, backgroundColor: t.bg, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 36, color: t.textTertiary, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: t.textSecondary },
  emptyHint: { fontSize: 13, color: t.textTertiary, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  // Header
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: t.panelBorder,
    backgroundColor: t.panelBg,
  },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  breadcrumbFolder: { fontSize: 12, color: t.textTertiary },
  breadcrumbSep: { fontSize: 12, color: t.textTertiary },
  breadcrumbDot: { width: 8, height: 8, borderRadius: 4 },
  breadcrumbProject: { fontSize: 15, fontWeight: '600', color: t.text },
  totalTime: { fontSize: 14, fontWeight: '700', color: t.accent, fontVariant: ['tabular-nums'], fontFamily: mono },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Task row
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: t.borderLight,
  },
  taskRowActive: { backgroundColor: t.activeRow },
  taskControls: { flexDirection: 'row', gap: 4 },
  playBtn: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 1.5, borderColor: t.border, backgroundColor: t.panelBg,
    justifyContent: 'center', alignItems: 'center',
  },
  playIcon: { fontSize: 9, color: t.textSecondary, marginLeft: 2 },
  ctrlBtn: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  ctrlIcon: { fontSize: 10 },
  taskName: { flex: 1, fontSize: 14, color: t.text, fontWeight: '500' },
  taskNameInput: { flex: 1, fontSize: 14, fontWeight: '500', color: t.text, padding: 4, backgroundColor: t.activeRow, borderRadius: 4, borderBottomWidth: 1, borderBottomColor: t.accent },
  taskNameActive: { color: t.accent, fontWeight: '600' },
  taskTime: { fontSize: 13, fontWeight: '600', color: t.textSecondary, fontVariant: ['tabular-nums'], fontFamily: mono, minWidth: 60, textAlign: 'right' },
  taskTimeActive: { color: t.accent, fontWeight: '700' },
  expandIcon: { fontSize: 11, color: t.textTertiary },

  // Entries
  entriesWrap: { backgroundColor: t.bg, paddingLeft: 52, paddingRight: 20, paddingBottom: 8 },
  noEntries: { fontSize: 12, color: t.textTertiary, paddingVertical: 8 },
  dateHeader: { fontSize: 12, fontWeight: '700', color: t.accent, paddingTop: 10, paddingBottom: 4 },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  entryTime: { fontSize: 12, color: t.textTertiary, fontVariant: ['tabular-nums'], fontFamily: mono, width: 110 },
  entryDuration: { fontSize: 12, fontWeight: '600', color: t.textSecondary, fontVariant: ['tabular-nums'], fontFamily: mono, width: 55, textAlign: 'right' },
  entryDescWrap: { flex: 1 },
  entryDesc: { fontSize: 12, color: t.textSecondary },
  entryDescInput: { fontSize: 12, color: t.text, padding: 2, borderBottomWidth: 1, borderBottomColor: t.accent },
  entryActions: { flexDirection: 'row', gap: 4 },
  entryActionBtn: { width: 22, height: 22, borderRadius: 4, backgroundColor: t.borderLight, justifyContent: 'center', alignItems: 'center' },
  entryActionIcon: { fontSize: 12, color: t.textSecondary },

  // Add task
  addTaskRow: { paddingHorizontal: 20, paddingVertical: 8 },
  addTaskInput: { fontSize: 13, color: t.text, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.borderLight },

  // Action bar
  actionBar: {
    flexDirection: 'row', gap: 12,
    paddingHorizontal: 20, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: t.panelBorder,
    backgroundColor: t.panelBg,
  },
  actionBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: t.radiusCard, backgroundColor: t.borderLight },
  actionBtnText: { fontSize: 12, color: t.accent, fontWeight: '600' },
});
