import '../styles/page-state.css';

interface LoadingStateProps {
  message?: string;
  compact?: boolean;
}

// Reusable, announced loading indicator. The text carries the meaning, so
// the spinner can stop animating under prefers-reduced-motion.
function LoadingState({ message = 'Loading…', compact = false }: LoadingStateProps) {
  return (
    <div
      className={compact ? 'loading-state loading-state-compact' : 'loading-state'}
      role="status"
      aria-live="polite"
    >
      <span className="loading-state-spinner" aria-hidden="true" />
      <p className="loading-state-message">{message}</p>
    </div>
  );
}

export default LoadingState;
