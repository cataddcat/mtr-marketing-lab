import { createContext, useContext } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  readonly id: string;
  readonly kind: ToastKind;
  readonly message: string;
}

export interface ToastContextValue {
  readonly show: (kind: ToastKind, message: string) => void;
  readonly success: (message: string) => void;
  readonly error: (message: string) => void;
  readonly info: (message: string) => void;
  readonly dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
