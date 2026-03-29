import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { Project } from '../contexts/ProjectsContext';
import { t } from '../lib/theme';

const COLORS = [
  '#6366F1', '#EF4444', '#22C55E', '#EAB308', '#A855F7',
  '#EC4899', '#06B6D4', '#F97316', '#10B981', '#3B82F6',
];

type Props = {
  visible: boolean;
  project: Project | null;
  onSave: (name: string, color: string) => void;
  onClose: () => void;
};

export function ProjectFormModal({ visible, project, onSave, onClose }: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (visible) { setName(project?.name ?? ''); setColor(project?.color ?? COLORS[0]); }
  }, [visible, project]);

  function handleSave() {
    const trimmed = name.trim();
    if (trimmed) onSave(trimmed, color);
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={[styles.card, t.cardShadow]} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>{project ? 'Projekt bearbeiten' : 'Neues Projekt'}</Text>

          <TextInput
            style={styles.input}
            placeholder="Projektname"
            placeholderTextColor={t.textPlaceholder}
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Text style={styles.label}>FARBE</Text>
          <View style={styles.colorRow}>
            {COLORS.map((c) => (
              <Pressable
                key={c}
                style={[styles.swatch, { backgroundColor: c }, c === color && styles.swatchActive]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>

          {/* Preview */}
          <View style={[styles.preview, { borderLeftColor: color }]}>
            <View style={[styles.previewDot, { backgroundColor: color }]} />
            <Text style={styles.previewText}>{name || 'Vorschau'}</Text>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Abbrechen</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, !name.trim() && { opacity: 0.4 }]}
              onPress={handleSave}
              disabled={!name.trim()}
            >
              <Text style={styles.saveText}>Speichern</Text>
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: 24 },
  card: { backgroundColor: t.card, borderRadius: t.radiusCard, borderWidth: 1, borderColor: t.border, padding: 24, width: '100%', maxWidth: 400 },
  title: { fontSize: 17, fontWeight: '600', color: t.text, marginBottom: 18, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: t.border, borderRadius: t.radiusInput, padding: 12, fontSize: 14, color: t.text, marginBottom: 18 },
  label: { fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 1.5, marginBottom: 10 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18, justifyContent: 'center' },
  swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: t.text },
  preview: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10,
    borderRadius: t.radiusInput, backgroundColor: t.bg, borderLeftWidth: 4, marginBottom: 18,
  },
  previewDot: { width: 8, height: 8, borderRadius: 4 },
  previewText: { fontSize: 13, color: t.textSecondary },
  actions: { flexDirection: 'row', gap: 10 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: t.radiusChip, borderWidth: 1, borderColor: t.border, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '500', color: t.textSecondary },
  saveBtn: { flex: 1, padding: 12, borderRadius: t.radiusChip, backgroundColor: t.accent, alignItems: 'center' },
  saveText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
