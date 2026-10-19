-- =============================================================================
-- 2026-10-19 · "This Week's Trouble" features a REAL menu item
--
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query → paste →
-- Run). Every statement is guarded, so it is safe to run twice, and anything
-- the owners have already changed by hand is left alone: a row is only
-- replaced while it still reads like the old placeholder.
--
-- What it does
--   1. featured_drink: was the manual "Banana Split Coffee" — an item SpotOn
--      has switched off. It now names a real menu item by its exact name
--      (`item`), which the site pulls live from the menu (src/lib/featured.js):
--      Iced Matcha Latte. Inserted if the row is missing.
--   2. staff_picks: the community-board picks still named the Banana Split
--      and "Cranberry Walnut Chicken Salad Panini" (now "Cranberry Walnut
--      Chicken Salad" on SpotOn). Replaced only while they read exactly like
--      the old starter value.
--   3. Food shelf: its line under the heading now says the items order on
--      SpotOn (they link there). Only rows still carrying the old line change;
--      a row with no subheading already shows the new default from the code.
-- =============================================================================

begin;

-- 1 · Featured drink ---------------------------------------------------------
insert into content_blocks (key, data, status)
values ('featured_drink',
        '{"item": "Iced Matcha Latte", "description": "Iced matcha over cold milk, finished with a fresh strawberry."}'::jsonb,
        'published')
on conflict (key) do nothing;

update content_blocks
   set data = '{"item": "Iced Matcha Latte", "description": "Iced matcha over cold milk, finished with a fresh strawberry."}'::jsonb
 where key = 'featured_drink'
   and coalesce(data->>'item', '') = ''
   and coalesce(data->>'name', '') in ('', 'Banana Split Coffee');

-- 2 · Community board picks ---------------------------------------------------
update content_blocks
   set data = '{"items": [{"label": "Flying off the menu", "value": "Cranberry Walnut Chicken Salad"}, {"label": "This week''s feature", "value": "Iced Matcha Latte"}]}'::jsonb
 where key = 'staff_picks'
   and data = '{"items": [{"label": "Flying off the menu", "value": "Cranberry Walnut Chicken Salad Panini"}, {"label": "Barista''s pick", "value": "Banana Split Coffee"}]}'::jsonb;

-- 3 · Food shelf line ----------------------------------------------------------
update sections
   set data = jsonb_set(data, '{subheading}', '"Tap anything to order it on SpotOn."'::jsonb)
 where type = 'food_showcase'
   and data->>'subheading' = 'Tap anything to find it on the menu.';

commit;
