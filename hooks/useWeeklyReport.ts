import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type DailyTotal = {
  date: string;   // YYYY-MM-DD
  hours: number;
};

export type WeekOffset = number; // 0 = current week, -1 = last week, etc.

function weekRange(offset: WeekOffset): { from: string; to: string; label: string } {
  const now = new Date();
  const day = now.getDay();
  // Monday-based week start
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const label = `${fmt(monday).slice(5)} – ${fmt(sunday).slice(5)}`;

  return { from: monday.toISOString(), to: sunday.toISOString(), label };
}

const DAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export function useWeeklyReport() {
  const { session } = useAuth();
  const [offset, setOffset] = useState<WeekOffset>(0);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [data, setData] = useState<DailyTotal[]>([]);
  const [loading, setLoading] = useState(false);
  const [weekLabel, setWeekLabel] = useState('');

  const fetch = useCallback(async () => {
    if (!session) return;
    setLoading(true);

    const { from, to, label } = weekRange(offset);
    setWeekLabel(label);

    let query = supabase
      .from('time_entries')
      .select('start_time, end_time, paused_duration')
      .eq('user_id', session.user.id)
      .not('end_time', 'is', null)
      .gte('start_time', from)
      .lte('start_time', to);

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: rows } = await query;

    // Group client-side by date
    const map = new Map<string, number>();
    for (const row of rows ?? []) {
      const date = row.start_time.slice(0, 10);
      const ms =
        new Date(row.end_time).getTime() -
        new Date(row.start_time).getTime() -
        (row.paused_duration ?? 0) * 1000;
      map.set(date, (map.get(date) ?? 0) + Math.max(0, ms));
    }

    // Build full 7-day array (Mon–Sun)
    const monday = new Date(from);
    const result: DailyTotal[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, hours: (map.get(key) ?? 0) / 3_600_000 });
    }

    setData(result);
    setLoading(false);
  }, [session, offset, projectId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    data,
    loading,
    offset,
    setOffset,
    projectId,
    setProjectId,
    weekLabel,
    dayLabels: DAY_LABELS,
    totalHours: data.reduce((sum, d) => sum + d.hours, 0),
  };
}
