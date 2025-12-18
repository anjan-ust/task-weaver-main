import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error | null;
  info?: string | null;
};

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log to console (or to a tracking service)
    // eslint-disable-next-line no-console
    console.error("Uncaught error:", error, info);
    this.setState({ info: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded">
          <h2 className="text-lg font-semibold text-red-700">
            Something went wrong
          </h2>
          <p className="text-sm text-red-600 mt-2">
            {this.state.error?.message}
          </p>
          {this.state.info && (
            <pre className="mt-3 text-xs text-muted-foreground overflow-auto max-h-48">
              {this.state.info}
            </pre>
          )}
          <div className="mt-4 flex gap-2">
            <button
              className="px-3 py-1 rounded bg-red-600 text-white"
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

export default ErrorBoundary;
