import axiosClient from './axiosClient';
import type { Project, ProjectCreate, ProjectUpdate } from '../types';

const projectsApi = {
  list: (): Promise<Project[]> =>
    axiosClient.get<Project[]>('/projects/').then((r) => r.data),

  get: (id: number): Promise<Project> =>
    axiosClient.get<Project>(`/projects/${id}`).then((r) => r.data),

  getStats: (): Promise<{ totalTasks: number; totalBugs: number }> =>
    axiosClient.get('/projects/stats').then((r) => r.data),

  create: (data: ProjectCreate, newFiles: File[] = []): Promise<Project> => {
    const fd = new FormData();
    fd.append('name', data.name);
    if (data.description) fd.append('description', data.description);
    if (data.start_date) fd.append('start_date', data.start_date);
    if (data.end_date) fd.append('end_date', data.end_date);
    if (data.status) fd.append('status', data.status);

    newFiles.forEach((file) => fd.append('new_files', file));

    return axiosClient
      .post<Project>('/projects/', fd)
      .then((r) => r.data);
  },

  update: (
    id: number,
    data: ProjectUpdate,
    keepIds: number[] = [],
    newFiles: File[] = []
  ): Promise<Project> => {
    const fd = new FormData();
    if (data.name !== undefined) fd.append('name', data.name);
    if (data.description !== undefined) fd.append('description', data.description || '');
    if (data.start_date !== undefined) fd.append('start_date', data.start_date || '');
    if (data.end_date !== undefined) fd.append('end_date', data.end_date || '');
    if (data.status !== undefined) fd.append('status', data.status);

    fd.append('keep_attachment_ids', JSON.stringify(keepIds));
    newFiles.forEach((file) => fd.append('new_files', file));

    return axiosClient
      .put<Project>(`/projects/${id}`, fd)
      .then((r) => r.data);
  },

  remove: (id: number): Promise<void> =>
    axiosClient.delete(`/projects/${id}`).then(() => undefined),
};

export default projectsApi;
