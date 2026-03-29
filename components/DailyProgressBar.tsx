import { StyleSheet, Text, View } from 'react-native';
import { t } from '../lib/theme';

const DAILY_GOAL_MS = 8 * 3600 * 1000; // 8h

function fmtH(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function DailyProgressBar({ totalMs }: { totalMs: number }) {
  const pct = Math.min(100, (totalMs / DAILY_GOAL_MS) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Heute</Text>
        <Text style={styles.value}>{fmtH(totalMs)} <Text style={styles.goal}>/ 8h</Text></Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: t.card, borderBottomWidth: 1, borderBottomColor: t.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 12, fontWeight: '600', color: t.textSecondary, letterSpacing: 0.5, textTransform: 'uppercase' },
  value: { fontSize: 12, fontWeight: '700', color: t.text },
  goal: { fontWeight: '400', color: t.textTertiary },
  track: { height: 4, backgroundColor: t.borderLight, borderRadius: 2 },
  fill: { height: 4, backgroundColor: t.accent, borderRadius: 2 },
});
