import { asset } from './config.js';

/* Where a product's photograph comes from, in one place — so the homepage
   teaser, the menu cards and anything added later all resolve a drink's
   picture identically.

   Order:
     1. the menu item's own image_url — a Menu Manager upload, or a SpotOn
        photo once the shop's SpotOn menu carries them
     2. the drop-in file public/images/drinks/<name-slug>.jpg (see that
        folder's README — the quick way to get real photos up)
   A caller walks the list on `onError` because step 2 may simply not exist
   yet, and falls back to a drawn motif rather than a broken image. */

export const slugifyDrink = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Every candidate photo for a menu item, best first. */
export function productImageSources(item) {
  return [item?.image_url, item?.name ? asset(`images/drinks/${slugifyDrink(item.name)}.jpg`) : null].filter(Boolean);
}
