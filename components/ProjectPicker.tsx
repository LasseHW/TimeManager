import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Project } from '../contexts/ProjectsContext';
import { t } from '../lib/theme';

type Props = { projects: Project[]; selected: string | null; onSelect: (id: string | null) => void };

export function ProjectPicker({ projects, selected, onSelect }: Props) {
  const [visible, setVisible] = useState(false);
  const current = projects.find((p) => p.id === selected);

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setVisible(true)}>
        {current ? (
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: current.color }]} />
            <Text style={styles.triggerText}>{current.name}</Text>
          </View>
        ) : (
          <Text style={styles.placeholder}>Alle Projekte</Text>
        )}
      </Pressable>

      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <View style={[styles.sheet, t.cardShadow]} onStartShouldSetResponder={() => true}>
            <Text style={styles.sheetTitle}>Projekt filtern</Text>
            <Pressable
              style={[styles.option, !selected && styles.optionActive]}
              onPress={() => { onSelect(null); setVisible(false); }}
            >
              <Text style={styles.optionText}>Alle Projekte</Text>
            </Pressable>
            <FlatList
              data={projects}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.option, item.id === selected && styles.optionActive]}
                  onPress={() => { onSelect(item.id); setVisible(false); }}
                >
                  <View style={[styles.dot, { backgroundColor: item.color }]} />
                  <Text style={styles.optionText}>{item.name}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: { borderWidth: 1, borderColor: t.border, borderRadius: t.radiusInput, padding: 11, backgroundColor: t.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  triggerText: { fontSize: 13, color: t.text },
  placeholder: { fontSize: 13, color: t.textTertiary },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: 24 },
  sheet: { backgroundColor: t.card, borderRadius: t.radiusCard, borderWidth: 1, borderColor: t.border, padding: 16, width: '100%', maxWidth: 340, maxHeight: '50%' },
  sheetTitle: { fontSize: 14, fontWeight: '600', color: t.text, marginBottom: 10 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 8 },
  optionActive: { backgroundColor: t.accentLight },
  optionText: { fontSize: 13, color: t.text },
});
