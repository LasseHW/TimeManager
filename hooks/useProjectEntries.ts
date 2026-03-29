import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type ProjectEntry = {
  id: string;
  task_id: string | null;
  project_id: string;
  start_time: string;
  end_time: string;
  paused_duration: number;
  description: string | null;
};

function durationMs(e: ProjectEntry) {
  return Math.max(
    0,
    new Date(e.end_time).getTime() -
      new Date(e.start_time).getTime() -
      (e.paused_duration ?? 0) * 1000,
  );
}

export function useProjectEntries(projectId: string | null) {
  const { session } = useAuth();
  const [entries, setEntries] = useState<ProjectEntry[]>([]);

  const refresh = useCallback(async () => {
    if (!session || !projectId) {
      setEntries([]);
      return;
    }
    const { data } = await supabase
      .from('time_entries')
      .select('id, task_id, project_id, start_time, end_time, paused_duration, description')
      .eq('project_id', projectId)
      .eq('user_id', session.user.id)
      .not('end_time', 'is', null)
      .order('start_time', { ascending: false })
      .limit(500);
    if (data) setEntries(data as ProjectEntry[]);
  }, [session, projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime
  useEffect(() => {
    if (!session || !projectId) return;
    const channel = supabase
      .channel(`proj_entries_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries',
          filter: `project_id=eq.${projectId}`,
        },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, projectId, refresh]);

  // Per-task totals
  const taskTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      if (!e.task_id) continue;
      map.set(e.task_id, (map.get(e.task_id) ?? 0) + durationMs(e));
    }
    return map;
  }, [entries]);

  // Entries grouped by task
  const entriesByTask = useMemo(() => {
    const map = new Map<string, ProjectEntry[]>();
    for (const e of entries) {
      const key = e.task_id ?? '__none__';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [entries]);

  // Total project ms
  const totalMs = useMemo(() => {
    return entries.reduce((sum, e) => sum + durationMs(e), 0);
  }, [entries]);

  return { entries, refresh, taskTotals, entriesByTask, totalMs };
}
