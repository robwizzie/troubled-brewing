-- Adds the "Fresh off the counter" food shelf (section type food_showcase) to
-- the TOP of the Menu page and right under the hero on the Home page.
-- Safe to run more than once: it does nothing on a page that already has one.
-- Run in Supabase → SQL editor. (Or add it by hand: admin → Edit your site →
-- the page → "+ Add a section…" → "Food & drink shelf (photos)", then move it up.)
begin;

-- MENU: shift everything down one, put the shelf first
update sections set display_order = display_order + 1
 where page_slug = 'menu'
   and not exists (select 1 from sections where page_slug = 'menu' and type = 'food_showcase');
insert into sections (page_slug, type, display_order, data, status, visible)
select 'menu', 'food_showcase', 0,
       '{"heading": "Fresh off the counter", "subheading": "Tap anything to order it on SpotOn."}'::jsonb, 'published', true
 where not exists (select 1 from sections where page_slug = 'menu' and type = 'food_showcase');

-- HOME: right after the hero (display_order 0)
update sections set display_order = display_order + 1
 where page_slug = 'home' and display_order >= 1
   and not exists (select 1 from sections where page_slug = 'home' and type = 'food_showcase');
insert into sections (page_slug, type, display_order, data, status, visible)
select 'home', 'food_showcase', 1,
       '{"heading": "Fresh off the counter", "subheading": "Tap anything to order it on SpotOn."}'::jsonb, 'published', true
 where not exists (select 1 from sections where page_slug = 'home' and type = 'food_showcase');

commit;
