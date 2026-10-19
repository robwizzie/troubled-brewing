import { SPOTON_ORDER_URL } from './config.js';

/* Where tapping a product takes you: the shop's SpotOn ordering page.

   SpotOn has no per-item deep links today, so every product goes to the
   store's order page (SPOTON_ORDER_URL — env-overridable, see config.js).
   The day per-item links exist, put them in a menu row's `order_url` and
   every product card, shelf item and menu row follows — no component needs
   to change. */
export function orderUrlFor(item) {
  const own = String(item?.order_url || '').trim();
  return own || SPOTON_ORDER_URL;
}

/* The accessible name every product order link shares, so a screen reader
   hears the same thing from a card, the shelf or a menu row. */
export const orderLabelFor = (item) => `Order ${item?.name || 'this'} on SpotOn (opens in a new tab)`;
