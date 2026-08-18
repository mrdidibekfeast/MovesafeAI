import { Link } from 'react-router-dom';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import '../styles/page-state.css';

/*
 * Unknown-route fallback. The invalid URL itself is never displayed — it
 * could contain sensitive query parameters. The Dashboard link is safe for
 * guests too: ProtectedRoute redirects signed-out visitors to login.
 */
function NotFoundPage() {
  useDocumentTitle('Page Not Found');

  return (
    <section className="page-section">
      <div className="layout-container">
        <div className="page-state page-state-empty">
          <h1 className="page-state-title">Page Not Found</h1>
          <p className="page-state-message">
            The page you requested does not exist or may have moved.
          </p>
          <div className="page-state-actions">
            <Link to="/" className="page-state-action">
              Go Home
            </Link>
            <Link to="/dashboard" className="page-state-action page-state-action-secondary">
              Open Dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default NotFoundPage;
