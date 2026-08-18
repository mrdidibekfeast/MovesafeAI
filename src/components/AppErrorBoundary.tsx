import { Component } from 'react';
import type { ReactNode } from 'react';
import '../styles/app-error.css';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/*
 * Application-wide error boundary (class component — React error boundaries
 * require class lifecycle methods). Catches unexpected rendering errors and
 * shows a safe fallback instead of a blank page.
 *
 * The fallback never exposes stack traces, raw error messages, tokens,
 * environment values, user IDs, or report data. Expected failures (missing
 * reports, storage problems, network errors) are handled inside each page —
 * this boundary is only the last line of defense.
 */
class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(): void {
    // Generic message only — never the raw error object in any environment.
    if (import.meta.env.DEV) {
      console.error(
        'MoveSafe AI: an unexpected rendering error was caught by the application error boundary.',
      );
    }
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Plain <a> for Go Home: the router itself may be part of what failed.
    return (
      <div className="app-error-page">
        <div className="app-error-panel" role="alert">
          <h1 className="app-error-title">Something Went Wrong</h1>
          <p className="app-error-message">
            MoveSafe AI encountered an unexpected problem. Your stored reports
            have not been removed.
          </p>
          <div className="app-error-actions">
            <button type="button" className="app-error-button" onClick={this.handleReload}>
              Reload Page
            </button>
            <a className="app-error-home-link" href="/">
              Go Home
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
