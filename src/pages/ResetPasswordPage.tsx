import { useState } from 'react';
import type { FormEvent } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Link } from 'react-router-dom';
import type { AuthError } from '@supabase/supabase-js';
import { useAuth } from '../hooks/useAuth';
import { getPasswordChecks, isPasswordValid } from '../utils/authValidation';
import '../styles/auth-forms.css';
import '../styles/auth-loading.css';
import '../styles/password-reset.css';

// Friendly, non-technical messages only — never raw Supabase errors.
function toFriendlyError(error: AuthError): string {
  const code = error.code ?? '';
  const message = error.message?.toLowerCase() ?? '';
  if (
    code === 'weak_password' ||
    (message.includes('password') &&
      (message.includes('should') || message.includes('at least') || message.includes('weak')))
  ) {
    return 'Please choose a stronger password that meets all requirements.';
  }
  if (message.includes('different from the old') || message.includes('should be different')) {
    return 'Please choose a password different from your previous one.';
  }
  return 'We could not update your password right now. Please try again.';
}

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
}

function ResetPasswordPage() {
  useDocumentTitle('Reset Password');
  const { loading, isAuthenticated, updatePassword, signOut } = useAuth();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  const passwordChecks = getPasswordChecks(newPassword);
  const passwordValid = isPasswordValid(passwordChecks);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors: FieldErrors = {};
    if (!passwordValid) {
      nextErrors.password = 'Please choose a password that meets all the requirements below.';
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Please confirm your new password.';
    } else if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = 'The passwords do not match.';
    }

    if (nextErrors.password || nextErrors.confirmPassword) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const { error } = await updatePassword(newPassword);

    if (error) {
      setFormError(toFriendlyError(error));
      setIsSubmitting(false);
      return;
    }

    // Show success first, then clear the recovery session so the user must
    // re-authenticate with the new password (no page reload).
    setPasswordUpdated(true);
    setIsSubmitting(false);
    await signOut();
  };

  // 1) Wait for Supabase to resolve the recovery session.
  if (loading) {
    return (
      <div className="password-page">
        <div className="password-container">
          <div className="password-panel">
            <div className="password-loading" role="status" aria-live="polite">
              <span className="auth-loading-spinner" aria-hidden="true" />
              <p>Verifying your reset link…</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2) Success state — checked before the session guard because we sign out above.
  if (passwordUpdated) {
    return (
      <div className="password-page">
        <div className="password-container">
          <div className="password-panel password-success">
            <div className="password-success-icon" aria-hidden="true">
              ✅
            </div>
            <h1 className="password-heading">Password Updated</h1>
            <p className="password-description" role="status" aria-live="polite">
              Your password has been updated successfully. Please sign in with your new
              password.
            </p>
            <Link to="/login" className="password-button">
              Continue to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3) No valid recovery session — the link is invalid or has expired.
  if (!isAuthenticated) {
    return (
      <div className="password-page">
        <div className="password-container">
          <div className="password-panel">
            <span className="password-brand">MoveSafe AI</span>
            <h1 className="password-heading">Reset Link Problem</h1>
            <p className="password-description">
              This password reset link is invalid or has expired. Please request a new
              one.
            </p>
            <Link to="/forgot-password" className="password-button">
              Request a New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4) Valid session — show the new-password form.
  return (
    <div className="password-page">
      <div className="password-container">
        <div className="password-panel">
          <span className="password-brand">MoveSafe AI</span>
          <h1 className="password-heading">Create a New Password</h1>
          <p className="password-description">
            Choose a new password for your MoveSafe AI account.
          </p>

          {formError && (
            <div className="form-error" role="alert" aria-live="polite">
              {formError}
            </div>
          )}

          <form className="password-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="reset-new-password">
                New password
              </label>
              <div className="password-input-wrapper">
                <input
                  id="reset-new-password"
                  type={showPassword ? 'text' : 'password'}
                  className={fieldErrors.password ? 'form-input has-error' : 'form-input'}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Create a new password"
                  autoComplete="new-password"
                  required
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby="reset-password-requirements"
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
              <ul id="reset-password-requirements" className="password-requirements">
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
              <label className="form-label" htmlFor="reset-confirm-password">
                Confirm new password
              </label>
              <div className="password-input-wrapper">
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={fieldErrors.confirmPassword ? 'form-input has-error' : 'form-input'}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  required
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={
                    fieldErrors.confirmPassword ? 'reset-confirm-error' : undefined
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
                <span id="reset-confirm-error" className="field-error">
                  {fieldErrors.confirmPassword}
                </span>
              )}
            </div>

            <button type="submit" className="password-button" disabled={isSubmitting}>
              {isSubmitting ? 'Updating Password…' : 'Update Password'}
            </button>
          </form>

          <p className="password-links">
            <Link to="/login">Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
