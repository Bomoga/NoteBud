import { apiClient } from './client';

const BASE = '/users';

export function getAvatarUrl(): string {
  const base = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '');
  return `${base}/users/me/avatar`;
}

export async function uploadAvatar(file: File): Promise<{ avatar_gcs_uri: string }> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<{ avatar_gcs_uri: string }>(
    `${BASE}/me/avatar`,
    form,
    { headers: { 'Content-Type': undefined } },
  );
  return data;
}

export async function deleteAvatar(): Promise<void> {
  await apiClient.delete(`${BASE}/me/avatar`);
}
