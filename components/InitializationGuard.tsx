import React, { useState, useEffect, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface InitializationGuardProps {
  children: ReactNode;
  componentName: string;
  dependencies?: (() => Promise<boolean>)[];
  timeout?: number;
  onError?: (error: Error) => void;
}

interface InitState {
  isInitializing: boolean;
  isReady: boolean;
  error?: Error;
  retryCount: number;
}

const InitializationGuard: React.FC<InitializationGuardProps> = ({
  children,
  componentName,
  dependencies = [],
  timeout = 10000,
  onError
}) => {
  const [state, setState] = useState<InitState>({
    isInitializing: true,
    isReady: false,
    retryCount: 0,
  });

  const checkDependencies = async (): Promise<boolean> => {
    try {
      // Check if all dependencies are available
      for (const dependency of dependencies) {
        const result = await dependency();
        if (!result) {
          throw new Error('Dependency check failed');
        }
      }

      // Basic health checks
      if (typeof window === 'undefined') {
        throw new Error('Window not available');
      }

      // Check for critical browser APIs
      if (!window.Promise || !window.fetch || !window.URL) {
        throw new Error('Critical browser APIs not available');
      }

      return true;
    } catch (error) {
      console.error(`[InitGuard] ${componentName} dependency check failed:`, error);
      throw error;
    }
  };

  const initialize = async () => {
    setState(prev => ({ ...prev, isInitializing: true, error: undefined }));

    try {
      // Set a timeout for initialization
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Initialization timeout')), timeout);
      });

      // Race between initialization and timeout
      await Promise.race([
        checkDependencies(),
        timeoutPromise
      ]);

      console.log(`[InitGuard] ${componentName} initialized successfully`);
      setState({
        isInitializing: false,
        isReady: true,
        retryCount: 0,
      });

    } catch (error) {
      const initError = error instanceof Error ? error : new Error('Unknown initialization error');

      console.error(`[InitGuard] ${componentName} initialization failed:`, initError);

      if (onError) {
        onError(initError);
      }

      setState(prev => ({
        isInitializing: false,
        isReady: false,
        error: initError,
        retryCount: prev.retryCount,
      }));
    }
  };

  const handleRetry = () => {
    setState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1,
    }));
    initialize();
  };

  useEffect(() => {
    initialize();
  }, []); // Only run once on mount

  if (state.isInitializing) {
    return (
      <div className="min-h-[200px] flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-slate-600 text-sm">
            Initializing {componentName}...
          </p>
        </div>
      </div>
    );
  }

  if (!state.isReady && state.error) {
    return (
      <div className="min-h-[400px] flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-red-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-3">
            Failed to Initialize {componentName}
          </h2>

          <p className="text-slate-600 mb-6 leading-relaxed">
            {state.error.message || 'An unexpected error occurred during initialization.'}
          </p>

          {import.meta.env.DEV && (
            <details className="mb-6 text-left bg-slate-50 p-4 rounded-lg">
              <summary className="cursor-pointer font-medium text-slate-700 mb-2">
                Error Details (Development)
              </summary>
              <pre className="text-xs text-red-600 whitespace-pre-wrap overflow-auto">
                {state.error.stack || state.error.message}
              </pre>
            </details>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="primary"
              onClick={handleRetry}
              disabled={state.retryCount >= 3}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {state.retryCount >= 3 ? 'Max Retries Reached' : `Retry${state.retryCount > 0 ? ` (${state.retryCount}/3)` : ''}`}
            </Button>

            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </Button>
          </div>

          <p className="text-xs text-slate-500 mt-4">
            If this problem persists, try clearing your browser cache.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Predefined dependency checks
export const dependencyChecks = {
  // Check if PDF.js is available
  pdfjs: async (): Promise<boolean> => {
    try {
      // Try to access PDF.js - it should be loaded by service worker
      if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
        return true;
      }
      // Wait a bit and check again (service worker might still be loading)
      await new Promise(resolve => setTimeout(resolve, 1000));
      return typeof window !== 'undefined' && !!(window as any).pdfjsLib;
    } catch {
      return false;
    }
  },

  // Check if basic DOM APIs are available
  dom: async (): Promise<boolean> => {
    return typeof document !== 'undefined' &&
           typeof window !== 'undefined' &&
           !!document.createElement &&
           !!window.fetch;
  },

  // Check if Web Workers are supported
  webWorker: async (): Promise<boolean> => {
    return typeof window !== 'undefined' && !!window.Worker;
  },

  // Check if File APIs are available
  fileApi: async (): Promise<boolean> => {
    return typeof window !== 'undefined' &&
           !!window.File &&
           !!window.FileReader &&
           !!window.Blob;
  }
};

export default InitializationGuard;
