import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ArrowLeft } from 'lucide-react';
import { Button } from './Button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
  showHomeButton?: boolean;
  componentName?: string;
}

interface ErrorState {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

const MAX_RETRIES = 3;

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorState> {
  declare props: Readonly<ErrorBoundaryProps>;
  declare setState: (
    state:
      | Partial<ErrorState>
      | ((
        prevState: Readonly<ErrorState>,
        props: Readonly<ErrorBoundaryProps>
      ) => Partial<ErrorState> | ErrorState | null),
    callback?: () => void
  ) => void;

  state: ErrorState = {
    hasError: false,
    retryCount: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, info);
  }

  private handleRetry = () => {
    const nextRetryCount = this.state.retryCount + 1;
    this.setState({
      hasError: false,
      error: undefined,
      retryCount: nextRetryCount,
    });
    this.props.onRetry?.();
  };

  private handleGoHome = () => {
    window.location.assign('/');
  };

  private handleGoBack = () => {
    window.history.back();
  };

  render() {
    const { fallback, showHomeButton = true, componentName, children } = this.props;
    const { hasError, error, retryCount } = this.state;

    if (hasError) {
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Something went wrong
            </h2>

            <p className="text-slate-600 mb-6 leading-relaxed">
              {componentName
                ? `Failed to load ${componentName}. This might be due to a network issue or temporary error.`
                : 'An unexpected error occurred while loading this page.'
              }
            </p>

            {import.meta.env.DEV && error?.message && (
              <p className="mb-4 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-700 text-left">
                {error.message}
              </p>
            )}

            {import.meta.env.DEV && error && (
              <details className="mb-6 text-left bg-slate-50 p-4 rounded-lg">
                <summary className="cursor-pointer font-medium text-slate-700 mb-2">
                  Error Details (Development)
                </summary>
                <pre className="text-xs text-red-600 whitespace-pre-wrap overflow-auto">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="primary"
                onClick={this.handleRetry}
                disabled={retryCount >= MAX_RETRIES}
                className="flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {retryCount >= MAX_RETRIES ? 'Max Retries Reached' : `Retry${retryCount > 0 ? ` (${retryCount}/${MAX_RETRIES})` : ''}`}
              </Button>

              {showHomeButton && (
                <Button
                  variant="secondary"
                  onClick={this.handleGoHome}
                  className="flex items-center gap-2"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={this.handleGoBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </Button>
            </div>

            <p className="text-xs text-slate-500 mt-4">
              If this problem persists, try refreshing the page or clearing your browser cache.
            </p>
          </div>
        </div>
      );
    }

    return <>{children}</>;
  }
}

// HOC for easier usage with lazy components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary componentName={componentName} fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for manual error handling
export function useErrorHandler() {
  return (error: Error, errorInfo?: { componentStack?: string }) => {
    console.error('[useErrorHandler]', error, errorInfo);

    // Could dispatch to error reporting service
    if (import.meta.env.PROD) {
      // Send to error reporting
    }
  };
}
