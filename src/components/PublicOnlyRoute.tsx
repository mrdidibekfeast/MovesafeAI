import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getSafeRedirectPath } from '../utils/authRedirect';
import '../styles/auth-loading.css';

/*
 * The mirror of ProtectedRoute: these routes are for signed-OUT visitors
 * only (the Home landing page, Sign In, Sign Up). A signed-in user who
 * reaches one — by typing the URL, following an old link, or pressing the
 * browser back button — is sent to the dashboard instead.
 *
 * The redirect uses `replace`, so the public-only entry never stays in the
 * history stack. Without that, pressing Back would land on the same guarded
 * page and bounce forward again in a loop.
 */
function PublicOnlyRoute() {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Defensive: App already waits for the initial auth check before rendering
  // routes, so this normally never shows. It keeps the guard correct if the
  // component is ever mounted outside that gate.
  if (loading) {
    return (
      <div className="auth-loading-page" role="status" aria-live="polite">
        <div className="auth-loading-content">
          <span className="auth-loading-spinner" aria-hidden="true" />
          <p className="auth-loading-text">Checking your account…</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    // Honour a preserved destination (set by ProtectedRoute) so signing in
    // returns the user to the page they originally requested.
    return <Navigate to={getSafeRedirectPath(location.state)} replace />;
  }

  return <Outlet />;
}

export default PublicOnlyRoute;
