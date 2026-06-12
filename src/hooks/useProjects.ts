import { useState, useCallback, useEffect } from 'react';
import projectsApi from '../api/projectsApi';
import type { Project, ProjectCreate, ProjectUpdate } from '../types';

/**
 * useProjects — decoupled business logic hook for project management.
 * All API calls are isolated here; views only consume state + actions.
 */
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await projectsApi.list();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createProject = async (data: ProjectCreate, newFiles: File[] = []) => {
    try {
      const newProj = await projectsApi.create(data, newFiles);
      setProjects((prev) => [newProj, ...prev]);
      return newProj;
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
      throw err;
    }
  };

  const updateProject = async (id: number, data: ProjectUpdate, keepIds: number[] = [], newFiles: File[] = []) => {
    try {
      const updated = await projectsApi.update(id, data, keepIds, newFiles);
      setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
      return updated;
    } catch (err: any) {
      setError(err.message || 'Failed to update project');
      throw err;
    }
  };

  const deleteProject = useCallback(async (id: number): Promise<void> => {
    await projectsApi.remove(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return {
    projects,
    loading,
    error,
    refresh,
    createProject,
    updateProject,
    deleteProject,
  };
}
