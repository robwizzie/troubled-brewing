import { SPOTON_ORDER_URL } from './config.js';
import SPOTON_MENU from '../data/spoton-menu.json';

/* Where tapping a product takes you.

   SpotOn's online ordering has NO per-item links: opening an item is a popup
   that never changes the address (checked on the live order page, Oct 2026).
   What it does have is an anchor on every menu section —
   `#group-menu-<SpotOn group id>` — and following one lands the visitor on
   that section with the item in view. So a product links to its own SpotOn
   section; anything we can't place falls back to the store page.

   Precedence:
     1. the row's own `order_url` (menu_items.order_url / the bundled JSON) —
        only if SpotOn ever gains real item links and the sync proves one;
     2. the item's SpotOn section anchor (by its SpotOn category, from the row
        or, for rows the live database holds without it, from the bundled
        SpotOn menu by name);
     3. the store page (SPOTON_ORDER_URL, env-overridable — see config.js).

   Only an http(s) `order_url` is trusted; anything else falls through, so a
   bad row can never strand a customer. */

/* SpotOn menu section → its anchor id on the order page, as SpotOn renders
   them (read from the live page's `group-menu-*` ids). The daily sync can
   refresh these into the bundled JSON's `categories[].group_id`; those win. */
const GROUP_IDS = {
  'Coffee & Espresso Drinks': '4afp2aq4tzdhtfndcdradfil2m',
  'Frozen Drinks': 'wrwq2u0horaslo3ibyzeubgyvu',
  'Tea & Other': 'ch31rwtpujfwnn1geoethgtzoy',
  Bakery: '6952bfa283da9ee06ab69f01',
  Breakfast: '6952bfa283da9ee06ab69f07',
  Lunch: '1zaggqyq4jdddm5veadff535sy',
  'Grab n Go': '6952bfa283da9ee06ab69f15',
  Retail: '6952bfa283da9ee06ab69f17',
  'Iced Coffee & Espresso Drinks': 'a1hzjzus43fplawznaz2gwrpie',
  'Iced Teas & Other': 'gstagdpalvdk1gy4252s3qsuwq',
  'Bread Choice': '1iocjcqf33enxbgycwxqoe03ia',
  'Gluten Free Sweeties': 'bbqei4w4cvcqhasgblzneuzd3y',
};
for (const c of SPOTON_MENU?.categories || []) {
  if (c?.spoton && c?.group_id) GROUP_IDS[c.spoton] = c.group_id;
}

const norm = (s) => String(s || '').trim().toLowerCase();
const CATEGORY_BY_NAME = new Map(
  (SPOTON_MENU?.items || []).filter((i) => i?.spoton_category).map((i) => [norm(i.name), i.spoton_category])
);

/** The SpotOn section anchor URL for an item, or '' when we can't place it. */
export function sectionUrlFor(item) {
  const cat = item?.spoton_category || CATEGORY_BY_NAME.get(norm(item?.name));
  const id = cat && GROUP_IDS[cat];
  return id ? `${SPOTON_ORDER_URL}#group-menu-${id}` : '';
}

export function orderUrlFor(item) {
  const own = String(item?.order_url || '').trim();
  if (/^https?:\/\/[^\s/]+/i.test(own)) return own;
  return sectionUrlFor(item) || SPOTON_ORDER_URL;
}

/* The accessible name every product order link shares, so a screen reader
   hears the same thing from a card, the shelf or a menu row. */
export const orderLabelFor = (item) => `Order ${item?.name || 'this'} on SpotOn (opens in a new tab)`;
