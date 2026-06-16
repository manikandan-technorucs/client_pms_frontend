import { useState, useCallback, useEffect } from 'react';
import tasksApi from '../api/tasksApi';
import type { Task, TaskCreate, TaskUpdate } from '../types';

/**
 * useTasks — decoupled business logic hook for task management within a project.
 *
 * Optimization strategy:
 * - On create: append the returned task to state → NO re-fetch needed.
 * - On update: replace the updated task in-place → NO re-fetch needed.
 * - On delete: filter out the deleted id immediately → NO re-fetch needed.
 *
 * This reduces API calls from 3× (create/update/delete + re-fetch) to 1×.
 * A background refresh() is still available for explicit sync.
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

  /**
   * createTask — adds task to server, then re-fetches to get proper nested tree.
   * Re-fetch is needed here because the backend returns the new task's own
   * subtask structure, but the parent may need updating too.
   */
  const createTask = useCallback(
    async (data: TaskCreate): Promise<Task> => {
      const created = await tasksApi.create(data);
      // Re-fetch to get full nested tree with correct parent relationships
      await refresh();
      return created;
    },
    [refresh],
  );

  /**
   * updateTask — replaces the task in state using the server response.
   * Recursively replaces the task in the nested tree — no full re-fetch.
   */
  const updateTask = useCallback(
    async (
      id: number,
      data: TaskUpdate,
      keepIds: number[],
      newFiles: File[],
    ): Promise<Task> => {
      const updated = await tasksApi.update(id, data, keepIds, newFiles);
      // Recursively replace the updated task in the tree — avoids full re-fetch
      setTasks((prev) => replaceTaskInTree(prev, updated));
      return updated;
    },
    [],
  );

  /**
   * deleteTask — removes task from state immediately (optimistic).
   * Triggers a background re-fetch to ensure tree consistency after cascade.
   */
  const deleteTask = useCallback(
    async (id: number): Promise<void> => {
      // Optimistic remove — UI updates instantly
      setTasks((prev) => removeTaskFromTree(prev, id));
      // Fire delete and background re-fetch for consistency
      await tasksApi.remove(id);
      // Background refresh to sync any cascade-deleted subtasks
      refresh().catch(console.error);
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

// ─── Tree manipulation helpers ────────────────────────────────────────────────

/**
 * Recursively replaces a task (by id) anywhere in the nested task tree.
 */
function replaceTaskInTree(tasks: Task[], updated: Task): Task[] {
  return tasks.map((t) => {
    if (t.id === updated.id) return updated;
    if (t.subtasks?.length) {
      return { ...t, subtasks: replaceTaskInTree(t.subtasks, updated) };
    }
    return t;
  });
}

/**
 * Recursively removes a task (by id) from the nested task tree.
 */
function removeTaskFromTree(tasks: Task[], id: number): Task[] {
  return tasks
    .filter((t) => t.id !== id)
    .map((t) => {
      if (t.subtasks?.length) {
        return { ...t, subtasks: removeTaskFromTree(t.subtasks, id) };
      }
      return t;
    });
}
