import { apiClient } from './client';

export interface CourseResponse {
  code: string;
  name: string;
}

export interface NotebookTagResponse {
  notebook_id: string;
  type: 'prerequisite' | 'relates-to';
  course_code: string;
}

export async function getCourses(): Promise<CourseResponse[]> {
  const { data } = await apiClient.get<CourseResponse[]>('/api/v1/courses');
  return data;
}

export async function addNotebookTag(
  notebookId: string,
  type: 'prerequisite' | 'relates-to',
  courseCode: string
): Promise<NotebookTagResponse> {
  const { data } = await apiClient.post<NotebookTagResponse>(
    `/api/v1/notebooks/${notebookId}/tags`,
    { type, course_code: courseCode }
  );
  return data;
}

export async function removeNotebookTag(
  notebookId: string,
  courseCode: string
): Promise<void> {
  await apiClient.delete(`/api/v1/notebooks/${notebookId}/tags/${courseCode}`);
}
