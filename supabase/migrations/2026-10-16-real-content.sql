-- =============================================================================
-- 2026-10-16 · Real content refresh for the LIVE project
--
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query → paste →
-- Run). Every statement is guarded, so it is safe to run twice, and anything
-- the owners have already edited by hand is left alone: rows are only replaced
-- while they still read exactly like the starter placeholders.
--
-- What it does
--   1. adds the columns the live tables are missing (the 2026-10-12 backup
--      shows them gone — saving an address on a Local Love business fails
--      without them)
--   2. Local Love: swaps the three "(Owner: confirm details…)" rows for the
--      eight real Station Ave neighbours
--   3. Timeline: swaps the guessed-date starter milestones for real ones
--   4. Gallery Wall / Troublemakers: removes the invented starter rows
--   5. Gallery Wall page: opens on the explorable wall photo, like the code
--   6. Copy: the About story gets the real opening date + teas; the homepage
--      mentions breakfast is served all day (the shop's own Instagram bio)
-- =============================================================================

begin;

-- 1 · Missing columns ----------------------------------------------------------
-- Columns the tables above gained after the live project was first set up.
-- `create table if not exists` never touches an existing table, so a project
-- created from an older copy of this file is missing them (the 2026-10-12
-- backup shows exactly these gone) — and every admin save that sends one
-- fails. Re-running this file adds them. Safe to re-run.
alter table gallery_pieces   add column if not exists artist text;
alter table gallery_pieces   add column if not exists artist_url text;
alter table gallery_pieces   add column if not exists medium text;
alter table gallery_pieces   add column if not exists year_label text;
alter table gallery_pieces   add column if not exists frame_style text;
alter table gallery_pieces   add column if not exists for_sale boolean default false;
alter table team_members     add column if not exists pronouns text;
alter table team_members     add column if not exists drink text;
alter table team_members     add column if not exists started_label text;
alter table local_businesses add column if not exists logo_url text;
alter table local_businesses add column if not exists address text;
alter table local_businesses add column if not exists we_love text;
alter table google_profile   add column if not exists photos jsonb default '[]';

-- 2 · Local Love ---------------------------------------------------------------
delete from local_businesses where blurb like '%(Owner: confirm%';
insert into local_businesses (name, category, address, blurb, url, display_order)
select * from (values
  ($q$Anthony's Creative Italian Cuisine$q$, $q$restaurant$q$, $q$512 Station Ave$q$, $q$BYOB Italian right next door, in three dining rooms inside a 1930s building. Our closest neighbor by about twenty feet.$q$, $q$https://www.anthonysonstation.com/$q$, 0),
  ($q$Lula's Empanadas$q$, $q$restaurant$q$, $q$516 Station Ave$q$, $q$Contemporary Dominican empanadas from Yaslyn Lora, named after her mother — up to eighteen flavors, now from a proper Station Ave storefront. They chipped in prizes for our ninth-birthday raffle.$q$, $q$https://www.facebook.com/lulasempanadas/$q$, 1),
  ($q$Ralph's Pizza$q$, $q$restaurant$q$, $q$520 Station Ave$q$, $q$Family-run pizza on Station Ave for more than thirty years, with a back room that has hosted half the birthdays in town. They donated to our ninth-birthday raffle, too.$q$, $q$https://ralphspizzahaddonheights.com/$q$, 2),
  ($q$South Jersey Special$q$, $q$retail$q$, $q$531 Station Ave$q$, $q$Amy Murphy’s gift shop of South Jersey makers — cards, prints, jewelry and small-batch things, most of it funny, all of it local. Another of our birthday-raffle donors.$q$, $q$https://southjerseyspecial.com/$q$, 3),
  ($q$Jane's Tea House$q$, $q$cafe$q$, $q$602 Station Ave$q$, $q$Proper afternoon tea a few doors up. The one place on the street we happily send people for a hot drink.$q$, $q$https://janesteahouse.com/$q$, 4),
  ($q$Cabana Water Ice Co.$q$, $q$other$q$, $q$603 Station Ave$q$, $q$Homemade water ice and hand-dipped ice cream, going since 1989. The summer half of a Station Ave afternoon.$q$, '', 5),
  ($q$April Robin Florist & Gift$q$, $q$retail$q$, $q$620 Station Ave$q$, $q$The florist at the top of the avenue — where the flowers on our counter usually come from.$q$, $q$https://www.aprilrobinflorist.com/$q$, 6),
  ($q$John's Friendly Market$q$, $q$other$q$, $q$622 Station Ave$q$, $q$The old-fashioned neighborhood grocery and deli. Exactly the sort of place a main street stops being a main street without.$q$, '', 7)
) as v(name, category, address, blurb, url, display_order)
where not exists (select 1 from local_businesses);

-- 3 · Timeline -----------------------------------------------------------------
delete from timeline_events
 where title in ('Trouble Brewing opens its doors', 'Our first anniversary', 'The Banana Split Coffee is born')
   and sort_date in ('2021-01-01', '2022-01-01', '2023-01-01');
insert into timeline_events (date_label, sort_date, title, description, display_order)
select * from (values
  ($q$Friday the 13th · Oct 2017$q$, date '2017-10-13', $q$Trouble opens on Station Ave$q$, $q$Tom and Cat, Haddon Heights locals, open Trouble Brewing Coffee House at 514 Station Ave — on Friday the 13th, naturally. La Colombe in the grinder, breakfast all day.$q$, 0),
  ($q$December 2019$q$, date '2019-12-07', $q$The internet finds out$q$, $q$New Jersey Isn’t Boring writes Trouble up as one of the best spots around to work from a coffee shop — comfy seats, free WiFi, a shelf of books and drinks sized Trouble and Big Trouble.$q$, 1),
  ($q$October 2026$q$, date '2026-10-13', $q$Nine years of Trouble$q$, $q$A birthday raffle with prizes from our Station Ave neighbors — Lula’s Empanadas, Ralph’s Pizza, South Jersey Special and Doc’s Unique Boutique — and two birthday lattes: The Max (a dirt-cake iced latte) and The Ruby (cake batter, strawberry cold foam, sprinkles).$q$, 2),
  ($q$October 2026$q$, date '2026-10-14', $q$A Quick Bites review$q$, $q$The Retrospect stops in for its Quick Bites column and comes away talking about the cappuccino, the pumpkin spice frozen coffee and the French toast muffin — "a group favorite."$q$, 3)
) as v(date_label, sort_date, title, description, display_order)
where not exists (select 1 from timeline_events);

-- 4 · Starter gallery pieces + team placeholder -------------------------------
delete from gallery_pieces
 where title in ('The Ornate Gold One', 'Tiny Oval Mystery')
   and (story like '%showed up during the build-out%' or story like '%flea-market find from a rainy Saturday%');
delete from team_members where name = 'A Troublemaker';

-- 5 · Gallery Wall page opens on the wall --------------------------------------
update sections
   set type = 'gallery_wall_room',
       data = '{"heading": "The Gallery Wall", "intro": "Every frame on this wall arrived some other way — found, gifted, or made by somebody who drinks here. Have a proper look at any of them.", "hint": "Pick something off the wall", "image_url": ""}'::jsonb
 where page_slug = 'gallery-wall' and type = 'hero'
   and data->>'subheading' = 'Every frame has a story. Some are even true.';
update sections
   set data = data || '{"heading": "The collection, close up", "intro": "The same wall, photographed piece by piece. Where we know who made something, their name links to them."}'::jsonb
 where page_slug = 'gallery-wall' and type = 'gallery_pieces_grid' and data->>'heading' = 'The collection';

-- 6 · Copy ---------------------------------------------------------------------
update sections
   set data = jsonb_set(data, '{body_markdown}', to_jsonb($q$Tom and Cat spent years in mortgage banking before deciding the world needed one more genuinely good neighborhood coffee shop more than it needed two more bankers. Haddon Heights residents themselves, they opened Trouble Brewing at 514 Station Ave on **Friday the 13th of October, 2017** — about as on-brand an opening day as a shop called Trouble could ask for. It's been a warm, art-filled room where the coffee is serious and the vibe is not ever since.$q$::text))
 where page_slug = 'about' and type = 'rich_text'
   and data->>'body_markdown' like 'Tom and Cat spent years in mortgage banking%Trouble Brewing is the result%';
update sections
   set data = jsonb_set(data, '{body_markdown}', to_jsonb($q$We partnered with **La Colombe** because great coffee shouldn't be complicated — it should be consistent, ethical, and delicious. That partnership is the foundation we build every drink on, alongside **Metolius** teas and breakfast served all day.$q$::text))
 where page_slug = 'about' and type = 'rich_text'
   and data->>'body_markdown' = $q$We partnered with **La Colombe** because great coffee shouldn't be complicated — it should be consistent, ethical, and delicious. That partnership is the foundation we build every drink on.$q$;
update sections
   set data = jsonb_set(data, '{body_a}', to_jsonb(replace(data->>'body_a', 'plus gluten-free and vegan options.', 'plus gluten-free and vegan options. Breakfast is served all day.')))
 where page_slug = 'home' and type = 'intro_duo'
   and data->>'body_a' like '%plus gluten-free and vegan options.';

-- Social links: fill in the two the shop actually uses, only where blank.
update content_blocks
   set data = data
     || case when coalesce(data->>'facebook', '') = '' then '{"facebook": "https://www.facebook.com/tbcoffeehouse"}'::jsonb else '{}'::jsonb end
     || case when coalesce(data->>'tiktok', '') = '' then '{"tiktok": "https://www.tiktok.com/@troublebrewingcoffee"}'::jsonb else '{}'::jsonb end
 where key = 'social_links';

commit;
