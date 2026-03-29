import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useProjects, type Project } from '../../contexts/ProjectsContext';
import { useTimer } from '../../hooks/useTimer';
import { ProjectFormModal } from '../../components/ProjectFormModal';
import { showAlert } from '../../lib/alert';
import { t } from '../../lib/theme';

export default function ProjectsScreen() {
  const { projects, addProject, updateProject, deleteProject } = useProjects();
  const { status, start } = useTimer();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

  function openCreate() { setEditProject(null); setModalVisible(true); }
  function openEdit(p: Project) { setEditProject(p); setModalVisible(true); }

  async function handleSave(name: string, color: string) {
    if (editProject) await updateProject(editProject.id, name, color);
    else await addProject(name, color);
    setModalVisible(false);
  }

  function handleDelete(p: Project) {
    showAlert('Projekt löschen', `"${p.name}" wirklich löschen?`);
    deleteProject(p.id);
  }

  async function handleStart(p: Project) {
    if (status !== 'idle') { showAlert('Timer läuft', 'Stoppe zuerst den Timer.'); return; }
    await start({ projectId: p.id });
    router.navigate('/');
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Projekte</Text>
        <Pressable style={styles.addBtn} onPress={openCreate}>
          <Text style={styles.addText}>+ Neu</Text>
        </Pressable>
      </View>
      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.row, t.cardShadow]}>
            <Pressable style={styles.rowMain} onPress={() => openEdit(item)}>
              <View style={[styles.dot, { backgroundColor: item.color }]} />
              <Text style={styles.name}>{item.name}</Text>
            </Pressable>
            <View style={styles.actions}>
              <Pressable style={styles.playBtn} onPress={() => handleStart(item)}>
                <Text style={styles.playText}>▶ Start</Text>
              </Pressable>
              <Pressable style={styles.delBtn} onPress={() => handleDelete(item)}>
                <Text style={styles.delText}>×</Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>◆</Text>
            <Text style={styles.emptyTitle}>Noch keine Projekte</Text>
            <Pressable style={styles.ctaBtn} onPress={openCreate}>
              <Text style={styles.ctaText}>Erstes Projekt erstellen</Text>
            </Pressable>
          </View>
        }
      />
      <ProjectFormModal
        visible={modalVisible}
        project={editProject}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '600', color: t.text },
  addBtn: {
    backgroundColor: t.accent, paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: t.radiusChip,
  },
  addText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  list: { paddingHorizontal: 16, gap: 8, paddingBottom: 24 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, backgroundColor: t.card, borderRadius: t.radiusCard,
    borderWidth: 1, borderColor: t.border,
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontSize: 14, fontWeight: '500', color: t.text },
  actions: { flexDirection: 'row', gap: 6 },
  playBtn: {
    backgroundColor: t.greenBg, borderWidth: 1, borderColor: t.greenBorder,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: t.radiusChip,
  },
  playText: { color: t.green, fontSize: 12, fontWeight: '600' },
  delBtn: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: t.redBg,
    justifyContent: 'center', alignItems: 'center',
  },
  delText: { color: t.red, fontSize: 16, fontWeight: '700', marginTop: -1 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyIcon: { fontSize: 40, color: t.textPlaceholder },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: t.textSecondary },
  ctaBtn: {
    marginTop: 8, backgroundColor: t.accent, paddingHorizontal: 20,
    paddingVertical: 10, borderRadius: t.radiusChip,
  },
  ctaText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
