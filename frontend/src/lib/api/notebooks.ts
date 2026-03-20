import { apiClient } from './client';

export interface NotebookResponse {
  id: number;
  title: string;
  course_code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  owner_id: number | null;
}

export interface NotebookCreate {
  title: string;
  course_code: string;
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

export async function deleteNotebook(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
