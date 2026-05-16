import { AlertCircle, RefreshCw, X } from 'lucide-react';

interface Props {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function InlineError({ message, onRetry, onDismiss }: Props) {
  return (
    <div
      role="alert"
      className="text-sm px-4 py-3 rounded-md flex items-start gap-3 border"
      style={{
        background: 'var(--color-danger-bg)',
        color: 'var(--color-danger)',
        borderColor: 'color-mix(in oklch, var(--color-danger) 35%, transparent)',
      }}
    >
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={1.5} aria-hidden="true" />
      <div className="flex-1 break-words">{message}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs px-3 py-2 min-h-[32px] rounded-md inline-flex items-center gap-1 shrink-0 transition-colors hover:bg-bg-hover border"
          style={{
            color: 'var(--color-danger)',
            borderColor: 'color-mix(in oklch, var(--color-danger) 35%, transparent)',
          }}
          aria-label="Retry"
        >
          <RefreshCw className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" /> Retry
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 inline-flex items-center justify-center min-h-[32px] min-w-[32px] rounded-md transition-colors hover:bg-bg-hover"
          style={{ color: 'var(--color-danger)' }}
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
