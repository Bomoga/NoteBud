import axios, { type AxiosError } from 'axios';
import { useAuthStore } from '../store/auth';

const baseURL = process.env.NEXT_PUBLIC_API_URL;
const AUTH_STORE_KEY = 'notebud-auth';

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

let authDisabledUntil = 0;
const inFlightControllers = new Set<AbortController>();
const controllerKey = Symbol('authAbortController');

/**
 * Prevent Axios from attaching Authorization for a short window.
 * Helps avoid stale Authorization headers being attached to requests
 * triggered during/after sign-out before all client state settles.
 */
export function disableAuthHeadersFor(ms: number = 5000) {
  authDisabledUntil = Date.now() + ms;
}

/** Abort all currently in-flight API requests (used on logout). */
export function abortAllInFlightRequests() {
  for (const c of inFlightControllers) c.abort();
  inFlightControllers.clear();
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return useAuthStore.getState().token;
}

function getPersistedAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AUTH_STORE_KEY);
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw) as { state?: { token?: string | null } };
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

apiClient.interceptors.request.use((config) => {
  // Ensure every request is abortable so we can stop in-flight calls on logout.
  const controller = new AbortController();
  inFlightControllers.add(controller);
  (config as any)[controllerKey] = controller;

  // Compose with any caller-provided signal so both caller-aborts and
  // logout-aborts are respected without silently dropping either.
  const callerSignal = config.signal as AbortSignal | undefined;
  if (callerSignal) {
    const onCallerAbort = () => controller.abort(callerSignal.reason);
    callerSignal.addEventListener('abort', onCallerAbort, { once: true });
    // Clean up the listener if our controller aborts first (e.g. on logout).
    controller.signal.addEventListener(
      'abort',
      () => callerSignal.removeEventListener('abort', onCallerAbort),
      { once: true }
    );
  }
  config.signal = controller.signal;

  if (Date.now() < authDisabledUntil) {
    const headers = (config.headers ?? {}) as any;
    config.headers = headers;
    delete headers.Authorization;
    return config;
  }

  const storeToken = getAuthToken();
  const raw =
    typeof window !== 'undefined'
      ? window.localStorage.getItem(AUTH_STORE_KEY)
      : null;

  const headers = (config.headers ?? {}) as any;
  config.headers = headers;

  // Default: never send Authorization unless BOTH store+persist agree.
  delete headers.Authorization;

  // If localStorage key is gone, do not send auth even if storeToken is stale.
  if (raw === null) {
    return config;
  }

  const persistedToken = getPersistedAuthToken();
  // After signout we expect the store token to be null immediately. If it isn't,
  // requiring both sources prevents stale auth headers from being sent.
  if (!persistedToken || !storeToken || persistedToken !== storeToken) {
    return config;
  }

  headers.Authorization = `Bearer ${persistedToken}`;
  return config;
});

function isAuthRequest(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes('/auth/token') || url.includes('/auth/register');
}

apiClient.interceptors.response.use(
  (response) => {
    const controller = (response.config as any)?.[controllerKey] as AbortController | undefined;
    if (controller) inFlightControllers.delete(controller);
    return response;
  },
  (error: AxiosError) => {
    const controller = (error.config as any)?.[controllerKey] as AbortController | undefined;
    if (controller) inFlightControllers.delete(controller);
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