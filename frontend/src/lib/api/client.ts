import axios, { type AxiosError } from 'axios';

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

// --- Token handling (placeholder) ---
// TODO: Replace with real auth (e.g. getAccessToken from auth context/store).
function getAuthToken(): string | null {
  return null;
}

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Global error handling (placeholder) ---
// TODO: Hook up to toast/notification, redirect on 401, log to monitoring, etc.
function handleApiError(_error: AxiosError): void {
  // e.g. if (error.response?.status === 401) redirect to login
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    handleApiError(error);
    return Promise.reject(error);
  }
);