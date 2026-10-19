import { SPOTON_ORDER_URL } from './config.js';

/* Where tapping a product takes you: that item on SpotOn when we know its
   link, otherwise the store's SpotOn order page.

   The per-item link is a menu row's `order_url` (menu_items.order_url, and
   the bundled src/data/spoton-menu.json). The daily SpotOn sync fills it
   ONLY from evidence — a link in SpotOn's own data, the URL the live order
   page opened for that item, or a confirmed pattern
   (SPOTON_ITEM_URL_TEMPLATE in scripts/sync-spoton-menu.mjs). Every product
   card, shelf item and menu row follows it; no component needs to change.

   Only an http(s) link is trusted; anything else (blank, a stray slug, a
   javascript: URL) falls back to the store page (SPOTON_ORDER_URL —
   env-overridable, see config.js), so a bad row can never strand a customer. */
export function orderUrlFor(item) {
  const own = String(item?.order_url || '').trim();
  return /^https?:\/\/[^\s/]+/i.test(own) ? own : SPOTON_ORDER_URL;
}

/* The accessible name every product order link shares, so a screen reader
   hears the same thing from a card, the shelf or a menu row. */
export const orderLabelFor = (item) => `Order ${item?.name || 'this'} on SpotOn (opens in a new tab)`;
