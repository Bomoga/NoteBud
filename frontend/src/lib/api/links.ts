import { apiClient } from './client';

export type LinkType = 'prerequisite' | 'related-to';

export interface NotebookLinkRead {
  id: string;
  from_notebook_id: string;
  to_notebook_id: string;
  to_notebook_title: string;
  to_notebook_course_code: string;
  link_type: LinkType;
  created_at: string;
}

export interface NotebookLinkInbound {
  id: string;
  from_notebook_id: string;
  from_notebook_title: string;
  from_notebook_course_code: string;
  to_notebook_id: string;
  link_type: LinkType;
  created_at: string;
}

export interface NotebookLinksResponse {
  outbound: NotebookLinkRead[];
  inbound: NotebookLinkInbound[];
}

export interface SimilarNotebook {
  notebook_id: string;
  title: string;
  course_code: string;
  avg_score: number;
  hit_count: number;
}

export interface NotebookLinkCreate {
  to_notebook_id: string;
  link_type: LinkType;
}

export async function listLinks(notebookId: string): Promise<NotebookLinksResponse> {
  const { data } = await apiClient.get<NotebookLinksResponse>(`/notebooks/${notebookId}/links`);
  return data;
}

export async function createLink(notebookId: string, payload: NotebookLinkCreate): Promise<NotebookLinkRead> {
  const { data } = await apiClient.post<NotebookLinkRead>(`/notebooks/${notebookId}/links`, payload);
  return data;
}

export async function deleteLink(notebookId: string, linkId: string): Promise<void> {
  await apiClient.delete(`/notebooks/${notebookId}/links/${linkId}`);
}

export async function getSimilarNotebooks(notebookId: string): Promise<SimilarNotebook[]> {
  const { data } = await apiClient.get<SimilarNotebook[]>(`/notebooks/${notebookId}/similar`);
  return data;
}
