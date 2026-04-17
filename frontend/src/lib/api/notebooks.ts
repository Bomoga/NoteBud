import { apiClient } from './client';

export interface NotebookResponse {
  id: string;
  title: string;
  course_code: string;
  description: string | null;
  semester: string;
  banner_gcs_uri: string | null;
  created_at: string;
  updated_at: string;
  owner_id: string | null;
}

export interface NotebookCreate {
  title: string;
  course_code: string;
  description?: string | null;
  semester?: string;
}

export interface NotebookUpdate {
  title?: string;
  course_code?: string;
  description?: string | null;
  semester?: string;
}

const BASE = '/notebooks';

export async function getNotebooks(): Promise<NotebookResponse[]> {
  const { data } = await apiClient.get<NotebookResponse[]>(BASE);
  return data;
}

export async function createNotebook(
  payload: NotebookCreate
): Promise<NotebookResponse> {
  const { data } = await apiClient.post<NotebookResponse>(BASE, payload);
  return data;
}

export async function getNotebook(id: string): Promise<NotebookResponse> {
  const { data } = await apiClient.get<NotebookResponse>(`${BASE}/${id}`);
  return data;
}

export async function updateNotebook(
  id: string,
  payload: NotebookUpdate
): Promise<NotebookResponse> {
  const { data } = await apiClient.patch<NotebookResponse>(`${BASE}/${id}`, payload);
  return data;
}

export async function deleteNotebook(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

export function getNotebookBannerUrl(notebookId: string): string {
  const base = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
  return `${base}/notebooks/${notebookId}/banner`;
}

export async function uploadNotebookBanner(
  notebookId: string,
  file: File,
): Promise<NotebookResponse> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<NotebookResponse>(
    `${BASE}/${notebookId}/banner`,
    form,
    { headers: { 'Content-Type': undefined } },
  );
  return data;
}

export async function deleteNotebookBanner(notebookId: string): Promise<NotebookResponse> {
  const { data } = await apiClient.delete<NotebookResponse>(`${BASE}/${notebookId}/banner`);
  return data;
}

export interface UploadFileResponse {
  status: string;
  filename: string;
  content_type: string;
  gcs_uri: string;
  document_id: string;
}

export interface QueryNotebookResponse {
  answer: string;
  sources: string[];
}

export async function queryNotebook(
  id: string,
  query: string
): Promise<QueryNotebookResponse> {
  const { data } = await apiClient.post<QueryNotebookResponse>(
    `${BASE}/${id}/query`,
    { query }
  );
  return data;
}

export async function uploadFile(
  notebookId: string,
  file: File,
  sourceType?: 'syllabus' | 'content',
  folderPath?: string,
): Promise<UploadFileResponse> {
  const form = new FormData();
  form.append('file', file);
  const params = new URLSearchParams({ notebook_id: notebookId });
  if (sourceType) params.set('source_type', sourceType);
  if (folderPath) params.set('folder_path', folderPath);
  const { data } = await apiClient.post<UploadFileResponse>(
    `/files/upload?${params.toString()}`,
    form,
    { headers: { 'Content-Type': undefined } }
  );
  return data;
}
