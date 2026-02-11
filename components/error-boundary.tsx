"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree and displays a fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console (in production, send to error tracking service like Sentry)
    console.error("Error Boundary caught an error:", error, errorInfo);

    // TODO: Send to error tracking service
    // if (process.env.NODE_ENV === "production") {
    //   Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    // }
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }

      // Default fallback UI
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-500/10 p-3">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Er is iets misgegaan
                </h2>
                <p className="text-sm text-muted-foreground">
                  De applicatie heeft een onverwachte fout ondervonden
                </p>
              </div>
            </div>

            {process.env.NODE_ENV === "development" && (
              <div className="space-y-2">
                <details className="rounded-md border border-border bg-muted/30 p-3">
                  <summary className="cursor-pointer text-sm font-medium text-foreground">
                    Foutdetails (alleen zichtbaar in development)
                  </summary>
                  <div className="mt-2 space-y-2">
                    <div className="rounded bg-background p-2">
                      <p className="text-xs font-mono text-red-600 dark:text-red-400">
                        {this.state.error.message}
                      </p>
                    </div>
                    {this.state.error.stack && (
                      <div className="rounded bg-background p-2">
                        <pre className="overflow-auto text-xs font-mono text-muted-foreground max-h-48">
                          {this.state.error.stack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.reset}
                className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Probeer opnieuw
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center justify-center gap-2 rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <RefreshCw className="h-4 w-4" />
                Herlaad pagina
              </button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Als dit probleem aanhoudt, neem dan contact op met support
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Compact error boundary for smaller components
 */
export function CompactErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="flex items-center justify-center p-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-600 dark:text-red-400">
                Deze component kon niet worden geladen
              </p>
            </div>
            {process.env.NODE_ENV === "development" && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-500 font-mono">
                {error.message}
              </p>
            )}
            <button
              onClick={reset}
              className="mt-2 text-xs text-red-600 hover:text-red-700 underline"
            >
              Probeer opnieuw
            </button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
