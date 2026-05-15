import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface Toast {
  readonly id: string;
  readonly kind: ToastKind;
  readonly message: string;
}

interface ToastContextValue {
  readonly show: (kind: ToastKind, message: string) => void;
  readonly success: (message: string) => void;
  readonly error: (message: string) => void;
  readonly info: (message: string) => void;
  readonly dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

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

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

const KIND_META: Record<ToastKind, { Icon: typeof CheckCircle; classes: string }> = {
  success: {
    Icon: CheckCircle,
    classes: 'bg-green-900/70 border-green-700/70 text-green-50',
  },
  error: {
    Icon: AlertCircle,
    classes: 'bg-red-900/70 border-red-700/70 text-red-50',
  },
  info: {
    Icon: Info,
    classes: 'bg-gray-800/90 border-gray-600 text-gray-100',
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
      const { Icon, classes } = KIND_META[t.kind];
      return (
        <div
          key={t.id}
          role={t.kind === 'error' ? 'alert' : 'status'}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm ${classes}`}
        >
          <Icon className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span className="flex-1 text-sm leading-snug break-words">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="shrink-0 -mr-1 -mt-1 p-1 rounded hover:bg-black/30 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="ปิดการแจ้งเตือน"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      );
    })}
  </div>
);
