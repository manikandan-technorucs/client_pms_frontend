import { useState, useCallback, useEffect } from 'react';
import bugsApi from '../api/bugsApi';
import type { Bug, BugCreate, BugUpdate } from '../types';

/**
 * useBugs — decoupled business logic hook for bug management within a project.
 */
export function useBugs(projectId: number | undefined) {
  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (projectId === undefined) return;
    setLoading(true);
    setError(null);
    try {
      const data = await bugsApi.list(projectId);
      setBugs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bugs');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createBug = useCallback(
    async (data: BugCreate): Promise<Bug> => {
      const created = await bugsApi.create(data);
      await refresh();
      return created;
    },
    [refresh],
  );

  const updateBug = useCallback(
    async (
      id: number,
      data: BugUpdate,
      keepIds: number[],
      newFiles: File[],
    ): Promise<Bug> => {
      const updated = await bugsApi.update(id, data, keepIds, newFiles);
      await refresh();
      return updated;
    },
    [refresh],
  );

  const deleteBug = useCallback(
    async (id: number): Promise<void> => {
      await bugsApi.remove(id);
      await refresh();
    },
    [refresh],
  );

  /**
   * Convert Bug[] to PrimeReact TreeNode[] format (sub_bugs nested).
   */
  const toTreeNodes = useCallback((items: Bug[]): object[] => {
    const convert = (bug: Bug, keyPrefix: string): object => ({
      key: keyPrefix,
      data: bug,
      children: (bug.sub_bugs ?? []).map((sub, si) =>
        convert(sub, `${keyPrefix}-${si}`),
      ),
    });
    return items.map((b, i) => convert(b, String(i)));
  }, []);

  return {
    bugs,
    bugTreeNodes: toTreeNodes(bugs),
    loading,
    error,
    refresh,
    createBug,
    updateBug,
    deleteBug,
  };
}
