import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type TodayEntry = {
  id: string;
  start_time: string;
  end_time: string | null;
  paused_duration: number;
  description: string | null;
  task_id: string | null;
  project: { id: string; name: string; color: string } | null;
};

function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function useTodayEntries() {
  const { session } = useAuth();
  const [entries, setEntries] = useState<TodayEntry[]>([]);

  const refresh = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('time_entries')
      .select('id, start_time, end_time, paused_duration, description, task_id, project:projects(id, name, color)')
      .eq('user_id', session.user.id)
      .gte('start_time', todayStart())
      .not('end_time', 'is', null)
      .order('start_time', { ascending: false });
    if (data) setEntries(data as unknown as TodayEntry[]);
  }, [session]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel('today_entries')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'time_entries',
        filter: `user_id=eq.${session.user.id}`,
      }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, refresh]);

  /** Total tracked milliseconds today (completed entries only) */
  const totalTodayMs = entries.reduce((sum, e) => {
    if (!e.end_time) return sum;
    return sum + new Date(e.end_time).getTime() - new Date(e.start_time).getTime() - (e.paused_duration ?? 0) * 1000;
  }, 0);

  /** Total ms per task (for displaying accumulated time on task rows) */
  const taskTotals = new Map<string, number>();
  for (const e of entries) {
    if (!e.task_id || !e.end_time) continue;
    const ms = new Date(e.end_time).getTime() - new Date(e.start_time).getTime() - (e.paused_duration ?? 0) * 1000;
    taskTotals.set(e.task_id, (taskTotals.get(e.task_id) ?? 0) + ms);
  }

  return { entries, refresh, totalTodayMs, taskTotals };
}
