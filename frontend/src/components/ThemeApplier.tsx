"use client"

import { useEffect } from 'react';
import { useThemeStore } from '../lib/store/theme';

export default function ThemeApplier() {
  const theme = useThemeStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'notion-dark' ? 'notion-dark' : '';
  }, [theme]);
  return null;
}
