import { Link } from 'react-router-dom';
import '../styles/page-state.css';

interface PageStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  actionRoute?: string;
  onAction?: () => void;
  tone?: 'default' | 'error' | 'empty';
}

/*
 * Reusable route-level state block for empty data, expected errors, and
 * similar situations. Pages with an established specialized state keep it;
 * this component covers the general case. Renders its title as an <h2> —
 * pages that need an <h1>-level state use the same CSS classes directly.
 */
function PageState({
  title,
  message,
  actionLabel,
  actionRoute,
  onAction,
  tone = 'default',
}: PageStateProps) {
  return (
    <div
      className={`page-state page-state-${tone}`}
      role={tone === 'error' ? 'alert' : undefined}
    >
      <h2 className="page-state-title">{title}</h2>
      <p className="page-state-message">{message}</p>
      {actionLabel && (actionRoute || onAction) && (
        <div className="page-state-actions">
          {actionRoute ? (
            <Link to={actionRoute} className="page-state-action">
              {actionLabel}
            </Link>
          ) : (
            <button type="button" className="page-state-action" onClick={onAction}>
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default PageState;
