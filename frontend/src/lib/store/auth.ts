import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  userId: string | null;
  username: string | null;
  setSession: (token: string, userId: string, username: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      username: null,
      setSession: (token, userId, username) => set({ token, userId, username }),
      clearSession: () => {
        set({ token: null, userId: null, username: null });
        // Ensure the persisted session does not get re-hydrated from localStorage.
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('notebud-auth');
        }
      },
    }),
    { name: 'notebud-auth' }
  )
);
