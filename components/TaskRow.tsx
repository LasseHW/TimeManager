import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View, Platform } from 'react-native';
import { t } from '../lib/theme';
import type { Task } from '../hooks/useTasks';
import type { TimerStatus } from '../hooks/useTimer';

function fmtMs(ms: number) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

type Props = {
  task: Task;
  projectColor: string;
  isRunning: boolean;
  timerStatus: TimerStatus;
  elapsed: number;
  totalMs: number;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
};

export function TaskRow({
  task, projectColor, isRunning, timerStatus, elapsed, totalMs,
  onStart, onPause, onResume, onStop, onRename, onDelete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(task.name);
  const [hovered, setHovered] = useState(false);
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
    } else {
      pulse.setValue(1);
    }
  }, [isRunning, timerStatus, pulse]);

  function handleSubmitName() {
    setEditing(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== task.name) onRename(trimmed);
    else setName(task.name);
  }

  const displayTime = isRunning ? totalMs + elapsed : totalMs;

  const webHover = Platform.OS === 'web' ? {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  } : {};

  return (
    <View
      style={[
        styles.row,
        isRunning && { backgroundColor: projectColor + '14' },
      ]}
      {...webHover}
    >
      {/* Play / Pause+Stop controls */}
      <View style={styles.controls}>
        {!isRunning ? (
          <Pressable style={styles.playBtn} onPress={onStart}>
            <Text style={styles.playIcon}>{'▶'}</Text>
          </Pressable>
        ) : (
          <>
            {timerStatus === 'running' ? (
              <Pressable style={[styles.ctrlBtn, { backgroundColor: t.yellowBg }]} onPress={onPause}>
                <Text style={[styles.ctrlIcon, { color: t.yellow }]}>⏸</Text>
              </Pressable>
            ) : (
              <Pressable style={[styles.ctrlBtn, { backgroundColor: t.greenBg }]} onPress={onResume}>
                <Text style={[styles.ctrlIcon, { color: t.green }]}>▶</Text>
              </Pressable>
            )}
            <Pressable style={[styles.ctrlBtn, { backgroundColor: t.redBg }]} onPress={onStop}>
              <Text style={[styles.ctrlIcon, { color: t.red }]}>⏹</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Pulsing dot + Name */}
      <View style={styles.nameArea}>
        {isRunning && (
          <Animated.View style={[styles.liveDot, { backgroundColor: t.green, opacity: pulse }]} />
        )}
        {editing ? (
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            onBlur={handleSubmitName}
            onSubmitEditing={handleSubmitName}
            autoFocus
          />
        ) : (
          <Pressable onPress={() => setEditing(true)} style={{ flex: 1 }}>
            <Text style={[styles.nameText, !task.name && styles.namePlaceholder]} numberOfLines={1}>
              {task.name || 'Aufgabe beschreiben...'}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Time */}
      <Text style={styles.time}>{displayTime > 0 ? fmtMs(displayTime) : '–'}</Text>

      {/* Delete (hover only on web) */}
      {(hovered || Platform.OS !== 'web') && (
        <Pressable style={styles.deleteBtn} onPress={onDelete}>
          <Text style={styles.deleteIcon}>×</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
    minHeight: 40,
  },
  controls: { flexDirection: 'row', gap: 4 },
  playBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: t.accentLight, justifyContent: 'center', alignItems: 'center',
  },
  playIcon: { fontSize: 10, color: t.accent, marginLeft: 2 },
  ctrlBtn: {
    width: 26, height: 26, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center',
  },
  ctrlIcon: { fontSize: 10 },
  nameArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  nameText: { fontSize: 13, color: t.text },
  namePlaceholder: { color: t.textPlaceholder, fontStyle: 'italic' },
  nameInput: {
    flex: 1, fontSize: 13, color: t.text, padding: 4,
    borderBottomWidth: 1, borderBottomColor: t.accent,
  },
  time: {
    fontSize: 12, fontWeight: '600', color: t.textSecondary,
    fontVariant: ['tabular-nums'], minWidth: 50, textAlign: 'right',
    fontFamily: Platform.OS === 'web' ? 'ui-monospace, monospace' : undefined,
  },
  deleteBtn: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: t.redBg, justifyContent: 'center', alignItems: 'center',
  },
  deleteIcon: { fontSize: 14, color: t.red, fontWeight: '700', marginTop: -1 },
});
