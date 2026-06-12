import axiosClient from './axiosClient';
import type { Task, TaskCreate, TaskUpdate } from '../types';

/**
 * Tasks API service — typed CRUD + advanced FormData multi-part update.
 */
const tasksApi = {
  /** List all root tasks for a project */
  list: (projectId: number): Promise<Task[]> =>
    axiosClient.get<Task[]>('/tasks/', { params: { project_id: projectId } }).then((r) => r.data),

  /** Fetch a single task */
  get: (id: number): Promise<Task> =>
    axiosClient.get<Task>(`/tasks/${id}`).then((r) => r.data),

  /** Create a new task (JSON body, no files at create time) */
  create: (data: TaskCreate): Promise<Task> =>
    axiosClient.post<Task>('/tasks/', data).then((r) => r.data),

  /**
   * Advanced multi-part PUT update.
   * Converts scalar fields + keep_ids + new File binaries into FormData.
   * @param id           - task ID to update
   * @param data         - scalar field values (only include changed fields)
   * @param keepIds      - array of attachment IDs to retain (missing IDs → deleted)
   * @param newFiles     - new File objects to upload
   */
  update: (
    id: number,
    data: TaskUpdate,
    keepIds: number[],
    newFiles: File[],
  ): Promise<Task> => {
    const fd = new FormData();

    // Append scalar fields only if defined
    if (data.name !== undefined) fd.append('name', data.name);
    if (data.description !== undefined) fd.append('description', data.description ?? '');
    if (data.start_date !== undefined) fd.append('start_date', data.start_date ?? '');
    if (data.end_date !== undefined) fd.append('end_date', data.end_date ?? '');
    if (data.status !== undefined) fd.append('status', data.status);
    if (data.assignees !== undefined) fd.append('assignees', JSON.stringify(data.assignees));
    if (data.parent_id !== undefined && data.parent_id !== null) {
      fd.append('parent_id', String(data.parent_id));
    }

    // Stringified JSON array of attachment IDs to keep
    fd.append('keep_attachment_ids', JSON.stringify(keepIds));

    // Append each new file binary
    newFiles.forEach((file) => fd.append('new_files', file, file.name));

    return axiosClient
      .put<Task>(`/tasks/${id}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  /** Delete a task */
  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/tasks/${id}`).then(() => undefined),
};

export default tasksApi;
