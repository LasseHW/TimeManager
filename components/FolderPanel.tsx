import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { t } from '../lib/theme';
import type { Folder } from '../hooks/useFolders';

type Props = {
  folders: Folder[];
  selectedFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  folderTotals: Map<string, number>;
  totalAllMs: number;
  onAddFolder: (name: string) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  userEmail: string;
};

function fmtMs(ms: number) {
  if (ms <= 0) return '';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function FolderPanel({
  folders, selectedFolderId, onSelectFolder, folderTotals,
  totalAllMs, onAddFolder, onRenameFolder, onDeleteFolder, userEmail,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOriginal, setEditOriginal] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Double-click tracking for web
  const lastClickRef = useRef<{ id: string; time: number } | null>(null);

  function handlePress(id: string) {
    onSelectFolder(id);
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
    const folder = folders.find((f) => f.id === id);
    if (!folder) return;
    setEditingId(id);
    setEditName(folder.name);
    setEditOriginal(folder.name);
  }

  function handleAdd() {
    const trimmed = newName.trim();
    if (trimmed) onAddFolder(trimmed);
    setNewName('');
    setAdding(false);
  }

  function commitRename(id: string) {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== editOriginal) onRenameFolder(id, trimmed);
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
      <Text style={styles.header}>Ordner</Text>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <Pressable
          style={[styles.row, selectedFolderId === null && styles.rowActive]}
          onPress={() => onSelectFolder(null)}
        >
          <Text style={[styles.rowName, selectedFolderId === null && styles.rowNameActive]}>
            Alle Projekte
          </Text>
          {totalAllMs > 0 && <Text style={styles.rowTime}>{fmtMs(totalAllMs)}</Text>}
        </Pressable>

        {folders.map((f) => {
          const isActive = selectedFolderId === f.id;
          const isEditing = editingId === f.id;
          const isHovered = hoveredId === f.id;
          const total = folderTotals.get(f.id) ?? 0;

          return (
            <Pressable
              key={f.id}
              style={[styles.row, isActive && styles.rowActive]}
              onPress={() => handlePress(f.id)}
              onLongPress={() => startEditing(f.id)}
              {...webHover(f.id)}
            >
              {isEditing ? (
                <TextInput
                  style={styles.editInput}
                  value={editName}
                  onChangeText={setEditName}
                  onBlur={() => commitRename(f.id)}
                  onSubmitEditing={() => commitRename(f.id)}
                  onKeyPress={(e) => {
                    if ((e as any).nativeEvent?.key === 'Escape') cancelRename();
                  }}
                  autoFocus
                  selectTextOnFocus
                />
              ) : (
                <>
                  <Text style={[styles.rowName, isActive && styles.rowNameActive]} numberOfLines={1}>
                    {f.name}
                  </Text>
                  {total > 0 && <Text style={styles.rowTime}>{fmtMs(total)}</Text>}
                  {isHovered && (
                    <Pressable style={styles.deleteBtn} onPress={() => onDeleteFolder(f.id)}>
                      <Text style={styles.deleteIcon}>{'×'}</Text>
                    </Pressable>
                  )}
                </>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Add folder */}
      <View style={styles.addSection}>
        {adding ? (
          <TextInput
            style={styles.addInput}
            placeholder="Ordnername..."
            placeholderTextColor={t.textPlaceholder}
            value={newName}
            onChangeText={setNewName}
            onSubmitEditing={handleAdd}
            onBlur={handleAdd}
            autoFocus
          />
        ) : (
          <Pressable style={styles.addBtn} onPress={() => setAdding(true)}>
            <Text style={styles.addBtnText}>+ Ordner</Text>
          </Pressable>
        )}
      </View>

      {/* User info + logout */}
      <View style={styles.userSection}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userEmail ? userEmail[0].toUpperCase() : '?'}</Text>
          </View>
          <Text style={styles.userEmail} numberOfLines={1}>{userEmail}</Text>
        </View>
        <Pressable style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.logoutText}>Abmelden</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: 200, backgroundColor: t.panelBg, borderRightWidth: 1, borderRightColor: t.panelBorder },
  header: { fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 1, textTransform: 'uppercase', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 8 },
  list: { flex: 1 },
  listContent: { paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, paddingHorizontal: 14, gap: 6 },
  rowActive: { backgroundColor: t.activeRow },
  rowName: { flex: 1, fontSize: 13, color: t.text, fontWeight: '400' },
  rowNameActive: { color: t.accent, fontWeight: '600' },
  rowTime: { fontSize: 11, color: t.textTertiary, fontVariant: ['tabular-nums'], fontFamily: Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined },
  editInput: { flex: 1, fontSize: 13, color: t.text, padding: 4, backgroundColor: t.activeRow, borderRadius: 4, borderBottomWidth: 1, borderBottomColor: t.accent },
  deleteBtn: { width: 18, height: 18, borderRadius: 9, backgroundColor: t.redBg, justifyContent: 'center', alignItems: 'center' },
  deleteIcon: { fontSize: 12, color: t.red, fontWeight: '700' },
  addSection: { borderTopWidth: 1, borderTopColor: t.borderLight, padding: 10 },
  addBtn: { paddingVertical: 4 },
  addBtnText: { fontSize: 12, color: t.accent, fontWeight: '600' },
  addInput: { fontSize: 12, color: t.text, padding: 6, backgroundColor: t.bg, borderRadius: t.radiusInput },
  userSection: { borderTopWidth: 1, borderTopColor: t.borderLight, padding: 10, gap: 8 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 22, height: 22, borderRadius: 11, backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  userEmail: { flex: 1, fontSize: 10, color: t.textTertiary },
  logoutBtn: { paddingVertical: 4 },
  logoutText: { fontSize: 11, color: t.red, fontWeight: '500' },
});
