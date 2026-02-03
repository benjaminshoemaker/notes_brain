import { Component, type ReactNode } from "react";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";

type ErrorBoundaryProps = {
  children: ReactNode;
  onReset?: () => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("Unexpected error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div style={{ padding: 24, maxWidth: 520 }}>
        <h1>Something went wrong</h1>
        <p>We hit an unexpected error. Try again or refresh the page.</p>
        <button type="button" onClick={this.handleReset}>
          Try again
        </button>
      </div>
    );
  }
}

export function QueryErrorBoundary({ children }: { children: ReactNode }) {
  const { reset } = useQueryErrorResetBoundary();
  return <ErrorBoundary onReset={reset}>{children}</ErrorBoundary>;
}
