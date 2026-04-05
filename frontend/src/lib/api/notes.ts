import { apiClient } from './client';

export interface NoteResponse {
  id: string;
  notebook_id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
}

export interface NoteCreate {
  title: string;
  content?: string;
}

export interface NoteUpdate {
  title?: string;
  content?: string;
}

const base = (notebookId: string) => `/notebooks/${notebookId}/notes`;

export async function listNotes(notebookId: string): Promise<NoteResponse[]> {
  const { data } = await apiClient.get<NoteResponse[]>(base(notebookId));
  return data;
}

export async function createNote(
  notebookId: string,
  payload: NoteCreate
): Promise<NoteResponse> {
  const { data } = await apiClient.post<NoteResponse>(base(notebookId), payload);
  return data;
}

export async function getNote(
  notebookId: string,
  noteId: string
): Promise<NoteResponse> {
  const { data } = await apiClient.get<NoteResponse>(`${base(notebookId)}/${noteId}`);
  return data;
}

export async function updateNote(
  notebookId: string,
  noteId: string,
  payload: NoteUpdate
): Promise<NoteResponse> {
  const { data } = await apiClient.patch<NoteResponse>(
    `${base(notebookId)}/${noteId}`,
    payload
  );
  return data;
}

export async function deleteNote(
  notebookId: string,
  noteId: string
): Promise<void> {
  await apiClient.delete(`${base(notebookId)}/${noteId}`);
}
