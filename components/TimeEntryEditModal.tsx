import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/theme';

type EntryData = {
  id?: string;
  task_id: string;
  project_id: string;
  start_time?: string;
  end_time?: string;
  description?: string | null;
} | null;

type Props = {
  entry: EntryData;
  onClose: () => void;
  onSaved: () => void;
};

function Stepper({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
}) {
  return (
    <View style={stepperStyles.container}>
      <Text style={stepperStyles.label}>{label}</Text>
      <View style={stepperStyles.row}>
        <Pressable
          style={stepperStyles.btn}
          onPress={() => onChange(Math.max(min, value - 1))}
        >
          <Text style={stepperStyles.btnText}>-</Text>
        </Pressable>
        <Text style={stepperStyles.value}>{String(value).padStart(2, '0')}</Text>
        <Pressable
          style={stepperStyles.btn}
          onPress={() => onChange(Math.min(max, value + 1))}
        >
          <Text style={stepperStyles.btnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  container: { alignItems: 'center', gap: 4 },
  label: { fontSize: 10, color: t.textTertiary, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: {
    width: 28, height: 28, borderRadius: 6,
    backgroundColor: t.borderLight, justifyContent: 'center', alignItems: 'center',
  },
  btnText: { fontSize: 16, color: t.text, fontWeight: '600' },
  value: { fontSize: 18, fontWeight: '700', color: t.text, minWidth: 30, textAlign: 'center', fontVariant: ['tabular-nums'] },
});

export function TimeEntryEditModal({ entry, onClose, onSaved }: Props) {
  const { session } = useAuth();
  const isEdit = !!entry?.id;

  const [date, setDate] = useState('');
  const [startH, setStartH] = useState(0);
  const [startM, setStartM] = useState(0);
  const [durH, setDurH] = useState(0);
  const [durM, setDurM] = useState(30);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!entry) return;
    if (entry.start_time) {
      const s = new Date(entry.start_time);
      setDate(s.toISOString().slice(0, 10));
      setStartH(s.getHours());
      setStartM(s.getMinutes());
      if (entry.end_time) {
        const diff = new Date(entry.end_time).getTime() - s.getTime();
        setDurH(Math.floor(diff / 3600000));
        setDurM(Math.floor((diff % 3600000) / 60000));
      }
    } else {
      const now = new Date();
      setDate(now.toISOString().slice(0, 10));
      setStartH(now.getHours());
      setStartM(now.getMinutes());
      setDurH(0);
      setDurM(30);
    }
    setDescription(entry.description ?? '');
  }, [entry]);

  // Compute end time
  const startMs = new Date(`${date}T${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}:00`).getTime();
  const endMs = startMs + durH * 3600000 + durM * 60000;
  const endDate = new Date(endMs);
  const endStr = isNaN(endDate.getTime())
    ? '--:--'
    : `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;

  async function handleSave() {
    if (!session || !entry || saving) return;
    if (isNaN(startMs) || durH === 0 && durM === 0) return;

    setSaving(true);
    const startIso = new Date(startMs).toISOString();
    const endIso = new Date(endMs).toISOString();

    if (isEdit) {
      await supabase
        .from('time_entries')
        .update({ start_time: startIso, end_time: endIso, description: description.trim() || null })
        .eq('id', entry.id);
    } else {
      await supabase.from('time_entries').insert({
        user_id: session.user.id,
        task_id: entry.task_id,
        project_id: entry.project_id,
        start_time: startIso,
        end_time: endIso,
        paused_duration: 0,
        description: description.trim() || null,
      });
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  if (!entry) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modal}>
          <Text style={styles.title}>
            {isEdit ? 'Zeiteintrag bearbeiten' : 'Zeiteintrag hinzufügen'}
          </Text>

          {/* Date */}
          <Text style={styles.label}>DATUM</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={t.textPlaceholder}
          />

          {/* Start time */}
          <Text style={styles.label}>STARTZEIT</Text>
          <View style={styles.stepperRow}>
            <Stepper value={startH} onChange={setStartH} min={0} max={23} label="Std" />
            <Text style={styles.colon}>:</Text>
            <Stepper value={startM} onChange={setStartM} min={0} max={59} label="Min" />
          </View>

          {/* Duration */}
          <Text style={styles.label}>DAUER</Text>
          <View style={styles.stepperRow}>
            <Stepper value={durH} onChange={setDurH} min={0} max={23} label="Std" />
            <Text style={styles.colon}>:</Text>
            <Stepper value={durM} onChange={setDurM} min={0} max={59} label="Min" />
          </View>

          {/* Computed end */}
          <View style={styles.endRow}>
            <Text style={styles.endLabel}>Ende:</Text>
            <Text style={styles.endValue}>{endStr}</Text>
          </View>

          {/* Description */}
          <Text style={styles.label}>BESCHREIBUNG</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Optional..."
            placeholderTextColor={t.textPlaceholder}
            multiline
          />

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Abbrechen</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, saving && { opacity: 0.5 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveText}>
                {isEdit ? 'Änderungen speichern' : 'Speichern'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: t.modalOverlay,
    padding: 24,
  },
  modal: {
    backgroundColor: t.panelBg,
    borderRadius: t.radiusModal,
    borderWidth: 1,
    borderColor: t.border,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: { fontSize: 16, fontWeight: '600', color: t.text, marginBottom: 20 },
  label: {
    fontSize: 10, fontWeight: '700', color: t.textTertiary,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, marginTop: 14,
  },
  input: {
    borderWidth: 1, borderColor: t.border, borderRadius: t.radiusInput,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: t.text,
    backgroundColor: t.bg,
  },
  multiline: { minHeight: 60, textAlignVertical: 'top' },
  stepperRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingVertical: 4 },
  colon: { fontSize: 20, color: t.textTertiary, fontWeight: '700', marginBottom: 4 },
  endRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 10, paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: t.bg, borderRadius: t.radiusInput,
  },
  endLabel: { fontSize: 12, color: t.textTertiary },
  endValue: { fontSize: 14, fontWeight: '700', color: t.accent, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: {
    flex: 1, padding: 11, borderRadius: t.radiusInput,
    borderWidth: 1, borderColor: t.border, alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '500', color: t.textSecondary },
  saveBtn: {
    flex: 1, padding: 11, borderRadius: t.radiusInput,
    backgroundColor: t.accent, alignItems: 'center',
  },
  saveText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
