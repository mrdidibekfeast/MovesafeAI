import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../styles/auth-loading.css';

/*
 * Frontend route protection improves navigation and UX, but it is NOT a
 * security boundary. Supabase Row Level Security must protect the actual
 * database records — route guards alone do not secure stored data.
 */
function ProtectedRoute() {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Wait for Supabase to resolve the session before deciding anything, so we
  // never redirect prematurely or flash protected content.
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

  // Send unauthenticated visitors to login, remembering where they were headed.
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
