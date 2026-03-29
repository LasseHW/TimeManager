import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { t } from '../lib/theme';
import { TaskRow } from './TaskRow';
import type { Project } from '../contexts/ProjectsContext';
import type { Task } from '../hooks/useTasks';
import type { TimerStatus } from '../hooks/useTimer';

function fmtMs(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

type Props = {
  project: Project;
  tasks: Task[];
  runningTaskId: string | null;
  timerStatus: TimerStatus;
  elapsed: number;
  taskTotals: Map<string, number>;
  projectTotalMs: number;
  onStartTask: (taskId: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onAddTask: (name: string) => void;
  onRenameTask: (id: string, name: string) => void;
  onDeleteTask: (id: string) => void;
};

export function ProjectCard({
  project, tasks, runningTaskId, timerStatus, elapsed, taskTotals,
  projectTotalMs, onStartTask, onPause, onResume, onStop,
  onAddTask, onRenameTask, onDeleteTask,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  function handleAdd() {
    const trimmed = newName.trim();
    if (trimmed) { onAddTask(trimmed); setNewName(''); }
    setAdding(false);
  }

  return (
    <View style={[styles.card, t.cardShadow]}>
      {/* Color bar */}
      <View style={[styles.bar, { backgroundColor: project.color }]} />

      <View style={styles.body}>
        {/* Header */}
        <Pressable style={styles.header} onPress={() => setCollapsed(!collapsed)}>
          <View style={styles.headerLeft}>
            <View style={[styles.dot, { backgroundColor: project.color }]} />
            <Text style={styles.projectName}>{project.name}</Text>
          </View>
          <View style={styles.headerRight}>
            {projectTotalMs > 0 && (
              <Text style={styles.totalTime}>{fmtMs(projectTotalMs)}</Text>
            )}
            <Text style={styles.chevron}>{collapsed ? '▸' : '▾'}</Text>
          </View>
        </Pressable>

        {/* Tasks */}
        {!collapsed && (
          <View style={styles.taskList}>
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                projectColor={project.color}
                isRunning={runningTaskId === task.id}
                timerStatus={timerStatus}
                elapsed={runningTaskId === task.id ? elapsed : 0}
                totalMs={taskTotals.get(task.id) ?? 0}
                onStart={() => onStartTask(task.id)}
                onPause={onPause}
                onResume={onResume}
                onStop={onStop}
                onRename={(name) => onRenameTask(task.id, name)}
                onDelete={() => onDeleteTask(task.id)}
              />
            ))}

            {/* Add task */}
            {adding ? (
              <View style={styles.addRow}>
                <TextInput
                  style={styles.addInput}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Aufgabenname..."
                  placeholderTextColor={t.textPlaceholder}
                  onSubmitEditing={handleAdd}
                  onBlur={handleAdd}
                  autoFocus
                />
              </View>
            ) : (
              <Pressable style={styles.addBtn} onPress={() => setAdding(true)}>
                <Text style={styles.addBtnText}>+ Aufgabe hinzufügen</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: t.card,
    borderRadius: t.radiusCard,
    borderWidth: 1,
    borderColor: t.border,
    overflow: 'hidden',
  },
  bar: { width: 4 },
  body: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    paddingLeft: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  projectName: { fontSize: 14, fontWeight: '600', color: t.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  totalTime: { fontSize: 12, fontWeight: '600', color: t.textSecondary, fontVariant: ['tabular-nums'] },
  chevron: { fontSize: 12, color: t.textTertiary },
  taskList: { paddingBottom: 6, paddingHorizontal: 4 },
  addRow: { paddingHorizontal: 12, paddingVertical: 6 },
  addInput: {
    fontSize: 13, color: t.text, paddingVertical: 6, paddingHorizontal: 8,
    borderWidth: 1, borderColor: t.accent, borderRadius: t.radiusInput, backgroundColor: t.accentLight,
  },
  addBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  addBtnText: { fontSize: 12, color: t.textTertiary, fontWeight: '500' },
});
