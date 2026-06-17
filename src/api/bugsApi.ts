import axiosClient from './axiosClient';
import type { Bug, BugCreate, BugUpdate } from '../types';

/**
 * Bugs API service — typed CRUD + advanced FormData multi-part update.
 */
const bugsApi = {
  /** List all root bugs for a project */
  list: (projectId: number): Promise<Bug[]> =>
    axiosClient.get<Bug[]>('/bugs/', { params: { project_id: projectId } }).then((r) => r.data),

  /** Fetch a single bug */
  get: (id: number): Promise<Bug> =>
    axiosClient.get<Bug>(`/bugs/${id}`).then((r) => r.data),

  /** Create a new bug */
  create: (data: BugCreate): Promise<Bug> =>
    axiosClient.post<Bug>('/bugs/', data).then((r) => r.data),

  /**
   * Advanced multi-part PUT update.
   * Converts scalar fields + keep_ids + new File binaries into FormData.
   * @param id           - bug ID to update
   * @param data         - scalar field values
   * @param keepIds      - attachment IDs to retain
   * @param newFiles     - new File objects to upload
   */
  update: (
    id: number,
    data: BugUpdate,
    keepIds: number[],
    newFiles: File[],
  ): Promise<Bug> => {
    const fd = new FormData();

    if (data.title !== undefined) fd.append('title', data.title);
    if (data.description !== undefined) fd.append('description', data.description ?? '');
    if (data.reporter !== undefined) fd.append('reporter', data.reporter);
    if (data.start_date !== undefined) fd.append('start_date', data.start_date ?? '');
    if (data.end_date !== undefined) fd.append('end_date', data.end_date ?? '');
    if (data.status !== undefined) fd.append('status', data.status);
    if (data.assignees !== undefined) fd.append('assignees', JSON.stringify(data.assignees));
    if (data.task_id !== undefined && data.task_id !== null) {
      fd.append('task_id', String(data.task_id));
    }
    if (data.parent_id !== undefined && data.parent_id !== null) {
      fd.append('parent_id', String(data.parent_id));
    }

    fd.append('keep_attachment_ids', JSON.stringify(keepIds));
    newFiles.forEach((file) => fd.append('new_files', file, file.name));

    return axiosClient
      .put<Bug>(`/bugs/${id}`, fd)
      .then((r) => r.data);
  },

  /** Delete a bug */
  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/bugs/${id}`).then(() => undefined),
};

export default bugsApi;
