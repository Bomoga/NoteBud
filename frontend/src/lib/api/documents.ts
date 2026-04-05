import { apiClient } from './client';

export interface DocumentResponse {
  id: string;
  filename: string;
  file_type: string;
  source_type: 'content' | 'syllabus';
  status: string;
  gcs_uri: string;
}

export async function listDocuments(notebookId: string): Promise<DocumentResponse[]> {
  const { data } = await apiClient.get<DocumentResponse[]>(
    `/notebooks/${notebookId}/documents`
  );
  return data;
}
