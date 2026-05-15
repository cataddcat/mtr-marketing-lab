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
      <div className="min-h-screen flex items-center justify-center p-6 bg-dark text-gray-100">
        <div className="max-w-md w-full bg-panel border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 text-hermes">
            <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Something went wrong</h2>
          </div>
          <p role="alert" className="text-sm text-gray-300">
            The application hit an unexpected error and could not render this view.
          </p>
          {import.meta.env.DEV && (
            <pre className="text-xs text-gray-400 bg-black/40 p-3 rounded border border-gray-800 overflow-auto max-h-40 whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.reset}
            className="w-full bg-hermes hover:bg-orange-600 text-white font-medium py-3 min-h-[44px] rounded-md flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Try again
          </button>
        </div>
      </div>
    );
  }
}
