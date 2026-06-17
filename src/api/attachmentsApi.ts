import axiosClient from './axiosClient';
import type { Attachment } from '../types';


const attachmentsApi = {

  uploadToProject: (projectId: number, files: File[]): Promise<Attachment[]> => {
    const fd = new FormData();
    files.forEach((file) => fd.append('new_files', file, file.name));
    return axiosClient
      .post<Attachment[]>(`/projects/${projectId}/attachments`, fd)
      .then((r) => r.data);
  },


  deleteFromProject: (projectId: number, attachmentId: number): Promise<void> =>
    axiosClient
      .delete(`/projects/${projectId}/attachments/${attachmentId}`)
      .then((res) => res.data),

  getSignedUrl: async (attachmentId: number): Promise<string> => {
    const { data } = await axiosClient.get<{ url: string }>(`/attachments/${attachmentId}/url`);
    return data.url;
  },
};

export default attachmentsApi;
