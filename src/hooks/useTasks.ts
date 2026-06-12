import { useState, useCallback, useEffect } from 'react';
import tasksApi from '../api/tasksApi';
import type { Task, TaskCreate, TaskUpdate } from '../types';

/**
 * useTasks — decoupled business logic hook for task management within a project.
 * Builds tree structure compatible with PrimeReact TreeTable.
 */
export function useTasks(projectId: number | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (projectId === undefined) return;
    setLoading(true);
    setError(null);
    try {
      const data = await tasksApi.list(projectId);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createTask = useCallback(
    async (data: TaskCreate): Promise<Task> => {
      const created = await tasksApi.create(data);
      // Re-fetch to get proper tree with parent relationships
      await refresh();
      return created;
    },
    [refresh],
  );

  const updateTask = useCallback(
    async (
      id: number,
      data: TaskUpdate,
      keepIds: number[],
      newFiles: File[],
    ): Promise<Task> => {
      const updated = await tasksApi.update(id, data, keepIds, newFiles);
      await refresh();
      return updated;
    },
    [refresh],
  );

  const deleteTask = useCallback(
    async (id: number): Promise<void> => {
      await tasksApi.remove(id);
      await refresh();
    },
    [refresh],
  );

  /**
   * Convert flat Task[] to PrimeReact TreeNode[] format.
   * Tasks already come nested from the backend (subtasks embedded).
   */
  const toTreeNodes = useCallback((items: Task[]): object[] => {
    const convert = (task: Task, keyPrefix: string): object => ({
      key: keyPrefix,
      data: task,
      children: (task.subtasks ?? []).map((sub, si) =>
        convert(sub, `${keyPrefix}-${si}`),
      ),
    });
    return items.map((t, i) => convert(t, String(i)));
  }, []);

  return {
    tasks,
    treeNodes: toTreeNodes(tasks),
    loading,
    error,
    refresh,
    createTask,
    updateTask,
    deleteTask,
  };
}
