import axios, { type AxiosError } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL;

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