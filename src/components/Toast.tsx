import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import {
  ToastContext,
  type Toast,
  type ToastContextValue,
  type ToastKind,
} from './toast-context';

const TOAST_TTL_MS = 3500;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const timeouts = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const handle = timeouts.current.get(id);
    if (handle !== undefined) {
      clearTimeout(handle);
      timeouts.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = crypto.randomUUID();
      setToasts(prev => [...prev, { id, kind, message }]);
      const handle = window.setTimeout(() => dismiss(id), TOAST_TTL_MS);
      timeouts.current.set(id, handle);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: msg => show('success', msg),
      error: msg => show('error', msg),
      info: msg => show('info', msg),
      dismiss,
    }),
    [show, dismiss],
  );

  useEffect(() => {
    const timeoutMap = timeouts.current;
    return () => {
      timeoutMap.forEach(handle => clearTimeout(handle));
      timeoutMap.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

const KIND_META: Record<ToastKind, { Icon: typeof CheckCircle; style: CSSProperties }> = {
  success: {
    Icon: CheckCircle,
    style: {
      background: 'var(--color-success-bg)',
      color: 'var(--color-success)',
      borderColor: 'color-mix(in oklch, var(--color-success) 35%, transparent)',
    },
  },
  error: {
    Icon: AlertCircle,
    style: {
      background: 'var(--color-danger-bg)',
      color: 'var(--color-danger)',
      borderColor: 'color-mix(in oklch, var(--color-danger) 35%, transparent)',
    },
  },
  info: {
    Icon: Info,
    style: {
      background: 'var(--color-bg-elevated)',
      color: 'var(--color-fg-1)',
      borderColor: 'var(--color-border)',
    },
  },
};

interface ViewportProps {
  readonly toasts: readonly Toast[];
  readonly onDismiss: (id: string) => void;
}

const ToastViewport = ({ toasts, onDismiss }: ViewportProps) => (
  <div
    aria-live="polite"
    aria-atomic="false"
    className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] pointer-events-none"
  >
    {toasts.map(t => {
      const { Icon, style } = KIND_META[t.kind];
      return (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          className="toast-slide-in pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-md border"
          style={{ ...style, boxShadow: 'var(--shadow-3)' }}
        >
          <Icon className="w-5 h-5 shrink-0 mt-0.5" strokeWidth={1.5} aria-hidden="true" />
          <span className="flex-1 text-sm leading-snug break-words" lang="th">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="shrink-0 -mr-1 -mt-1 p-1 rounded transition-colors hover:bg-bg-hover min-w-[32px] min-h-[32px] flex items-center justify-center"
            aria-label="ปิดการแจ้งเตือน"
            style={{ color: 'inherit' }}
          >
            <X className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      );
    })}
  </div>
);
