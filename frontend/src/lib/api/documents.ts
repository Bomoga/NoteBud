import { apiClient } from './client';

export interface DocumentResponse {
  id: string;
  filename: string;
  file_type: string;
  source_type: 'content' | 'syllabus';
  status: string;
  gcs_uri: string;
  folder_path: string;
}

export interface DocumentUpdate {
  folder_path?: string;
}

export async function listDocuments(notebookId: string): Promise<DocumentResponse[]> {
  const { data } = await apiClient.get<DocumentResponse[]>(
    `/notebooks/${notebookId}/documents`
  );
  return data;
}

export async function patchDocument(
  notebookId: string,
  documentId: string,
  payload: DocumentUpdate,
): Promise<DocumentResponse> {
  const { data } = await apiClient.patch<DocumentResponse>(
    `/notebooks/${notebookId}/documents/${documentId}`,
    payload,
  );
  return data;
}
