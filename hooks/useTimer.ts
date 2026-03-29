import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type TimerStatus = 'idle' | 'running' | 'paused';

type RunningInfo = {
  entryId: string;
  projectId: string | null;
  taskId: string | null;
  description: string | null;
};

export function useTimer() {
  const { session } = useAuth();
  const [status, setStatus] = useState<TimerStatus>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState<RunningInfo | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);

  const clearTick = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const startTick = useCallback(() => {
    clearTick();
    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current - pausedDurationRef.current);
    }, 100);
  }, [clearTick]);

  // Restore running entry on mount
  useEffect(() => {
    if (!session) return;
    (async () => {
      const { data } = await supabase
        .from('time_entries')
        .select('id, start_time, paused_duration, project_id, task_id, description')
        .eq('user_id', session.user.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        const s = new Date(data.start_time).getTime();
        const p = (data.paused_duration ?? 0) * 1000;
        startTimeRef.current = s;
        pausedDurationRef.current = p;
        setElapsed(Date.now() - s - p);
        setRunning({
          entryId: data.id,
          projectId: data.project_id,
          taskId: data.task_id,
          description: data.description,
        });
        setStatus('running');
      }
    })();
  }, [session]);

  useEffect(() => {
    if (status === 'running') startTick(); else clearTick();
    return clearTick;
  }, [status, startTick, clearTick]);

  const start = useCallback(
    async (opts: { projectId?: string; taskId?: string; description?: string } = {}) => {
      if (!session) return;

      // Auto-stop any running timer before starting a new one
      if (running) {
        if (status === 'paused') {
          pausedDurationRef.current += Date.now() - pausedAtRef.current;
        }
        clearTick();
        const stopNow = new Date().toISOString();
        await supabase
          .from('time_entries')
          .update({ end_time: stopNow, paused_duration: Math.round(pausedDurationRef.current / 1000) })
          .eq('id', running.entryId);
      }

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: session.user.id,
          start_time: now,
          paused_duration: 0,
          project_id: opts.projectId ?? null,
          task_id: opts.taskId ?? null,
          description: opts.description ?? null,
        })
        .select('id')
        .single<{ id: string }>();

      if (error || !data) return;
      startTimeRef.current = Date.now();
      pausedDurationRef.current = 0;
      setRunning({
        entryId: data.id,
        projectId: opts.projectId ?? null,
        taskId: opts.taskId ?? null,
        description: opts.description ?? null,
      });
      setElapsed(0);
      setStatus('running');
    },
    [session, status, running, clearTick],
  );

  const pause = useCallback(() => {
    if (status !== 'running') return;
    pausedAtRef.current = Date.now();
    setStatus('paused');
  }, [status]);

  const resume = useCallback(() => {
    if (status !== 'paused') return;
    pausedDurationRef.current += Date.now() - pausedAtRef.current;
    pausedAtRef.current = 0;
    setStatus('running');
  }, [status]);

  const stop = useCallback(async () => {
    if (status === 'idle' || !running) return;
    if (status === 'paused') {
      pausedDurationRef.current += Date.now() - pausedAtRef.current;
    }
    const now = new Date().toISOString();
    await supabase
      .from('time_entries')
      .update({ end_time: now, paused_duration: Math.round(pausedDurationRef.current / 1000) })
      .eq('id', running.entryId);

    setRunning(null);
    setElapsed(0);
    pausedDurationRef.current = 0;
    pausedAtRef.current = 0;
    setStatus('idle');
  }, [status, running]);

  const updateEntry = useCallback(
    async (fields: { projectId?: string; taskId?: string; description?: string }) => {
      if (!running) return;
      const update: Record<string, unknown> = {};
      if (fields.projectId !== undefined) update.project_id = fields.projectId;
      if (fields.taskId !== undefined) update.task_id = fields.taskId;
      if (fields.description !== undefined) update.description = fields.description;
      await supabase.from('time_entries').update(update).eq('id', running.entryId);
      setRunning((prev) => prev ? { ...prev, ...fields } : prev);
    },
    [running],
  );

  return { status, elapsed, running, start, pause, resume, stop, updateEntry };
}
