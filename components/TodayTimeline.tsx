import { Platform, StyleSheet, Text, View } from 'react-native';
import { t } from '../lib/theme';
import type { TodayEntry } from '../hooks/useTodayEntries';

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtDuration(start: string, end: string, paused: number) {
  const ms = new Date(end).getTime() - new Date(start).getTime() - paused * 1000;
  const s = Math.floor(Math.max(0, ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

// Group entries by project
function groupByProject(entries: TodayEntry[]) {
  const map = new Map<string, { project: TodayEntry['project']; items: TodayEntry[] }>();
  const noProject: TodayEntry[] = [];
  for (const e of entries) {
    if (!e.project) { noProject.push(e); continue; }
    const key = e.project.id;
    if (!map.has(key)) map.set(key, { project: e.project, items: [] });
    map.get(key)!.items.push(e);
  }
  const groups = [...map.values()];
  if (noProject.length) groups.push({ project: null, items: noProject });
  return groups;
}

export function TodayTimeline({ entries }: { entries: TodayEntry[] }) {
  if (entries.length === 0) return null;
  const groups = groupByProject(entries);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>TIMELINE</Text>
      {groups.map((group, gi) => (
        <View key={group.project?.id ?? 'none'} style={gi > 0 ? styles.groupGap : undefined}>
          {/* Project chip */}
          <View style={styles.chipRow}>
            {group.project && (
              <View style={[styles.chip, { backgroundColor: group.project.color + '18' }]}>
                <View style={[styles.chipDot, { backgroundColor: group.project.color }]} />
                <Text style={[styles.chipLabel, { color: group.project.color }]}>{group.project.name}</Text>
              </View>
            )}
            {!group.project && (
              <Text style={styles.noProject}>Kein Projekt</Text>
            )}
          </View>

          {group.items.map((e) => (
            <View key={e.id} style={styles.entryRow}>
              <Text style={styles.entryTime}>
                {fmtTime(e.start_time)} – {e.end_time ? fmtTime(e.end_time) : '...'}
              </Text>
              <Text style={styles.entryDesc} numberOfLines={1}>
                {e.description || 'Ohne Beschreibung'}
              </Text>
              <Text style={styles.entryDuration}>
                {e.end_time ? fmtDuration(e.start_time, e.end_time, e.paused_duration ?? 0) : '–'}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  heading: {
    fontSize: 11, fontWeight: '700', color: t.textTertiary,
    letterSpacing: 1.5, marginBottom: 12,
  },
  groupGap: { marginTop: 14 },
  chipRow: { marginBottom: 6 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: t.radiusChip,
  },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipLabel: { fontSize: 11, fontWeight: '600' },
  noProject: { fontSize: 11, color: t.textTertiary, fontWeight: '500' },
  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 7, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: t.borderLight,
  },
  entryTime: {
    fontSize: 11, color: t.textTertiary, fontVariant: ['tabular-nums'], width: 90,
    fontFamily: Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined,
  },
  entryDesc: { flex: 1, fontSize: 13, color: t.text },
  entryDuration: {
    fontSize: 12, fontWeight: '600', color: t.textSecondary, fontVariant: ['tabular-nums'],
    fontFamily: Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined,
  },
});
