import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'swingedge-theme-mode';
const LEGACY_KEY = 'swingEdgeLightMode';

function readInitialMode() {
  try {
    const fresh = localStorage.getItem(STORAGE_KEY);
    if (fresh === 'auto' || fresh === 'light' || fresh === 'dark') return fresh;
    // Migration from legacy boolean toggle
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy === 'true') {
      localStorage.setItem(STORAGE_KEY, 'light');
      localStorage.removeItem(LEGACY_KEY);
      return 'light';
    }
    if (legacy === 'false') {
      localStorage.setItem(STORAGE_KEY, 'dark');
      localStorage.removeItem(LEGACY_KEY);
      return 'dark';
    }
  } catch {}
  return 'auto';
}

function resolveMode(mode) {
  if (mode === 'light' || mode === 'dark') return mode;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(readInitialMode);
  const [resolved, setResolved] = useState(() => resolveMode(readInitialMode()));

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const actual =
        mode === 'auto' ? (mq.matches ? 'dark' : 'light') : mode;
      setResolved(actual);
      const root = document.documentElement;
      root.classList.toggle('dark', actual === 'dark');
      root.setAttribute('data-theme', actual);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', actual === 'dark' ? '#0d1424' : '#F8FAF7');
      }
    };

    apply();
    try { localStorage.setItem(STORAGE_KEY, mode); } catch {}

    if (mode === 'auto') {
      const handler = () => apply();
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolved }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  return ctx || { mode: 'auto', setMode: () => {}, resolved: 'light' };
}
