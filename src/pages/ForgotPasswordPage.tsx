import { useState } from 'react';
import type { FormEvent } from 'react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Link } from 'react-router-dom';
import type { AuthError } from '@supabase/supabase-js';
import { useAuth } from '../hooks/useAuth';
import { isValidEmail } from '../utils/authValidation';
import '../styles/auth-forms.css';
import '../styles/password-reset.css';

// Friendly, non-technical messages only — never raw Supabase errors.
function toFriendlyError(error: AuthError): string {
  const code = error.code ?? '';
  const message = error.message?.toLowerCase() ?? '';
  if (error.status === 429 || code.includes('rate') || message.includes('rate limit')) {
    return 'Too many reset attempts were made. Please wait and try again.';
  }
  return 'We could not send the reset link right now. Please try again.';
}

function ForgotPasswordPage() {
  useDocumentTitle('Forgot Password');
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const submittedEmail = email.trim().toLowerCase();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      setFormError('Please enter a valid email address.');
      // Send focus back to the only field so the correction is immediate.
      document.getElementById('reset-email')?.focus();
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    const { error } = await requestPasswordReset(normalizedEmail);

    if (error) {
      // Only claim success when Supabase did not return an error.
      setFormError(toFriendlyError(error));
      setIsSubmitting(false);
      return;
    }

    setEmailSent(true);
    setIsSubmitting(false);
  };

  if (emailSent) {
    return (
      <div className="password-page">
        <div className="password-container">
          <div className="password-panel password-success">
            <div className="password-success-icon" aria-hidden="true">
              ✉️
            </div>
            <h1 className="password-heading">Check Your Email</h1>
            <p className="password-description">
              If an account exists for this email address, a password reset link has
              been sent. Open the link to choose a new password.
            </p>
            <span className="password-success-email">{submittedEmail}</span>
            <Link to="/login" className="password-button">
              Back to Login
            </Link>
            <button
              type="button"
              className="password-text-button"
              onClick={() => {
                setEmailSent(false);
                setFormError(null);
              }}
            >
              Use a different email address
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="password-page">
      <div className="password-container">
        <div className="password-panel">
          <span className="password-brand">MoveSafe AI</span>
          <h1 className="password-heading">Reset Your Password</h1>
          <p className="password-description">
            Enter the email address connected to your account, and we will send you a
            password reset link.
          </p>

          {formError && (
            <div id="reset-email-error" className="form-error" role="alert" aria-live="polite">
              {formError}
            </div>
          )}

          <form className="password-form" onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="reset-email">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                className={formError ? 'form-input has-error' : 'form-input'}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                aria-invalid={Boolean(formError)}
                aria-describedby={formError ? 'reset-email-error' : undefined}
              />
            </div>

            <button type="submit" className="password-button" disabled={isSubmitting}>
              {isSubmitting ? 'Sending Link…' : 'Send Reset Link'}
            </button>
          </form>

          <p className="password-links">
            Remembered it? <Link to="/login">Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
