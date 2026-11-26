import { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, ACCOUNT_PATH } from '../../lib/supabase.js';

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data?.session?.user || null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
    return () => sub?.subscription?.unsubscribe();
  }, []);

  const value = {
    user,
    loading,
    configured: isSupabaseConfigured,
    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    // Emails a reset link that signs the owner in and opens "Your account".
    async sendPasswordReset(email) {
      const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}${ACCOUNT_PATH}?reset=1`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    async signOut() {
      await supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
