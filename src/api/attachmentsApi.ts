import axiosClient from './axiosClient';
import type { Attachment } from '../types';

/**
 * Attachments API — project-level file attachment operations.
 */
const attachmentsApi = {
  /**
   * Upload one or more files and attach them to a project.
   * Returns the newly created Attachment records.
   */
  uploadToProject: (projectId: number, files: File[]): Promise<Attachment[]> => {
    const fd = new FormData();
    files.forEach((file) => fd.append('new_files', file, file.name));
    return axiosClient
      .post<Attachment[]>(`/projects/${projectId}/attachments`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  /**
   * Delete a single attachment from a project.
   */
  deleteFromProject: (projectId: number, attachmentId: number): Promise<void> =>
    axiosClient
      .delete(`/projects/${projectId}/attachments/${attachmentId}`)
      .then(() => undefined),
};

export default attachmentsApi;
