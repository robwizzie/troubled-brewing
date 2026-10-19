import { useEffect, useState } from 'react';
import { getContentBlock } from './dataService.js';
import { getMenu, pickProducts } from './menuService.js';
import { useDataVersion } from './dataVersion.js';

/* =============================================================================
   "This Week's Trouble" — which drink the site features, decided in ONE place
   so the featured-drink section and the homepage hero's "Today's Special" note
   can never name different drinks (or a drink the shop doesn't sell).

   content_blocks.featured_drink:
     item         the EXACT name of a menu item. When set, the feature is that
                  item, pulled LIVE from the menu (getMenu): its name, price,
                  description and photo, so a SpotOn price change shows up on
                  its own. The block's own description / image_url, when
                  non-empty, override the menu's words / photo for it.
     name, price  the manual fields — used only when no `item` is chosen (a
                  drink that isn't on SpotOn yet, say).
     description, image_url

   Never feature something the shop can't sell:
     · a named `item` that is missing from the menu or switched off falls back
       to the best AVAILABLE specialty item (pickProducts: one with a photo
       first, then one with words or a price)
     · with no `item`, a manual `name` that matches a menu item marked
       unavailable (the old "Banana Split Coffee" row) is treated the same way
   In a fallback the block's description / photo are NOT applied — they were
   written about a different drink.
   ============================================================================= */

const clean = (s) => String(s ?? '').trim();

/**
 * Resolve a featured_drink block against the menu (pure — easy to test).
 *
 * @param {object}   block  the featured_drink content block
 * @param {object[]} menu   menu rows, INCLUDING unavailable ones (so a switched-
 *                          off item can be told apart from a manual drink that
 *                          simply isn't on the menu)
 * @returns {{name:string, price:any, description:string, image_url:string, item:object|null}}
 *          `item` is the menu row being featured, or null for a manual drink
 */
export function resolveFeatured(block, menu) {
  const b = block || {};
  const all = menu || [];
  const available = all.filter((m) => m && m.available !== false);
  const fallback = () => pickProducts(available, { category: 'specialty', count: 1 })[0] || null;
  const fromMenu = (item, overrides) => ({
    name: item.name,
    price: item.price ?? null,
    description: (overrides && clean(b.description)) || item.description || '',
    image_url: (overrides && clean(b.image_url)) || item.image_url || '',
    item,
  });

  const named = clean(b.item);
  if (named) {
    const hit = available.find((m) => m.name === named);
    if (hit) return fromMenu(hit, true);
    const fb = fallback();
    if (fb) return fromMenu(fb, false);
  } else {
    const manual = clean(b.name);
    const switchedOff = manual && all.some((m) => m.name === manual && m.available === false);
    if (switchedOff || !manual) {
      const fb = fallback();
      if (fb) return fromMenu(fb, false);
    }
  }
  // a manual drink (or nothing on the menu to fall back to)
  return {
    name: clean(b.name),
    price: b.price ?? null,
    description: clean(b.description),
    image_url: clean(b.image_url),
    item: null,
  };
}

/** Fetch the block and the full menu, and resolve them. */
export async function loadFeatured() {
  const [block, menu] = await Promise.all([
    getContentBlock('featured_drink'),
    getMenu({ includeUnavailable: true }),
  ]);
  return resolveFeatured(block, menu);
}

/** The featured drink, live: undefined while loading, then the resolved drink.
    Re-reads when the block or the menu is edited. */
export function useFeaturedDrink() {
  const [drink, setDrink] = useState(undefined);
  const blocksVersion = useDataVersion('content_blocks');
  const menuVersion = useDataVersion('menu_items');
  useEffect(() => {
    let alive = true;
    loadFeatured().then((d) => alive && setDrink(d)).catch(() => alive && setDrink(null));
    return () => { alive = false; };
  }, [blocksVersion, menuVersion]);
  return drink;
}
