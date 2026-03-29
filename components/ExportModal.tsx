import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { t } from '../lib/theme';
import type { Project } from '../contexts/ProjectsContext';
import type { Task } from '../hooks/useTasks';

type Props = {
  visible: boolean;
  project: Project | null;
  allProjects: Project[];
  tasks: Task[];
  onClose: () => void;
};

type Range = 'week' | 'month' | 'all';

function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function rangeStart(range: Range): string | null {
  if (range === 'all') return null;
  const d = new Date();
  if (range === 'week') d.setDate(d.getDate() - d.getDay() + (d.getDay() === 0 ? -6 : 1));
  else d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ExportModal({ visible, project, allProjects, tasks, onClose }: Props) {
  const { session } = useAuth();
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const [range, setRange] = useState<Range>('all');
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!session || exporting) return;
    setExporting(true);

    const projectsToExport = scope === 'current' && project ? [project] : allProjects;
    const wb = XLSX.utils.book_new();

    for (const p of projectsToExport) {
      let query = supabase
        .from('time_entries')
        .select('task_id, description, start_time, end_time, paused_duration')
        .eq('project_id', p.id)
        .eq('user_id', session.user.id)
        .not('end_time', 'is', null)
        .order('start_time', { ascending: true });

      const from = rangeStart(range);
      if (from) query = query.gte('start_time', from);

      const { data: entries } = await query;
      if (!entries || entries.length === 0) continue;

      const header = ['Datum', 'Aufgabe', 'Beschreibung', 'Start', 'Ende', 'Dauer (h)', 'Dauer (min)'];
      const rows: (string | number)[][] = [header];

      for (const e of entries) {
        const task = tasks.find((tk) => tk.id === e.task_id);
        const ms = new Date(e.end_time).getTime() - new Date(e.start_time).getTime() - (e.paused_duration ?? 0) * 1000;
        const totalMin = Math.round(ms / 60000);
        const hours = Math.round((ms / 3600000) * 100) / 100;

        rows.push([
          fmtDate(e.start_time),
          task?.name ?? '',
          e.description ?? '',
          fmtTime(e.start_time),
          fmtTime(e.end_time),
          hours,
          totalMin,
        ]);
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);
      // Column widths
      ws['!cols'] = [
        { wch: 12 }, { wch: 24 }, { wch: 30 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 12 },
      ];
      const sheetName = p.name.slice(0, 31).replace(/[\\/*?[\]]/g, '_');
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    if (wb.SheetNames.length === 0) {
      setExporting(false);
      return;
    }

    const projectLabel = scope === 'current' && project ? project.name.replace(/\s+/g, '_') : 'Alle';
    const filename = `TimeManager_${projectLabel}_${todayStr()}.xlsx`;

    if (Platform.OS === 'web') {
      const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      try {
        const FileSystem = require('expo-file-system');
        const Sharing = require('expo-sharing');
        const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        const path = FileSystem.documentDirectory + filename;
        await FileSystem.writeAsStringAsync(path, b64, { encoding: FileSystem.EncodingType.Base64 });
        await Sharing.shareAsync(path);
      } catch (err) {
        console.error('Export error:', err);
      }
    }

    setExporting(false);
    onClose();
  }

  const scopeOptions: { key: 'current' | 'all'; label: string }[] = [
    { key: 'current', label: project ? project.name : 'Aktuelles Projekt' },
    { key: 'all', label: 'Alle Projekte' },
  ];

  const rangeOptions: { key: Range; label: string }[] = [
    { key: 'week', label: 'Diese Woche' },
    { key: 'month', label: 'Dieser Monat' },
    { key: 'all', label: 'Alles' },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modal}>
          <Text style={styles.title}>Excel Export</Text>

          <Text style={styles.label}>UMFANG</Text>
          <View style={styles.optionRow}>
            {scopeOptions.map((o) => (
              <Pressable
                key={o.key}
                style={[styles.optionBtn, scope === o.key && styles.optionBtnActive]}
                onPress={() => setScope(o.key)}
              >
                <Text
                  style={[styles.optionText, scope === o.key && styles.optionTextActive]}
                  numberOfLines={1}
                >
                  {o.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>ZEITRAUM</Text>
          <View style={styles.optionRow}>
            {rangeOptions.map((o) => (
              <Pressable
                key={o.key}
                style={[styles.optionBtn, range === o.key && styles.optionBtnActive]}
                onPress={() => setRange(o.key)}
              >
                <Text style={[styles.optionText, range === o.key && styles.optionTextActive]}>
                  {o.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Abbrechen</Text>
            </Pressable>
            <Pressable
              style={[styles.exportBtn, exporting && { opacity: 0.5 }]}
              onPress={handleExport}
              disabled={exporting}
            >
              <Text style={styles.exportText}>
                {exporting ? 'Exportiere...' : 'Als Excel exportieren'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.modalOverlay, padding: 24 },
  modal: { backgroundColor: t.panelBg, borderRadius: t.radiusModal, borderWidth: 1, borderColor: t.border, padding: 24, width: '100%', maxWidth: 420 },
  title: { fontSize: 16, fontWeight: '600', color: t.text, marginBottom: 18 },
  label: { fontSize: 10, fontWeight: '700', color: t.textTertiary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, marginTop: 12 },
  optionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  optionBtn: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: t.radiusInput, borderWidth: 1, borderColor: t.border, backgroundColor: t.bg },
  optionBtnActive: { borderColor: t.accent, backgroundColor: t.activeRow },
  optionText: { fontSize: 13, color: t.textSecondary },
  optionTextActive: { color: t.accent, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 24 },
  cancelBtn: { flex: 1, padding: 11, borderRadius: t.radiusInput, borderWidth: 1, borderColor: t.border, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '500', color: t.textSecondary },
  exportBtn: { flex: 1, padding: 11, borderRadius: t.radiusInput, backgroundColor: t.accent, alignItems: 'center' },
  exportText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
