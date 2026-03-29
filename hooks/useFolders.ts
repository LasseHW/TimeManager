import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export type Folder = {
  id: string;
  name: string;
  created_at: string;
};

export function useFolders() {
  const { session } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);

  const refresh = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('folders')
      .select('id, name, created_at')
      .eq('user_id', session.user.id)
      .order('name');
    if (data) setFolders(data);
  }, [session]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addFolder = useCallback(
    async (name: string) => {
      if (!session) return;
      await supabase.from('folders').insert({ user_id: session.user.id, name });
      await refresh();
    },
    [session, refresh],
  );

  const updateFolder = useCallback(
    async (id: string, name: string) => {
      await supabase.from('folders').update({ name }).eq('id', id);
      await refresh();
    },
    [refresh],
  );

  const deleteFolder = useCallback(
    async (id: string) => {
      // Unassign projects from this folder first
      await supabase.from('projects').update({ folder_id: null }).eq('folder_id', id);
      await supabase.from('folders').delete().eq('id', id);
      await refresh();
    },
    [refresh],
  );

  return { folders, addFolder, updateFolder, deleteFolder, refresh };
}
