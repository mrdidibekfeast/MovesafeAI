import { createContext } from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';

export interface SignUpResult {
  error: AuthError | null;
  // A session is returned when email confirmation is disabled.
  hasSession: boolean;
  // No session and a real user was created — confirmation email is required.
  needsEmailConfirmation: boolean;
  // Supabase's anti-enumeration signal that the email is likely already registered.
  userMayExist: boolean;
}

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (fullName: string, email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<{ error: AuthError | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
}

// Kept separate from the provider component so the .tsx file can export
// only components (required for React Fast Refresh / HMR).
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
