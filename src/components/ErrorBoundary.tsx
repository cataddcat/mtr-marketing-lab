import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Uncaught render error:', error, info.componentStack);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-fg-1" style={{ background: 'var(--color-bg)' }}>
        <div
          className="max-w-md w-full rounded-md p-6 space-y-4 border"
          style={{
            background: 'var(--color-bg-elevated)',
            borderColor: 'var(--color-border)',
            boxShadow: 'var(--shadow-3)',
          }}
        >
          <div className="flex items-center gap-3" style={{ color: 'var(--color-accent)' }}>
            <AlertTriangle className="w-6 h-6" strokeWidth={1.5} aria-hidden="true" />
            <h2 className="text-lg font-semibold">Something went wrong</h2>
          </div>
          <p role="alert" className="text-sm text-fg-2">
            The application hit an unexpected error and could not render this view.
          </p>
          {import.meta.env.DEV && (
            <pre
              className="text-xs text-fg-3 p-3 rounded border overflow-auto max-h-40 whitespace-pre-wrap break-words"
              style={{
                background: 'var(--color-bg-sunken)',
                borderColor: 'var(--color-border-faint)',
              }}
            >
              {error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.reset}
            className="w-full font-medium py-3 min-h-[44px] rounded-md flex items-center justify-center gap-2 transition-colors"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-accent-fg)',
            }}
          >
            <RefreshCw className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" /> Try again
          </button>
        </div>
      </div>
    );
  }
}
