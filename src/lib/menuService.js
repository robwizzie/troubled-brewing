import { supabase, isSupabaseConfigured } from './supabase.js';
import { MENU_ITEMS } from './seed.js';

/**
 * The single source of truth for menu data for the whole app.
 *
 * Everything that needs the menu calls getMenu() — never Supabase directly —
 * so the data source can be swapped in ONE place.
 *
 * v1: reads the owner-maintained `menu_items` table (managed in /admin).
 * Falls back to bundled seed if Supabase is unconfigured/unreachable.
 *
 * ---------------------------------------------------------------------------
 * // FUTURE: SpotOn menu sync
 * ---------------------------------------------------------------------------
 * SpotOn has NO open API. Access requires becoming an approved "Preferred
 * Integration Partner" (application + certification). Auth is OAuth2
 * client_credentials with a Client ID + Secret that CANNOT live in this static
 * bundle, and service tokens expire every 24h with no refresh token — so it
 * needs a persistent backend.
 *
 * When/if the shop justifies it (have Cat, the merchant, request API access
 * from her SpotOn rep), implement a Supabase Edge Function that:
 *   1. holds the SpotOn client secret (function secret, never client-side),
 *   2. manages the 24h service token,
 *   3. subscribes to SpotOn menu webhooks (menu:all:read),
 *   4. caches the catalog into a Postgres table.
 * Then swap ONLY the body of fetchFromSpotOn() below and point getMenu() at it.
 * The rest of the app does not change. See docs/INTEGRATIONS.md §SpotOn.
 */

const FALLBACK_NOTE = '[menuService] using bundled seed menu';

function normalize(items) {
  return [...items]
    .filter((i) => i && i.name)
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
}

export async function getMenu({ includeUnavailable = false } = {}) {
  if (!isSupabaseConfigured) {
    if (import.meta.env.DEV) console.info(FALLBACK_NOTE);
    return normalize(MENU_ITEMS);
  }
  try {
    let query = supabase.from('menu_items').select('*').order('display_order', { ascending: true });
    if (!includeUnavailable) query = query.eq('available', true);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return normalize(MENU_ITEMS);
    return normalize(data);
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[menuService] live fetch failed, falling back to seed:', err.message);
    return normalize(MENU_ITEMS);
  }
}

/** Group a flat menu list into the category order the UI expects. */
export const MENU_CATEGORY_ORDER = ['espresso', 'specialty', 'food', 'pastry', 'seasonal'];

export const MENU_CATEGORY_LABELS = {
  espresso: 'Espresso',
  specialty: 'Specialty',
  food: 'Food',
  pastry: 'Pastries',
  seasonal: 'Seasonal',
};

export function groupByCategory(items, only = MENU_CATEGORY_ORDER) {
  const groups = {};
  for (const cat of only) {
    const inCat = items.filter((i) => i.category === cat);
    if (inCat.length) groups[cat] = inCat;
  }
  return groups;
}

// eslint-disable-next-line no-unused-vars
async function fetchFromSpotOn() {
  // FUTURE: SpotOn menu sync — replace this stub with a fetch to the Supabase
  // Edge Function that proxies SpotOn's cached, webhook-fed menu. Not wired in v1.
  throw new Error('SpotOn menu sync not enabled. See // FUTURE note above.');
}
