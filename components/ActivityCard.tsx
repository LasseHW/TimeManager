import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { t } from '../lib/theme';
import type { Task } from '../hooks/useTasks';
import type { TodayEntry } from '../hooks/useTodayEntries';
import type { TimerStatus } from '../hooks/useTimer';

// ── Helpers ──────────────────────────────────────────

function fmtMs(ms: number) {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function fmtEntryDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Heute';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Gestern';
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function entryDurationMs(e: TodayEntry) {
  if (!e.end_time) return 0;
  return (
    new Date(e.end_time).getTime() -
    new Date(e.start_time).getTime() -
    (e.paused_duration ?? 0) * 1000
  );
}

// ── Types ────────────────────────────────────────────

type Props = {
  task: Task;
  projectColor: string;
  entries: TodayEntry[];
  isRunning: boolean;
  timerStatus: TimerStatus;
  elapsed: number;
  totalMs: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRenameTask: (name: string) => void;
  onDeleteTask: () => void;
  onUpdateEntryDesc: (entryId: string, desc: string) => void;
  onDeleteEntry: (entryId: string) => void;
  onAddManualEntry: () => void;
};

// ── Component ────────────────────────────────────────

export function ActivityCard({
  task,
  projectColor,
  entries,
  isRunning,
  timerStatus,
  elapsed,
  totalMs,
  onStart,
  onPause,
  onResume,
  onStop,
  onRenameTask,
  onDeleteTask,
  onUpdateEntryDesc,
  onDeleteEntry,
  onAddManualEntry,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(task.name);
  const [hoveredEntry, setHoveredEntry] = useState<string | null>(null);

  // Pulsing dot animation
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (isRunning && timerStatus === 'running') {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      );
      anim.start();
      return () => anim.stop();
    }
    pulse.setValue(1);
  }, [isRunning, timerStatus, pulse]);

  const displayTime = isRunning ? totalMs + elapsed : totalMs;

  function handleSubmitName() {
    setEditingName(false);
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== task.name) onRenameTask(trimmed);
    else setNameVal(task.name);
  }

  function handleSubmitDesc(entryId: string) {
    setEditingEntry(null);
    onUpdateEntryDesc(entryId, editDesc);
  }

  const webHover = (entryId: string) =>
    Platform.OS === 'web'
      ? {
          onMouseEnter: () => setHoveredEntry(entryId),
          onMouseLeave: () => setHoveredEntry(null),
        }
      : {};

  return (
    <View
      style={[
        styles.card,
        t.cardShadow,
        isRunning && styles.cardActive,
      ]}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        {/* Play / Pause+Stop controls */}
        <View style={styles.controls}>
          {!isRunning ? (
            <Pressable style={styles.playBtn} onPress={onStart}>
              <Text style={styles.playIcon}>&#9654;</Text>
            </Pressable>
          ) : (
            <>
              {timerStatus === 'running' ? (
                <Pressable
                  style={[styles.ctrlBtn, { backgroundColor: t.yellowBg }]}
                  onPress={onPause}
                >
                  <Text style={[styles.ctrlIcon, { color: t.yellow }]}>&#9208;</Text>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.ctrlBtn, { backgroundColor: t.greenBg }]}
                  onPress={onResume}
                >
                  <Text style={[styles.ctrlIcon, { color: t.green }]}>&#9654;</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.ctrlBtn, { backgroundColor: t.redBg }]}
                onPress={onStop}
              >
                <Text style={[styles.ctrlIcon, { color: t.red }]}>&#9209;</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Running indicator */}
        {isRunning && (
          <Animated.View
            style={[styles.liveDot, { backgroundColor: t.green, opacity: pulse }]}
          />
        )}

        {/* Task name */}
        <View style={styles.nameArea}>
          {editingName ? (
            <TextInput
              style={styles.nameInput}
              value={nameVal}
              onChangeText={setNameVal}
              onBlur={handleSubmitName}
              onSubmitEditing={handleSubmitName}
              autoFocus
            />
          ) : (
            <Pressable onPress={() => setEditingName(true)} style={{ flex: 1 }}>
              <Text style={styles.nameText} numberOfLines={1}>
                {task.name || 'Aufgabe benennen...'}
              </Text>
            </Pressable>
          )}
        </View>

        {/* Time display */}
        <Text style={styles.timeText}>{fmtMs(displayTime)}</Text>

        {/* Add manual entry */}
        <Pressable style={styles.addBtn} onPress={onAddManualEntry}>
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>

        {/* Expand toggle */}
        <Pressable style={styles.expandBtn} onPress={() => setExpanded(!expanded)}>
          <Text style={styles.expandIcon}>{expanded ? '\u25BE' : '\u25B8'}</Text>
        </Pressable>
      </View>

      {/* ── Entries list (expanded) ── */}
      {expanded && (
        <View style={styles.entriesSection}>
          {entries.length === 0 && (
            <Text style={styles.noEntries}>Keine Eintr\u00E4ge</Text>
          )}
          {entries.map((e, i) => {
            const isHovered = hoveredEntry === e.id;
            const isEditing = editingEntry === e.id;
            return (
              <View
                key={e.id}
                style={[styles.entryRow, i % 2 === 1 && styles.entryRowAlt]}
                {...webHover(e.id)}
              >
                {/* Date + Time */}
                <Text style={styles.entryTime}>
                  {fmtEntryDate(e.start_time)} {fmtTime(e.start_time)}
                </Text>

                {/* Description (inline editable) */}
                {isEditing ? (
                  <TextInput
                    style={styles.entryDescInput}
                    value={editDesc}
                    onChangeText={setEditDesc}
                    onBlur={() => handleSubmitDesc(e.id)}
                    onSubmitEditing={() => handleSubmitDesc(e.id)}
                    autoFocus
                  />
                ) : (
                  <Pressable
                    style={styles.entryDescArea}
                    onPress={() => {
                      setEditingEntry(e.id);
                      setEditDesc(e.description ?? '');
                    }}
                  >
                    <Text style={styles.entryDesc} numberOfLines={1}>
                      {e.description || 'Beschreibung hinzuf\u00FCgen...'}
                    </Text>
                  </Pressable>
                )}

                {/* Duration */}
                <Text style={styles.entryDuration}>{fmtMs(entryDurationMs(e))}</Text>

                {/* Delete (hover) */}
                {isHovered && (
                  <Pressable style={styles.entryDeleteBtn} onPress={() => onDeleteEntry(e.id)}>
                    <Text style={styles.entryDeleteIcon}>\u00D7</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ── Styles ───────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: t.card,
    borderRadius: t.radiusCard,
    borderWidth: 1,
    borderColor: t.border,
    overflow: 'hidden',
  },
  cardActive: {
    borderColor: t.activeBorder,
    borderWidth: 1.5,
    backgroundColor: t.activeBg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
    backgroundColor: t.bg,
  },
  controls: { flexDirection: 'row', gap: 4 },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: t.border,
    backgroundColor: t.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: { fontSize: 10, color: t.textSecondary, marginLeft: 2 },
  ctrlBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctrlIcon: { fontSize: 10 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  nameArea: { flex: 1 },
  nameText: { fontSize: 14, fontWeight: '600', color: t.text },
  nameInput: {
    fontSize: 14,
    fontWeight: '600',
    color: t.text,
    padding: 2,
    borderBottomWidth: 1,
    borderBottomColor: t.accent,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    color: t.text,
    fontVariant: ['tabular-nums'],
    minWidth: 60,
    textAlign: 'right',
    fontFamily:
      Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined,
  },
  addBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: t.border,
    backgroundColor: t.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: { fontSize: 14, color: t.textSecondary, fontWeight: '500', marginTop: -1 },
  expandBtn: { padding: 4 },
  expandIcon: { fontSize: 12, color: t.textTertiary },

  // Entries
  entriesSection: {
    borderTopWidth: 1,
    borderTopColor: t.borderLight,
  },
  noEntries: {
    fontSize: 12,
    color: t.textPlaceholder,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    gap: 10,
  },
  entryRowAlt: { backgroundColor: t.rowAlt },
  entryTime: {
    fontSize: 12,
    color: t.textTertiary,
    fontVariant: ['tabular-nums'],
    width: 100,
    fontFamily:
      Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined,
  },
  entryDescArea: { flex: 1 },
  entryDesc: { fontSize: 13, color: t.text },
  entryDescInput: {
    flex: 1,
    fontSize: 13,
    color: t.text,
    padding: 2,
    borderBottomWidth: 1,
    borderBottomColor: t.accent,
  },
  entryDuration: {
    fontSize: 12,
    fontWeight: '600',
    color: t.textSecondary,
    fontVariant: ['tabular-nums'],
    minWidth: 50,
    textAlign: 'right',
    fontFamily:
      Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined,
  },
  entryDeleteBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: t.redBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  entryDeleteIcon: { fontSize: 13, color: t.red, fontWeight: '700' },
});
