import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/theme';

type Props = {
  visible: boolean;
  taskId: string;
  projectId: string;
  onClose: () => void;
  onSaved: () => void;
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function ManualEntryModal({ visible, taskId, projectId, onClose, onSaved }: Props) {
  const { session } = useAuth();
  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState(nowTimeStr);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!session || saving) return;
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return;

    setSaving(true);
    await supabase.from('time_entries').insert({
      user_id: session.user.id,
      project_id: projectId,
      task_id: taskId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      paused_duration: 0,
      description: description.trim() || null,
    });
    setSaving(false);
    setDescription('');
    onSaved();
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.card, t.cardShadow]}>
          <Text style={styles.title}>Manueller Eintrag</Text>

          <Text style={styles.label}>DATUM</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={t.textPlaceholder}
          />

          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.label}>VON</Text>
              <TextInput
                style={styles.input}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="HH:MM"
                placeholderTextColor={t.textPlaceholder}
              />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.label}>BIS</Text>
              <TextInput
                style={styles.input}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="HH:MM"
                placeholderTextColor={t.textPlaceholder}
              />
            </View>
          </View>

          <Text style={styles.label}>BESCHREIBUNG</Text>
          <TextInput
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional..."
            placeholderTextColor={t.textPlaceholder}
          />

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Abbrechen</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, saving && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveText}>Speichern</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    padding: 24,
  },
  card: {
    backgroundColor: t.card,
    borderRadius: t.radiusCard,
    borderWidth: 1,
    borderColor: t.border,
    padding: 24,
    width: '100%',
    maxWidth: 380,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: t.text,
    marginBottom: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: t.textTertiary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: t.radiusInput,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: t.text,
    marginBottom: 14,
  },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    padding: 11,
    borderRadius: t.radiusInput,
    borderWidth: 1,
    borderColor: t.border,
    alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '500', color: t.textSecondary },
  saveBtn: {
    flex: 1,
    padding: 11,
    borderRadius: t.radiusInput,
    backgroundColor: t.accent,
    alignItems: 'center',
  },
  saveText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
