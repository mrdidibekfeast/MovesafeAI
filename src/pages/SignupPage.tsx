import { useState } from 'react';
import type { FormEvent } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { SignUpResult } from '../context/auth-context';
import { getPasswordChecks, isPasswordValid, isValidEmail } from '../utils/authValidation';
import '../styles/auth-forms.css';
import '../styles/auth-loading.css';
import '../styles/signup.css';

// Turn a signup result into a friendly, non-technical message.
// Raw error text, codes, tokens, and response objects are never surfaced.
function toFriendlyError(result: SignUpResult): string {
  if (result.userMayExist) {
    return 'An account with this email may already exist. Try signing in instead.';
  }

  const error = result.error;
  const code = error?.code ?? '';
  const message = error?.message?.toLowerCase() ?? '';

  if (
    code === 'user_already_exists' ||
    message.includes('already registered') ||
    message.includes('already been registered')
  ) {
    return 'An account with this email may already exist. Try signing in instead.';
  }
  if (
    code === 'weak_password' ||
    (message.includes('password') &&
      (message.includes('should') || message.includes('at least') || message.includes('weak')))
  ) {
    return 'Please choose a stronger password that meets all requirements.';
  }
  if (code.includes('rate') || error?.status === 429 || message.includes('rate limit')) {
    return 'Too many signup attempts were made. Please wait and try again.';
  }
  return 'We could not create your account right now. Please try again.';
}

interface FieldErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
}

function SignupPage() {
  useDocumentTitle('Create Account');
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [signupComplete, setSignupComplete] = useState(false);
  const [confirmationRequired, setConfirmationRequired] = useState(false);

  const passwordChecks = getPasswordChecks(password);
  const passwordValid = isPasswordValid(passwordChecks);

  // PublicOnlyRoute handles the "already signed in" and "still loading"
  // cases before this page ever mounts, so no guard is needed here.

  const submittedEmail = email.trim().toLowerCase();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return; // guard against duplicate requests

    const trimmedName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const nextErrors: FieldErrors = {};

    if (trimmedName.length < 2) {
      nextErrors.fullName = 'Please enter your full name.';
    }
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (!passwordValid) {
      nextErrors.password = 'Please choose a password that meets all the requirements below.';
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your password.';
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'The passwords do not match.';
    }
    if (!acceptedTerms) {
      nextErrors.terms = 'Please agree to the Terms of Use and Privacy Policy.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      // Move focus to the first invalid field, in visual order.
      const focusOrder: [string | undefined, string][] = [
        [nextErrors.fullName, 'signup-name'],
        [nextErrors.email, 'signup-email'],
        [nextErrors.password, 'signup-password'],
        [nextErrors.confirmPassword, 'signup-confirm'],
        [nextErrors.terms, 'signup-terms'],
      ];
      const firstInvalid = focusOrder.find(([error]) => error);
      if (firstInvalid) {
        document.getElementById(firstInvalid[1])?.focus();
      }
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const result = await signUp(trimmedName, normalizedEmail, password);

    if (result.error || result.userMayExist) {
      setFormError(toFriendlyError(result));
      setIsSubmitting(false);
      return;
    }

    if (result.hasSession) {
      // Session created immediately (email confirmation disabled) — go straight in.
      navigate('/dashboard', { replace: true });
      return;
    }

    // Signup succeeded but a confirmation email must be opened first.
    setConfirmationRequired(true);
    setSignupComplete(true);
    setIsSubmitting(false);
  };

  if (signupComplete && confirmationRequired) {
    return (
      <div className="signup-page">
        <div className="signup-container">
          <div className="signup-panel signup-success">
            <div className="signup-success-icon" aria-hidden="true">
              ✉️
            </div>
            <h1 className="signup-heading">Check Your Email</h1>
            <p className="signup-description">
              We sent a confirmation link to your email address. Open the link to
              activate your account, then return to MoveSafe AI and sign in.
            </p>
            <span className="signup-success-email">{submittedEmail}</span>
            <Link to="/login" className="signup-button">
              Go to Login
            </Link>
            <button
              type="button"
              className="signup-back-button"
              onClick={() => {
                setSignupComplete(false);
                setConfirmationRequired(false);
              }}
            >
              Entered the wrong email? Go back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="signup-page">
      <div className="signup-container">
        <div className="signup-panel">
          <span className="signup-brand">MoveSafe AI</span>
          <h1 className="signup-heading">Create Your Account</h1>
          <p className="signup-description">
            Create an account to save movement reports, compare progress, and access
            your personal dashboard.
          </p>

          {formError && (
            <div className="form-error" role="alert" aria-live="polite">
              {formError}
            </div>
          )}

          <form className="signup-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="signup-name">
                Full name
              </label>
              <input
                id="signup-name"
                type="text"
                className={fieldErrors.fullName ? 'form-input has-error' : 'form-input'}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Jordan Rivera"
                autoComplete="name"
                required
                aria-invalid={Boolean(fieldErrors.fullName)}
                aria-describedby={fieldErrors.fullName ? 'signup-name-error' : undefined}
              />
              {fieldErrors.fullName && (
                <span id="signup-name-error" className="field-error">
                  {fieldErrors.fullName}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-email">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                className={fieldErrors.email ? 'form-input has-error' : 'form-input'}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
              />
              {fieldErrors.email && (
                <span id="signup-email-error" className="field-error">
                  {fieldErrors.email}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-password">
                Password
              </label>
              <div className="password-input-wrapper">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  className={fieldErrors.password ? 'form-input has-error' : 'form-input'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  required
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby="signup-password-requirements"
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
              {fieldErrors.password && (
                <span className="field-error">{fieldErrors.password}</span>
              )}
              <ul id="signup-password-requirements" className="password-requirements">
                <li className={passwordChecks.length ? 'password-requirement met' : 'password-requirement'}>
                  At least 8 characters
                </li>
                <li className={passwordChecks.upper ? 'password-requirement met' : 'password-requirement'}>
                  One uppercase letter
                </li>
                <li className={passwordChecks.lower ? 'password-requirement met' : 'password-requirement'}>
                  One lowercase letter
                </li>
                <li className={passwordChecks.number ? 'password-requirement met' : 'password-requirement'}>
                  One number
                </li>
              </ul>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="signup-confirm">
                Confirm password
              </label>
              <div className="password-input-wrapper">
                <input
                  id="signup-confirm"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={fieldErrors.confirmPassword ? 'form-input has-error' : 'form-input'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  required
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={
                    fieldErrors.confirmPassword ? 'signup-confirm-error' : undefined
                  }
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={
                    showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                  }
                  aria-pressed={showConfirmPassword}
                >
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <span id="signup-confirm-error" className="field-error">
                  {fieldErrors.confirmPassword}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="terms-agreement">
                <input
                  id="signup-terms"
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  required
                  aria-invalid={Boolean(fieldErrors.terms)}
                  aria-describedby={fieldErrors.terms ? 'signup-terms-error' : undefined}
                />
                <span>
                  I agree to the <Link to="/terms">Terms of Use</Link> and{' '}
                  <Link to="/privacy">Privacy Policy</Link>.
                </span>
              </label>
              {fieldErrors.terms && (
                <span id="signup-terms-error" className="field-error">
                  {fieldErrors.terms}
                </span>
              )}
            </div>

            <button type="submit" className="signup-button" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>

          <p className="signup-footer">
            Already have an account? <Link to="/login">Sign in</Link>
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

export default SignupPage;
