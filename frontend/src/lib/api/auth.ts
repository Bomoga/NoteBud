import { apiClient } from './client';

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface RegisterResponse {
  id: string;
  username: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export async function register(
  body: AuthCredentials
): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>(
    '/auth/register',
    body
  );
  return data;
}

export async function login(body: AuthCredentials): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/auth/token', body);
  return data;
}
