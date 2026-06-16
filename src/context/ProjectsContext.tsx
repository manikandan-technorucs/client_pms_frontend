import React, { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import projectsApi from '../api/projectsApi';
import type { Project, ProjectCreate, ProjectUpdate } from '../types';

interface ProjectsContextType {
  projects: Project[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createProject: (data: ProjectCreate, newFiles?: File[]) => Promise<Project>;
  updateProject: (id: number, data: ProjectUpdate, keepIds?: number[], newFiles?: File[]) => Promise<Project>;
  deleteProject: (id: number) => Promise<void>;
}

const ProjectsContext = createContext<ProjectsContextType | undefined>(undefined);

export const ProjectsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading, error: queryError, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  });

  const createMutation = useMutation({
    mutationFn: ({ data, newFiles }: { data: ProjectCreate, newFiles?: File[] }) => 
      projectsApi.create(data, newFiles || []),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data, keepIds, newFiles }: { id: number, data: ProjectUpdate, keepIds?: number[], newFiles?: File[] }) => 
      projectsApi.update(id, data, keepIds || [], newFiles || []),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => projectsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  const value: ProjectsContextType = {
    projects,
    loading: isLoading,
    error: queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load projects') : null,
    refresh: async () => { await refetch(); },
    createProject: async (data, newFiles) => createMutation.mutateAsync({ data, newFiles }),
    updateProject: async (id, data, keepIds, newFiles) => updateMutation.mutateAsync({ id, data, keepIds, newFiles }),
    deleteProject: async (id) => deleteMutation.mutateAsync(id),
  };

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
};

export const useProjectsContext = (): ProjectsContextType => {
  const ctx = useContext(ProjectsContext);
  if (!ctx) {
    throw new Error('useProjectsContext must be used within a <ProjectsProvider>');
  }
  return ctx;
};
