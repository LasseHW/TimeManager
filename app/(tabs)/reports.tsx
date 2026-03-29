import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useWeeklyReport } from '../../hooks/useWeeklyReport';
import { useProjects } from '../../contexts/ProjectsContext';
import { ProjectPicker } from '../../components/ProjectPicker';
import { t } from '../../lib/theme';

function fmtH(h: number) {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

// ── Pure-View bar chart ──────────────────────────────

function SimpleBarChart({ labels, values }: { labels: string[]; values: number[] }) {
  const max = Math.max(...values, 0.1); // avoid division by zero

  return (
    <View style={chartStyles.container}>
      <View style={chartStyles.bars}>
        {values.map((v, i) => (
          <View key={labels[i]} style={chartStyles.barCol}>
            {v > 0 && (
              <Text style={chartStyles.barValue}>{v.toFixed(1)}h</Text>
            )}
            <View style={chartStyles.barTrack}>
              <View
                style={[
                  chartStyles.barFill,
                  { height: `${Math.max((v / max) * 100, v > 0 ? 4 : 0)}%` },
                ]}
              />
            </View>
            <Text style={chartStyles.barLabel}>{labels[i]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const CHART_HEIGHT = 160;

const chartStyles = StyleSheet.create({
  container: { width: '100%', paddingHorizontal: 4 },
  bars: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: CHART_HEIGHT + 24 },
  barCol: { alignItems: 'center', flex: 1, height: CHART_HEIGHT + 24 },
  barValue: { fontSize: 10, color: t.textSecondary, fontWeight: '600', marginBottom: 4 },
  barTrack: {
    flex: 1, width: '50%', maxWidth: 32, justifyContent: 'flex-end',
    backgroundColor: t.borderLight, borderRadius: 4, overflow: 'hidden',
  },
  barFill: { backgroundColor: t.accent, borderRadius: 4, minHeight: 0 },
  barLabel: { fontSize: 12, color: t.textSecondary, marginTop: 6, fontWeight: '500' },
});

// ── Main screen ──────────────────────────────────────

export default function ReportsScreen() {
  const r = useWeeklyReport();
  const { projects } = useProjects();
  const values = r.data.map((d) => Math.round(d.hours * 100) / 100);
  const hasData = r.data.some((d) => d.hours > 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Week nav */}
      <View style={styles.weekNav}>
        <Pressable style={styles.navBtn} onPress={() => r.setOffset(r.offset - 1)}>
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <View style={styles.weekCenter}>
          <Text style={styles.weekLabel}>{r.weekLabel}</Text>
          {r.offset !== 0 && (
            <Pressable onPress={() => r.setOffset(0)}>
              <Text style={styles.todayLink}>Aktuelle Woche</Text>
            </Pressable>
          )}
        </View>
        <Pressable
          style={[styles.navBtn, r.offset >= 0 && styles.navBtnDisabled]}
          onPress={() => { if (r.offset < 0) r.setOffset(r.offset + 1); }}
        >
          <Text style={[styles.navArrow, r.offset >= 0 && styles.navArrowDim]}>›</Text>
        </Pressable>
      </View>

      {/* Filter */}
      <View style={{ marginBottom: 14 }}>
        <ProjectPicker projects={projects} selected={r.projectId} onSelect={r.setProjectId} />
      </View>

      {/* Chart */}
      <View style={[styles.card, t.cardShadow]}>
        {r.loading ? (
          <Text style={styles.muted}>Laden...</Text>
        ) : hasData ? (
          <SimpleBarChart labels={r.dayLabels} values={values} />
        ) : (
          <Text style={styles.muted}>Keine Daten diese Woche.</Text>
        )}
      </View>

      {/* Summary */}
      <View style={[styles.summaryCard, t.cardShadow]}>
        <Text style={styles.summaryLabel}>GESAMT</Text>
        <Text style={styles.summaryValue}>{fmtH(r.totalHours)}</Text>
      </View>

      {/* Breakdown */}
      <View style={[styles.card, t.cardShadow, { padding: 16 }]}>
        <Text style={styles.breakdownTitle}>TAGESÜBERSICHT</Text>
        {r.data.map((d, i) => (
          <View key={d.date} style={styles.dayRow}>
            <Text style={styles.dayLabel}>{r.dayLabels[i]}</Text>
            <Text style={styles.dayDate}>{d.date.slice(5)}</Text>
            <View style={styles.dayTrack}>
              <View style={[styles.dayFill, {
                width: r.totalHours > 0
                  ? `${Math.min(100, (d.hours / Math.max(...r.data.map((x) => x.hours), 1)) * 100)}%`
                  : '0%',
              }]} />
            </View>
            <Text style={styles.dayHours}>{d.hours > 0 ? fmtH(d.hours) : '–'}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 16, paddingBottom: 40 },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  navBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: t.card,
    borderWidth: 1, borderColor: t.border, justifyContent: 'center', alignItems: 'center',
  },
  navBtnDisabled: { opacity: 0.3 },
  navArrow: { fontSize: 20, fontWeight: '600', color: t.text },
  navArrowDim: { color: t.textTertiary },
  weekCenter: { alignItems: 'center' },
  weekLabel: { fontSize: 15, fontWeight: '600', color: t.text },
  todayLink: { fontSize: 12, color: t.accent, marginTop: 2 },
  card: {
    backgroundColor: t.card, borderRadius: t.radiusCard, borderWidth: 1,
    borderColor: t.border, padding: 16, marginBottom: 10, alignItems: 'center',
    minHeight: 100, justifyContent: 'center',
  },
  muted: { fontSize: 13, color: t.textTertiary },
  summaryCard: {
    backgroundColor: t.accentLight, borderRadius: t.radiusCard, borderWidth: 1,
    borderColor: t.accentBorder, padding: 18, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: t.accent, letterSpacing: 1.5 },
  summaryValue: { fontSize: 22, fontWeight: '700', color: t.text },
  breakdownTitle: { fontSize: 11, fontWeight: '700', color: t.textTertiary, letterSpacing: 1.5, marginBottom: 12, alignSelf: 'flex-start' },
  dayRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 8, width: '100%' },
  dayLabel: { width: 24, fontSize: 13, fontWeight: '600', color: t.textSecondary },
  dayDate: { width: 42, fontSize: 12, color: t.textTertiary },
  dayTrack: { flex: 1, height: 4, backgroundColor: t.borderLight, borderRadius: 2 },
  dayFill: { height: 4, backgroundColor: t.accent, borderRadius: 2 },
  dayHours: { width: 52, textAlign: 'right', fontSize: 13, fontWeight: '600', color: t.text, fontVariant: ['tabular-nums'] },
});
