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

if (!isSupabaseConfigured && import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.info(
    '[Trouble Brewing] Supabase env not set — rendering from bundled seed content. ' +
      'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect the live CMS.'
  );
}
