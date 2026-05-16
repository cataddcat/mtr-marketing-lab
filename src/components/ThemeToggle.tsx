import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'mtr_theme';

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // ignore
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  return [theme, setThemeState] as const;
}

/**
 * Two-segment pill toggle. Place anywhere in the app header.
 *
 *   <ThemeToggle />
 *
 * Persists to localStorage, defaults to prefers-color-scheme.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  return (
    <div
      role="tablist"
      aria-label="Theme"
      className="inline-flex items-center rounded-pill p-0.5 gap-0 h-[30px]"
      style={{
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
      }}
    >
      <Segment active={theme === 'light'} onClick={() => setTheme('light')} icon={<Sun size={11} strokeWidth={1.5} />} label="Light" />
      <Segment active={theme === 'dark'}  onClick={() => setTheme('dark')}  icon={<Moon size={11} strokeWidth={1.5} />} label="Dark" />
    </div>
  );
}

function Segment({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-pressed={active}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1 rounded-pill border h-6 px-2.5 transition-colors font-mono text-[10.5px] tracking-[0.1em] uppercase"
      style={{
        background: active ? 'var(--color-bg)' : 'transparent',
        borderColor: active ? 'var(--color-border)' : 'transparent',
        color: active ? 'var(--color-fg-1)' : 'var(--color-fg-3)',
      }}
    >
      {icon}
      {label}
    </button>
  );
}
