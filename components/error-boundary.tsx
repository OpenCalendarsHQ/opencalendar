"use client";

import React, { Component, ReactNode } from "react";

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
          <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-card p-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Er is iets misgegaan
              </h2>
              <p className="text-sm text-muted-foreground">
                Er is een onverwachte fout opgetreden. Probeer de pagina te
                verversen.
              </p>
            </div>

            {process.env.NODE_ENV === "development" && (
              <div className="rounded bg-destructive/10 p-3">
                <p className="mb-1 text-xs font-medium text-destructive">
                  Development Error Details:
                </p>
                <pre className="overflow-auto text-xs text-destructive">
                  {this.state.error.message}
                </pre>
                {this.state.error.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-destructive">
                      Stack trace
                    </summary>
                    <pre className="mt-2 overflow-auto text-xs text-muted-foreground">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={this.reset}
                className="flex-1 rounded bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:bg-accent-hover"
              >
                Probeer opnieuw
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 rounded border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Ververs pagina
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
