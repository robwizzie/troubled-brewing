import { supabase, isSupabaseConfigured } from './supabase.js';
import { MENU_ITEMS } from './seed.js';

/**
 * The single source of truth for menu data for the whole app.
 *
 * Everything that needs the menu calls getMenu() — never Supabase directly —
 * so the data source can be swapped in ONE place.
 *
 * Reads the `menu_items` table; falls back to the bundled snapshot
 * (src/data/spoton-menu.json via seed.js) if Supabase is unconfigured or
 * unreachable.
 *
 * ---------------------------------------------------------------------------
 * SpotOn alignment (implemented — see scripts/sync-spoton-menu.mjs)
 * ---------------------------------------------------------------------------
 * The "SpotOn menu sync" GitHub Action scrapes the shop's PUBLIC hosted
 * ordering page daily (plus on-demand) and mirrors it into `menu_items`:
 * names, prices, categories, availability, and order follow SpotOn; owner
 * descriptions, photos, and dietary tags are preserved; items that leave
 * SpotOn are hidden, never deleted. It also refreshes the bundled snapshot,
 * so this fallback tracks SpotOn too. Ordering itself stays a deep link —
 * the site only VIEWS the menu.
 *
 * Upgrade path: SpotOn's official partner API (application + certification,
 * OAuth2 secrets, 24h tokens → needs a token-broker Edge Function). If the
 * shop ever gets API access via Cat's SpotOn rep, replace the scraper inside
 * the sync script with real API calls + webhooks — nothing in the app
 * changes. See docs/INTEGRATIONS.md §SpotOn.
 */

const FALLBACK_NOTE = '[menuService] using bundled snapshot menu';

function normalize(items, { includeUnavailable = false } = {}) {
  return [...items]
    .filter((i) => i && i.name && (includeUnavailable || i.available !== false))
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
}

export async function getMenu({ includeUnavailable = false } = {}) {
  if (!isSupabaseConfigured) {
    if (import.meta.env.DEV) console.info(FALLBACK_NOTE);
    return normalize(MENU_ITEMS, { includeUnavailable });
  }
  try {
    let query = supabase.from('menu_items').select('*').order('display_order', { ascending: true });
    if (!includeUnavailable) query = query.eq('available', true);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return normalize(MENU_ITEMS, { includeUnavailable });
    return normalize(data);
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[menuService] live fetch failed, falling back to snapshot:', err.message);
    return normalize(MENU_ITEMS, { includeUnavailable });
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
