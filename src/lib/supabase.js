import { createClient } from '@supabase/supabase-js';

// The anon key is SAFE to ship in the client bundle — it is gated by Row Level
// Security (see supabase/schema.sql). The service_role key must NEVER appear
// client-side; it lives only in GitHub Action secrets / Edge Function secrets.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// The site is designed to work WITHOUT Supabase configured (it renders from
// src/lib/seed.js). This flag lets data functions decide whether to even try
// the network, so a missing/blank env never throws — it just falls back.
export const isSupabaseConfigured = Boolean(url && anonKey);

// The same project URL + anon key, for the one caller that can't go through
// the client: the cookieless stats beacon (src/lib/siteStats.js), which must
// work from navigator.sendBeacon on page hide.
export const SUPABASE_URL = url || '';
export const SUPABASE_ANON_KEY = anonKey || '';

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Only the admin panel uses auth; public visitors stay anonymous.
        storageKey: 'tbch-auth',
      },
    })
  : null;

/* Password reset: the emailed link signs the owner in and lands wherever the
   project's Site URL points (usually the homepage), with the session in the
   "#…type=recovery" fragment. supabase-js reads that fragment on any page and
   fires PASSWORD_RECOVERY — send the owner straight to the admin's
   "Your account" screen, where they set the new password. */
export const ACCOUNT_PATH = 'admin/account';
if (supabase && typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event) => {
    if (event !== 'PASSWORD_RECOVERY') return;
    const target = `${import.meta.env.BASE_URL}${ACCOUNT_PATH}?reset=1`;
    if (!window.location.pathname.endsWith(`/${ACCOUNT_PATH}`)) window.location.replace(target);
  });
}

if (!isSupabaseConfigured && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info(
    '[Trouble Brewing] Supabase env not set — rendering from bundled seed content. ' +
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect the live CMS.'
  );
}
