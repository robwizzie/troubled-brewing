-- =============================================================================
-- 2026-10-19 · Per-item SpotOn links: menu_items.order_url
--
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query → paste →
-- Run). Guarded, so it is safe to run twice.
--
-- What it does
--   Adds menu_items.order_url (text, nullable): the SpotOn URL that opens THAT
--   item. The daily "SpotOn menu sync" fills it only from evidence (a link in
--   SpotOn's own data, the URL the live order page opened for the item, or a
--   confirmed SPOTON_ITEM_URL_TEMPLATE — see scripts/sync-spoton-menu.mjs).
--   Empty = the site links the store's SpotOn order page, exactly as today
--   (src/lib/order.js · orderUrlFor).
--
--   Until this runs, the sync detects the column is missing and simply skips
--   writing it (links still reach the bundled snapshot), so nothing breaks.
-- =============================================================================

alter table if exists public.menu_items
  add column if not exists order_url text;

comment on column public.menu_items.order_url is
  'SpotOn deep link for this item (filled by scripts/sync-spoton-menu.mjs). Empty = link the store order page.';
