import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { t } from '../lib/theme';
import type { Project } from '../contexts/ProjectsContext';

type Props = {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (id: string) => void;
  projectTotals: Map<string, number>;
  runningProjectId: string | null;
  onAddProject: () => void;
  onEditProject: (project: Project) => void;
  onRenameProject: (id: string, name: string) => void;
};

function fmtMs(ms: number) {
  if (ms <= 0) return '';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function ProjectPanel({
  projects, selectedProjectId, onSelectProject, projectTotals,
  runningProjectId, onAddProject, onEditProject, onRenameProject,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOriginal, setEditOriginal] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Double-click tracking for web
  const lastClickRef = useRef<{ id: string; time: number } | null>(null);

  function handlePress(id: string) {
    onSelectProject(id);
    if (Platform.OS === 'web') {
      const now = Date.now();
      if (lastClickRef.current?.id === id && now - lastClickRef.current.time < 400) {
        startEditing(id);
        lastClickRef.current = null;
      } else {
        lastClickRef.current = { id, time: now };
      }
    }
  }

  function startEditing(id: string) {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    setEditingId(id);
    setEditName(project.name);
    setEditOriginal(project.name);
  }

  function commitRename(id: string) {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== editOriginal) onRenameProject(id, trimmed);
    setEditingId(null);
  }

  function cancelRename() {
    setEditingId(null);
  }

  const webHover = (id: string) =>
    Platform.OS === 'web'
      ? { onMouseEnter: () => setHoveredId(id), onMouseLeave: () => setHoveredId(null) }
      : {};

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Projekte</Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {projects.length === 0 && (
          <Text style={styles.emptyText}>Keine Projekte</Text>
        )}

        {projects.map((p) => {
          const isActive = selectedProjectId === p.id;
          const isRunning = runningProjectId === p.id;
          const isEditing = editingId === p.id;
          const total = projectTotals.get(p.id) ?? 0;

          return (
            <Pressable
              key={p.id}
              style={[styles.row, isActive && styles.rowActive]}
              onPress={() => handlePress(p.id)}
              onLongPress={() => startEditing(p.id)}
              {...webHover(p.id)}
            >
              {isEditing ? (
                <View style={styles.editRow}>
                  <View style={[styles.dot, { backgroundColor: p.color }]} />
                  <TextInput
                    style={styles.editInput}
                    value={editName}
                    onChangeText={setEditName}
                    onBlur={() => commitRename(p.id)}
                    onSubmitEditing={() => commitRename(p.id)}
                    onKeyPress={(e) => {
                      if ((e as any).nativeEvent?.key === 'Escape') cancelRename();
                    }}
                    autoFocus
                    selectTextOnFocus
                  />
                </View>
              ) : (
                <>
                  <View style={styles.rowLeft}>
                    {isRunning && <View style={styles.runningBar} />}
                    <View style={[styles.dot, { backgroundColor: p.color }]} />
                    <Text style={[styles.name, isActive && styles.nameActive]} numberOfLines={1}>
                      {p.name}
                    </Text>
                  </View>
                  {total > 0 && <Text style={styles.time}>{fmtMs(total)}</Text>}
                </>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.addBtn} onPress={onAddProject}>
          <Text style={styles.addBtnText}>+ Projekt</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 280, backgroundColor: t.panelBg, borderRightWidth: 1, borderRightColor: t.panelBorder },
  header: { fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  list: { flex: 1 },
  listContent: { paddingBottom: 8 },
  emptyText: { fontSize: 12, color: t.textTertiary, paddingHorizontal: 14, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingHorizontal: 14 },
  rowActive: { backgroundColor: t.activeRow },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  editInput: { flex: 1, fontSize: 13, color: t.text, padding: 4, backgroundColor: t.activeRow, borderRadius: 4, borderBottomWidth: 1, borderBottomColor: t.accent },
  runningBar: { width: 3, height: 14, borderRadius: 1.5, backgroundColor: t.accent },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { fontSize: 13, color: t.text, fontWeight: '400', flex: 1 },
  nameActive: { color: t.accent, fontWeight: '600' },
  time: { fontSize: 12, color: t.textTertiary, fontWeight: '500', fontVariant: ['tabular-nums'], marginLeft: 8, fontFamily: Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined },
  footer: { borderTopWidth: 1, borderTopColor: t.borderLight, padding: 12 },
  addBtn: { paddingVertical: 4 },
  addBtnText: { fontSize: 12, color: t.accent, fontWeight: '600' },
});
