import { useEffect, useState } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'system');

  useEffect(() => {
    const root = document.documentElement;
    const resolved = theme === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme;
    root.classList.toggle('dark', resolved === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  return { theme, setTheme } as const;
}
