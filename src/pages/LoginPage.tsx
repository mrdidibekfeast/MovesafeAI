import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { AuthError } from '@supabase/supabase-js';
import { useAuth } from '../hooks/useAuth';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getSafeRedirectPath } from '../utils/authRedirect';
import { isValidEmail } from '../utils/authValidation';
import '../styles/auth-forms.css';
import '../styles/auth-loading.css';
import '../styles/login.css';

// Translate Supabase auth errors into friendly, non-technical messages.
// We never surface raw error text, codes, tokens, or internal objects.
function toFriendlyError(error: AuthError): string {
  const code = error.code ?? '';
  const message = error.message?.toLowerCase() ?? '';

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return 'The email or password is incorrect.';
  }
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  return 'We could not sign you in right now. Please try again.';
}

interface FormErrors {
  email?: string;
  password?: string;
  form?: string;
}

function LoginPage() {
  useDocumentTitle('Login');
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const emailRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);

  // Where to send the user after login: the route they originally requested
  // (preserved by ProtectedRoute) or the dashboard by default.
  const from = getSafeRedirectPath(location.state);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // PublicOnlyRoute handles the "already signed in" and "still loading"
  // cases before this page ever mounts, so no guard is needed here.

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Trim the email but never modify the password.
    const trimmedEmail = email.trim();
    const nextErrors: FormErrors = {};

    if (!trimmedEmail) {
      nextErrors.email = 'Please enter your email address.';
    } else if (!isValidEmail(trimmedEmail)) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (!password) {
      nextErrors.password = 'Please enter your password.';
    }

    if (nextErrors.email || nextErrors.password) {
      setErrors(nextErrors);
      // Send keyboard and screen-reader users straight to the first problem.
      if (nextErrors.email) {
        emailRef.current?.focus();
      } else {
        passwordRef.current?.focus();
      }
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const { error } = await signIn(trimmedEmail, password);

    if (error) {
      setErrors({ form: toFriendlyError(error) });
      setIsSubmitting(false);
      return;
    }

    // Success — leave isSubmitting true; the component unmounts on redirect.
    navigate(from, { replace: true });
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-panel">
          <span className="login-brand">MoveSafe AI</span>
          <h1 className="login-heading">Welcome Back</h1>
          <p className="login-description">
            Sign in to view your movement reports, compare progress, and continue
            learning.
          </p>

          {errors.form && (
            <div className="form-error" role="alert" aria-live="polite">
              {errors.form}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                Email
              </label>
              <input
                ref={emailRef}
                id="login-email"
                type="email"
                className={errors.email ? 'form-input has-error' : 'form-input'}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
              />
              {errors.email && (
                <span id="login-email-error" className="field-error">
                  {errors.email}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Password
              </label>
              <div className="password-input-wrapper">
                <input
                  ref={passwordRef}
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={errors.password ? 'form-input has-error' : 'form-input'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {errors.password && (
                <span id="login-password-error" className="field-error">
                  {errors.password}
                </span>
              )}
            </div>

            <div className="login-options">
              {/*
                Remember Me is a UI control only. Supabase persists the session
                automatically, so no custom token/password storage is needed.
              */}
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                Remember me
              </label>
              <Link to="/forgot-password" className="forgot-password-link">
                Forgot your password?
              </Link>
            </div>

            <button type="submit" className="login-button" disabled={isSubmitting}>
              {isSubmitting ? 'Signing In…' : 'Log In'}
            </button>
          </form>

          <p className="login-footer">
            Don&apos;t have an account? <Link to="/signup">Create one</Link>
          </p>

          <p className="auth-disclaimer">
            MoveSafe AI is an educational movement screening platform and is not a
            substitute for professional medical advice.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
