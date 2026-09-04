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
    // eslint-disable-next-line no-console
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
    // eslint-disable-next-line no-console
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

/* Dietary tag → the short badge shown on a card or a menu row. Lives here so
   the menu page and the homepage product cards label a vegan drink the same. */
export const DIETARY_LABELS = { 'gluten-free': 'GF', vegan: 'VG', vegetarian: 'V', 'dairy-free': 'DF' };

/** True once anything on the menu carries a photo — what the 'auto' menu
    layout keys off, so the page flips to photo cards the day SpotOn (or the
    owner) starts giving items pictures, with nothing to change here. */
export const hasProductPhotos = (items) => (items || []).some((i) => i.image_url);

/**
 * The products a teaser should feature.
 *
 * Named picks win and keep the owner's order. Otherwise we lead with a
 * category (specialty by default) and prefer items that have something to
 * show — a photo first, then a description or a price — because a card with a
 * bare name and nothing else is a worse advert than no card. If that category
 * is too thin, the rest of the menu (same rules) tops it up, so the row is
 * never short of the count the owner asked for.
 */
export function pickProducts(all, { names, category = 'specialty', count = 3 } = {}) {
  if (Array.isArray(names) && names.length) {
    return names.map((n) => all.find((m) => m.name === n)).filter(Boolean).slice(0, count);
  }
  const worth = (m) => (m.image_url ? 2 : 0) + ((m.description || '').trim() || m.price != null ? 1 : 0);
  const rank = (list) => [...list].sort((a, b) => worth(b) - worth(a));
  const inCat = all.filter((m) => m.category === category);
  const picks = rank(inCat).filter((m) => worth(m) > 0);
  const pool = picks.length >= count ? picks : [...picks, ...inCat.filter((m) => !picks.includes(m))];
  if (pool.length >= count) return pool.slice(0, count);
  const rest = rank(all.filter((m) => m.category !== category)).filter((m) => worth(m) > 0);
  return [...pool, ...rest].slice(0, count);
}

export function groupByCategory(items, only = MENU_CATEGORY_ORDER) {
  const groups = {};
  for (const cat of only) {
    const inCat = items.filter((i) => i.category === cat);
    if (inCat.length) groups[cat] = inCat;
  }
  return groups;
}
