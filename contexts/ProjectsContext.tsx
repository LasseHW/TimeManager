import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export type Project = {
  id: string;
  name: string;
  color: string;
  folder_id: string | null;
};

type ProjectsContextType = {
  projects: Project[];
  addProject: (name: string, color: string, folderId?: string | null) => Promise<void>;
  updateProject: (id: string, name: string, color: string, folderId?: string | null) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
};

const ProjectsContext = createContext<ProjectsContextType>({
  projects: [],
  addProject: async () => {},
  updateProject: async () => {},
  deleteProject: async () => {},
});

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);

  const fetch = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase
      .from('projects')
      .select('id, name, color, folder_id')
      .eq('user_id', session.user.id)
      .order('name');
    if (data) setProjects(data as Project[]);
  }, [session]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const addProject = useCallback(
    async (name: string, color: string, folderId: string | null = null) => {
      if (!session) return;
      const { error } = await supabase
        .from('projects')
        .insert({ user_id: session.user.id, name, color, folder_id: folderId });
      if (error) console.error('addProject error:', error.message);
      await fetch();
    },
    [session, fetch],
  );

  const updateProject = useCallback(
    async (id: string, name: string, color: string, folderId?: string | null) => {
      const update: Record<string, unknown> = { name, color };
      if (folderId !== undefined) update.folder_id = folderId;
      await supabase.from('projects').update(update).eq('id', id);
      await fetch();
    },
    [fetch],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      await supabase.from('projects').delete().eq('id', id);
      await fetch();
    },
    [fetch],
  );

  return (
    <ProjectsContext.Provider value={{ projects, addProject, updateProject, deleteProject }}>
      {children}
    </ProjectsContext.Provider>
  );
}

export const useProjects = () => useContext(ProjectsContext);
