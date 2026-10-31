import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';
const STORAGE_KEY = 'obraflow.theme';

interface ThemeCtx {
  theme: Theme;
  toggle: () => void;
}
const Ctx = createContext<ThemeCtx | undefined>(undefined);

function initial(): Theme {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('dark')) {
    return 'dark';
  }
  return 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const value = useMemo<ThemeCtx>(
    () => ({ theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }),
    [theme],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme deve estar dentro de ThemeProvider');
  return ctx;
}
