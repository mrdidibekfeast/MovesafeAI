import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { AuthContext } from './auth-context';
import type { AuthContextValue } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Load the current session when the app starts.
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Keep context in sync whenever the user signs in or out.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sign an existing user in. Supabase persists the session automatically,
  // and onAuthStateChange (above) keeps user/session in sync afterwards.
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  }, []);

  // Register a new user. full_name is stored in the user's metadata.
  const signUp = useCallback(
    async (fullName: string, email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      // Supabase returns a user with an empty identities array when the email
      // is already registered (to avoid leaking which emails exist).
      const userMayExist =
        !error &&
        data.user !== null &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0;

      return {
        error,
        hasSession: Boolean(data.session),
        needsEmailConfirmation: !error && !data.session && !userMayExist && data.user !== null,
        userMayExist,
      };
    },
    [],
  );

  // Sign the current user out. onAuthStateChange (above) clears user/session,
  // so the UI updates through the context without a manual state change.
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  // Email the user a password reset link that returns them to /reset-password.
  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  }, []);

  // Update the password for the currently active (recovery) session.
  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    loading,
    isAuthenticated: Boolean(user),
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
