import { apiClient } from './client';

export interface NotebookResponse {
  id: string;
  title: string;
  course_code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  owner_id: string | null;
}

export interface NotebookCreate {
  title: string;
  course_code: string;
  description?: string | null;
}

export interface NotebookUpdate {
  title?: string;
  course_code?: string;
  description?: string | null;
}

const BASE = '/api/v1/notebooks';

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

export interface UploadFileResponse {
  status: string;
  filename: string;
  content_type: string;
  gcs_uri: string;
  document_id: string;
}

export async function uploadFile(
  notebookId: string,
  file: File,
  sourceType?: string
): Promise<UploadFileResponse> {
  const form = new FormData();
  form.append('file', file);
  const params = new URLSearchParams({ notebook_id: notebookId });
  if (sourceType) params.set('source_type', sourceType);
  const { data } = await apiClient.post<UploadFileResponse>(
    `/api/v1/files/upload?${params.toString()}`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}
