import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'aesthetic' | 'notion-dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'aesthetic',
      setTheme: (theme) => {
        set({ theme });
        if (typeof document !== 'undefined') {
          document.documentElement.dataset.theme = theme === 'notion-dark' ? 'notion-dark' : '';
        }
      },
    }),
    { name: 'notebud-theme' }
  )
);
