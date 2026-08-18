// Shared validation helpers for the authentication forms
// (Login, Signup, Forgot Password, Reset Password).

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email);
}

export interface PasswordChecks {
  length: boolean;
  upper: boolean;
  lower: boolean;
  number: boolean;
}

// The password rules used by both Signup and Reset Password.
export function getPasswordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
}

export function isPasswordValid(checks: PasswordChecks): boolean {
  return checks.length && checks.upper && checks.lower && checks.number;
}
