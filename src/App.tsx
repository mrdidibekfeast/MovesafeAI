import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import PublicOnlyRoute from './components/PublicOnlyRoute';
import RouteFocusManager from './components/RouteFocusManager';
import { useAuth } from './hooks/useAuth';
import HomePage from './pages/HomePage';
import AnalyzePage from './pages/AnalyzePage';
import ReportDetailPage from './pages/ReportDetailPage';
import LearnPage from './pages/LearnPage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import DisclaimerPage from './pages/DisclaimerPage';
import NotFoundPage from './pages/NotFoundPage';
import './styles/auth-loading.css';

/*
 * Routes render only after Supabase has resolved the initial session.
 * Without this gate the guest navigation would flash for a returning
 * signed-in user before the session arrives, and "/" would briefly show
 * the landing page before redirecting to the dashboard.
 */
function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading-page" role="status" aria-live="polite">
        <div className="auth-loading-content">
          <span className="auth-loading-spinner" aria-hidden="true" />
          <p className="auth-loading-text">Loading MoveSafe AI…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<MainLayout />}>
        {/* Signed-out only: signed-in users are sent to the dashboard */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signin" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/sign-up" element={<SignupPage />} />
        </Route>

        {/* Public to everyone */}
        <Route path="/analyze" element={<AnalyzePage />} />
        <Route path="/report/:reportId" element={<ReportDetailPage />} />
        <Route path="/learn" element={<LearnPage />} />

        {/* Password recovery is deliberately NOT public-only: Supabase signs
            the user in with a temporary recovery session, so guarding these
            would redirect them away mid-reset. */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Signed-in only */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>

        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/disclaimer" element={<DisclaimerPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <RouteFocusManager />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
