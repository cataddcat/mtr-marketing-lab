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
      className="bg-red-900/30 border border-red-900/50 text-red-200 text-sm px-4 py-3 rounded-md flex items-start gap-3"
    >
      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 break-words">{message}</div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-red-200 hover:text-white text-xs px-3 py-2 min-h-[44px] rounded border border-red-900/50 hover:bg-red-900/30 inline-flex items-center gap-1 shrink-0"
          aria-label="Retry"
        >
          <RefreshCw className="w-3 h-3" aria-hidden="true" /> Retry
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-red-300 hover:text-white shrink-0 inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
