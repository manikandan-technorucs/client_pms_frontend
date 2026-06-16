import { useState, useCallback, useEffect } from 'react';
import bugsApi from '../api/bugsApi';
import type { Bug, BugCreate, BugUpdate } from '../types';

/**
 * useBugs — decoupled business logic hook for bug management within a project.
 *
 * Optimization strategy:
 * - On create: re-fetch to get full nested tree (parent relationships need sync).
 * - On update: replace the updated bug in-place → NO re-fetch needed.
 * - On delete: optimistic remove, then background re-fetch for cascade consistency.
 *
 * This reduces API calls from 3× (mutation + re-fetch) to 1× for update/delete.
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

  /**
   * createBug — re-fetches after create to get correct nested tree structure.
   */
  const createBug = useCallback(
    async (data: BugCreate): Promise<Bug> => {
      const created = await bugsApi.create(data);
      await refresh();
      return created;
    },
    [refresh],
  );

  /**
   * updateBug — replaces bug in state using server response, no full re-fetch.
   */
  const updateBug = useCallback(
    async (
      id: number,
      data: BugUpdate,
      keepIds: number[],
      newFiles: File[],
    ): Promise<Bug> => {
      const updated = await bugsApi.update(id, data, keepIds, newFiles);
      // Recursively replace the updated bug in the nested tree
      setBugs((prev) => replaceBugInTree(prev, updated));
      return updated;
    },
    [],
  );

  /**
   * deleteBug — optimistic remove, then background re-fetch for cascade sync.
   */
  const deleteBug = useCallback(
    async (id: number): Promise<void> => {
      // Optimistic remove — UI updates instantly
      setBugs((prev) => removeBugFromTree(prev, id));
      await bugsApi.remove(id);
      // Background refresh to sync any cascade-deleted sub-bugs
      refresh().catch(console.error);
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

// ─── Tree manipulation helpers ────────────────────────────────────────────────

/**
 * Recursively replaces a bug (by id) anywhere in the nested bug tree.
 */
function replaceBugInTree(bugs: Bug[], updated: Bug): Bug[] {
  return bugs.map((b) => {
    if (b.id === updated.id) return updated;
    if (b.sub_bugs?.length) {
      return { ...b, sub_bugs: replaceBugInTree(b.sub_bugs, updated) };
    }
    return b;
  });
}

/**
 * Recursively removes a bug (by id) from the nested bug tree.
 */
function removeBugFromTree(bugs: Bug[], id: number): Bug[] {
  return bugs
    .filter((b) => b.id !== id)
    .map((b) => {
      if (b.sub_bugs?.length) {
        return { ...b, sub_bugs: removeBugFromTree(b.sub_bugs, id) };
      }
      return b;
    });
}
