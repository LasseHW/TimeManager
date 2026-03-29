import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type Task = {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
};

export function useTasks() {
  const { session } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);

  const refresh = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('tasks')
      .select('id, project_id, name, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });
    if (data) setTasks(data);
  }, [session]);

  useEffect(() => { refresh(); }, [refresh]);

  const addTask = useCallback(async (projectId: string, name: string): Promise<string | null> => {
    if (!session) return null;
    const { data } = await supabase
      .from('tasks')
      .insert({ user_id: session.user.id, project_id: projectId, name })
      .select('id')
      .single();
    await refresh();
    return data?.id ?? null;
  }, [session, refresh]);

  const updateTask = useCallback(async (id: string, name: string) => {
    await supabase.from('tasks').update({ name }).eq('id', id);
    await refresh();
  }, [refresh]);

  const deleteTask = useCallback(async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    await refresh();
  }, [refresh]);

  const tasksForProject = useCallback(
    (projectId: string) => tasks.filter((t) => t.project_id === projectId),
    [tasks],
  );

  return { tasks, tasksForProject, addTask, updateTask, deleteTask, refresh };
}
