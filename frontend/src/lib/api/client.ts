import axios, { type AxiosError } from 'axios';
import { useAuthStore } from '../store/auth';

const baseURL = process.env.NEXT_PUBLIC_API_URL;

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const u = baseURL ?? '';
  if (u && !u.includes('/api/v1')) {
    console.warn(
      '[api] NEXT_PUBLIC_API_URL should include /api/v1 (e.g. http://localhost:8000/api/v1). ' +
        'Otherwise requests go to the wrong path and the UI will error.'
    );
  }
}

export const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return useAuthStore.getState().token;
}

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function isAuthRequest(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes('/auth/token') || url.includes('/auth/register');
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      const reqUrl = error.config?.url ?? '';
      if (!isAuthRequest(reqUrl)) {
        useAuthStore.getState().clearSession();
        if (
          typeof window !== 'undefined' &&
          !['/login', '/register'].some((p) =>
            window.location.pathname.startsWith(p)
          )
        ) {
          window.location.assign('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);