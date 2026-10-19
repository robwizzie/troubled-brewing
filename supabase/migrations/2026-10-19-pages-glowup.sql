-- Pages glow-up: About, Our Story So Far (/timeline), Location, Events and
-- Troublemakers told with the shop's own photographs (Alex McDonnell's shoot +
-- the owners' storefront photos, served from /images/pages/ in the site build)
-- hung in the gallery wall's frames. Mirrors src/lib/seed.js.
--
-- New section types: photo_hero, photo_story, pull_quote, photo_mosaic,
-- visit_panel (renderers in src/components/sections/, editors in
-- src/admin/editors/schemas.js). The plain `cta` gains an optional photo, and
-- rich_text gains a "note" look (used for Parking).
--
-- KEEPS OWNER COPY: existing rows are converted IN PLACE with the new photo
-- fields merged UNDER the current data (`new || data`, so every key the owner
-- already has wins) — headings, body text and buttons stay word for word.
-- A row is only touched when it still has the shape we seeded: the expected
-- type and heading, no unpublished draft (draft_data is null), and for heroes
-- no background photo of the owner's own. Anything else is left alone.
--
-- Nothing is deleted. On Location the old `hours` block is HIDDEN (visible =
-- false) once the map has become the visit panel, which shows the same live
-- hours beside the map — unhide it in the editor if you want it back.
--
-- The fox reads two of these rows by type, so they stay that type: the
-- Location "Parking" rich_text (its answer to "Where do I park?") and the
-- Events cta that links to /contact (its "can I host something?" answer).
--
-- Safe to run more than once: each page is skipped when it already has a
-- photo_hero (i.e. it has been glowed-up, by this file or by hand).
-- Run in Supabase -> SQL editor.

begin;

-- ---------------------------------------------------------------- ABOUT ----
do $$
begin
  if not exists (select 1 from sections where page_slug = 'about' and type = 'photo_hero') then
    update sections set display_order = display_order * 10 where page_slug = 'about';

    -- the plain hero becomes the photo hero; the owner's heading, subheading
    -- and button (whatever they say now) are kept, the photo fields are added
    update sections set type = 'photo_hero', data = $j${"eyebrow": "Since Friday the 13th, October 2017", "image_url": "/images/pages/room-fox-sign.jpg", "image_alt": "Inside Trouble Brewing: the round brass sign of the top-hatted fox leaning against the counter between potted plants, under a white pressed-tin ceiling", "caption": "Inside 514 Station Ave", "frame_style": "gilt-grand", "layout": "framed", "secondary_label": "Plan a visit", "secondary_url": "/location"}$j$::jsonb || data
     where page_slug = 'about' and type = 'hero' and draft_data is null
       and coalesce(data->>'background_image_url', '') = '';

    -- "Two bankers walk into a coffee shop" → a story chapter with the front door
    update sections set type = 'photo_story', data = $j${"eyebrow": "Chapter one", "image_url": "/images/pages/storefront-door.jpg", "image_alt": "The front of Trouble Brewing Coffee House: a black door numbered 514 under the TROUBLE BREWING sign, with bistro chairs on the sidewalk", "caption": "514 Station Ave", "frame_style": "black-mat", "image_side": "right", "inset_url": "/images/pages/wall-detail.jpg", "inset_alt": "Close-up of the gallery wall: framed prints, a gold fox head, a pumpkin in an oval frame and a silhouette, all on sage green", "inset_frame": "oval-gilt", "tone": "paper"}$j$::jsonb || (data - 'variant')
     where page_slug = 'about' and type = 'rich_text' and draft_data is null
       and data->>'heading' = 'Two bankers walk into a coffee shop';

    -- "Why La Colombe" / "What's in the cup" → the what-we-pour photo row; the
    -- owner's heading stays and their body text becomes its intro
    update sections set type = 'photo_mosaic',
           data = $j${"eyebrow": "What we pour", "badges": ["La Colombe coffee", "Metolius tea"], "layout": "strip", "tone": "sage", "images": [{"url": "/images/pages/espresso-pull.jpg", "alt": "Espresso pouring from the machine into a small glass", "caption": "Pulled to order"}, {"url": "/images/pages/latte-art.jpg", "alt": "A latte with a leaf poured in the foam, in a black textured mug on a wooden table", "caption": "Latte art"}, {"url": "/images/pages/iced-matcha.jpg", "alt": "An Iced Matcha Latte: bright green matcha over milk in a tall glass, finished with a fresh strawberry", "caption": "Iced Matcha Latte"}, {"url": "/images/pages/iced-coffee-tb-glass.jpg", "alt": "Iced coffee and milk in a glass printed with the Trouble Brewing fox, with a bamboo lid and a glass straw", "caption": "Iced, in a Trouble glass"}]}$j$::jsonb
                  || jsonb_strip_nulls(jsonb_build_object('heading', data->'heading', 'intro', data->'body_markdown'))
     where page_slug = 'about' and type = 'rich_text' and draft_data is null
       and data->>'heading' in ('Why La Colombe', 'What''s in the cup');

    -- "Why local matters" → a story chapter with the shop corner + Local Love link
    update sections set type = 'photo_story', data = $j${"eyebrow": "Chapter two", "image_url": "/images/pages/retail-corner.jpg", "image_alt": "The shop corner: La Colombe coffee and Trouble Brewing tumblers on a black shelf, a Trouble Brewing long-sleeve under a gold fox head, and snacks on a wooden stand", "caption": "La Colombe to take home", "frame_style": "bronze-carved", "image_side": "left", "link_label": "Meet our Station Ave neighbors", "link_url": "/neighborhood", "tone": "paper"}$j$::jsonb || (data - 'variant')
     where page_slug = 'about' and type = 'rich_text' and draft_data is null
       and data->>'heading' = 'Why local matters';

    -- new: a real Google review as a pull quote (after the story), a photo
    -- wall of the room, and a visit/order panel to close

    insert into sections (page_slug, type, display_order, data, status, visible)
    values ('about', 'pull_quote', 15, $j${"quote": "This shop is cozy, clearly loved by locals, and has plenty of seating without feeling overcrowded. Chosen decor includes foxes and mushrooms and adds the right touch of whimsy.", "attribution": "Hazel Stjernelys", "source": "Google review"}$j$::jsonb, 'published', true);

    insert into sections (page_slug, type, display_order, data, status, visible)
    values ('about', 'photo_mosaic', 1000, $j${"heading": "Have a look around", "intro": "The green-walled, art-covered room our regulars call a second home.", "layout": "salon", "tone": "paper", "images": [{"url": "/images/pages/wall-and-bar.jpg", "alt": "A corner of the gallery wall — gilt and black frames and a gold fox head — above the self-serve station with dried flowers, cups and sweeteners"}, {"url": "/images/pages/chalkboard-counter.jpg", "alt": "Behind the counter: a chalkboard of seasonal drinks beside the espresso machine, stacks of cups, and the big menu board on the wall"}, {"url": "/images/pages/fox-planter.jpg", "alt": "A fox-shaped planter with a spider plant on the counter, with the seating area and green walls of the shop beyond"}, {"url": "/images/pages/pastry-counter.jpg", "alt": "The counter: a pastry case full of muffins, scones and croissants under a hand-lettered bakery chalkboard and a gold TB sign"}, {"url": "/images/pages/wall-corner.jpg", "alt": "More of the gallery wall: framed sketches, a small red cross-stitch and black-and-white photographs on the green wall"}]}$j$::jsonb, 'published', true);

    insert into sections (page_slug, type, display_order, data, status, visible)
    values ('about', 'cta', 1001, $j${"eyebrow": "514 Station Ave · Haddon Heights", "heading": "Pull up a chair", "body": "Breakfast is served all day. Order ahead on SpotOn and we’ll have it ready — or come in and stay a while.", "button_label": "Order Now", "button_url": "", "secondary_label": "Hours & directions", "secondary_url": "/location", "image_url": "/images/pages/scone-on-a-book.jpg", "image_alt": "A scone on a black plate and a warm drink in a glass mug, set on a hardback book", "frame_style": "gold-botanical"}$j$::jsonb, 'published', true);

    update sections s set display_order = r.n - 1
      from (select id, row_number() over (order by display_order, id) as n from sections where page_slug = 'about') r
     where s.id = r.id;
  end if;
end $$;

-- --------------------------------------------------------------- EVENTS ----
do $$
begin
  if not exists (select 1 from sections where page_slug = 'events' and type = 'photo_hero') then

    -- the plain hero becomes the photo hero; the owner's heading, subheading
    -- and button (whatever they say now) are kept, the photo fields are added
    update sections set type = 'photo_hero', data = $j${"image_url": "/images/pages/fox-planter.jpg", "image_alt": "A fox-shaped planter with a spider plant on the counter, with the seating area and green walls of the shop beyond", "layout": "full", "focus": "center 40%"}$j$::jsonb || data
     where page_slug = 'events' and type = 'hero' and draft_data is null
       and coalesce(data->>'background_image_url', '') = '';

    -- the events list: poster cards are automatic; add the empty-state photo
    -- and switch on the past-events photo wall
    update sections set data = $j${"empty_message": "New events go up here as soon as they’re planned — check back soon, or follow along on Instagram.", "empty_image_url": "/images/pages/wall-and-bar.jpg", "empty_image_alt": "A corner of the gallery wall — gilt and black frames and a gold fox head — above the self-serve station with dried flowers, cups and sweeteners", "instagram_handle": "troublebrewingcoffee", "show_past": true, "past_heading": "Lately at Trouble"}$j$::jsonb || data
     where page_slug = 'events' and type = 'events_list' and draft_data is null;

    -- "Want to host something?" gets its photo panel (still a cta row)
    update sections set data = $j${"eyebrow": "Catering & private gatherings", "secondary_label": "Call (856) 617-6638", "secondary_url": "tel:+18566176638", "image_url": "/images/pages/table-spread.jpg", "image_alt": "Sandwiches and chips on white plates across a wooden table, seen from above", "frame_style": "black-mat"}$j$::jsonb || data
     where page_slug = 'events' and type = 'cta' and draft_data is null
       and coalesce(data->>'image_url', '') = '' and data->>'button_url' = '/contact';
  end if;
end $$;

-- ------------------------------------------------------------- LOCATION ----
do $$
declare
  v_hours_heading text;
begin
  if not exists (select 1 from sections where page_slug = 'location' and type = 'photo_hero') then
    update sections set display_order = display_order * 10 + 100 where page_slug = 'location';

    -- a photo hero of the storefront: convert a plain hero if there is one,
    -- otherwise add one at the top

    -- the plain hero becomes the photo hero; the owner's heading, subheading
    -- and button (whatever they say now) are kept, the photo fields are added
    update sections set type = 'photo_hero', data = $j${"eyebrow": "514 Station Ave · Haddon Heights, NJ", "image_url": "/images/pages/storefront-wide.jpg", "image_alt": "The white panelled shopfront of Trouble Brewing Coffee House on Station Ave — black door, big windows, the TROUBLE BREWING sign above and bistro tables out front", "layout": "full", "focus": "center 60%", "cta_label": "Get directions", "cta_url": "https://maps.google.com/maps?q=514%20Station%20Ave%2C%20Haddon%20Heights%2C%20NJ%2008035", "secondary_label": "Call (856) 617-6638", "secondary_url": "tel:+18566176638"}$j$::jsonb || data
     where page_slug = 'location' and type = 'hero' and draft_data is null
       and coalesce(data->>'background_image_url', '') = '';
    update sections set display_order = 0 where page_slug = 'location' and type = 'photo_hero';
    if not exists (select 1 from sections where page_slug = 'location' and type = 'photo_hero') then

    insert into sections (page_slug, type, display_order, data, status, visible)
    values ('location', 'photo_hero', 0, $j${"eyebrow": "514 Station Ave · Haddon Heights, NJ", "heading": "Look for the black door at 514", "subheading": "Find us on Station Ave. Pull up a chair and stay a while.", "image_url": "/images/pages/storefront-wide.jpg", "image_alt": "The white panelled shopfront of Trouble Brewing Coffee House on Station Ave — black door, big windows, the TROUBLE BREWING sign above and bistro tables out front", "layout": "full", "focus": "center 60%", "cta_label": "Get directions", "cta_url": "https://maps.google.com/maps?q=514%20Station%20Ave%2C%20Haddon%20Heights%2C%20NJ%2008035", "secondary_label": "Call (856) 617-6638", "secondary_url": "tel:+18566176638"}$j$::jsonb, 'published', true);
    end if;

    -- the map becomes the visit panel (map + this week's hours side by side),
    -- keeping its address, heading and button text. Skipped if the map carries
    -- a note of its own (the panel has nowhere to show it).
    select data->>'heading' into v_hours_heading from sections
     where page_slug = 'location' and type = 'hours' order by display_order limit 1;
    update sections set type = 'visit_panel', display_order = 10,
           data = $j${"heading": "Find us", "directions_label": "Get directions", "phone_label": "Call (856) 617-6638", "phone_url": "tel:+18566176638", "hours_heading": "When we're open"}$j$::jsonb
                  || jsonb_strip_nulls(jsonb_build_object(
                       'heading', data->'heading', 'address', data->'address', 'embed_url', data->'embed_url',
                       'directions_label', data->'button_label', 'hours_heading', to_jsonb(nullif(v_hours_heading, ''))))
     where page_slug = 'location' and type = 'map' and draft_data is null
       and coalesce(data->>'note', '') = '';
    -- its hours now show in the panel: hide (not delete) the separate block
    update sections set visible = false, display_order = 11
     where page_slug = 'location' and type = 'hours'
       and exists (select 1 from sections where page_slug = 'location' and type = 'visit_panel');

    -- Parking stays its own rich_text (the fox quotes it); it just becomes a
    -- taped-up note right under the panel. An owner-chosen look is kept.
    update sections set display_order = 20, data = '{"variant": "note"}'::jsonb || data
     where page_slug = 'location' and type = 'rich_text' and draft_data is null
       and data->>'heading' ilike '%parking%';

    -- new: Station Ave and inside-the-shop chapters, and an order-ahead panel

    insert into sections (page_slug, type, display_order, data, status, visible)
    values ('location', 'photo_story', 30, $j${"eyebrow": "The neighborhood", "heading": "On Station Ave", "body_markdown": "We're at 514, between Anthony's Creative Italian Cuisine at 512 and Lula's Empanadas at 516 — a short stroll from Ralph's Pizza, South Jersey Special, Jane's Tea House and April Robin Florist. Make an afternoon of it.", "image_url": "/images/pages/station-ave-street.jpg", "image_alt": "Station Ave on a sunny day: Trouble Brewing’s black awning between Anthony’s and Lula’s, behind leafy street trees and parked cars", "caption": "Station Ave", "frame_style": "gilt-thin", "image_side": "left", "inset_url": "/images/pages/storefront-door.jpg", "inset_alt": "The front of Trouble Brewing Coffee House: a black door numbered 514 under the TROUBLE BREWING sign, with bistro chairs on the sidewalk", "inset_frame": "oval-black", "link_label": "Walk the block with Local Love", "link_url": "/neighborhood", "tone": "sage"}$j$::jsonb, 'published', true);

    insert into sections (page_slug, type, display_order, data, status, visible)
    values ('location', 'photo_story', 40, $j${"eyebrow": "Once you’re in", "heading": "Step inside", "body_markdown": "Order at the counter: the pastry case is right there and the drinks are up on the chalkboard. Breakfast is served all day, and there are gluten-free and vegan options too. Then grab a seat under the gallery wall.", "image_url": "/images/pages/pastry-counter.jpg", "image_alt": "The counter: a pastry case full of muffins, scones and croissants under a hand-lettered bakery chalkboard and a gold TB sign", "caption": "The counter", "frame_style": "gilt-grand", "image_side": "right", "inset_url": "/images/pages/chalkboard-counter.jpg", "inset_alt": "Behind the counter: a chalkboard of seasonal drinks beside the espresso machine, stacks of cups, and the big menu board on the wall", "inset_frame": "black-flat", "tone": "paper"}$j$::jsonb, 'published', true);

    insert into sections (page_slug, type, display_order, data, status, visible)
    values ('location', 'cta', 50, $j${"eyebrow": "In a hurry?", "heading": "Skip the line", "body": "Order ahead on SpotOn and we'll have it ready.", "button_label": "Order ahead", "button_url": "", "secondary_label": "See the menu", "secondary_url": "/menu", "image_url": "/images/pages/muffin-and-refresher.jpg", "image_alt": "A crumb-topped muffin on a pink plate beside an iced pink-and-orange drink in a Trouble Brewing glass", "frame_style": "gold-botanical"}$j$::jsonb, 'published', true);

    update sections s set display_order = r.n - 1
      from (select id, row_number() over (order by display_order, id) as n from sections where page_slug = 'location') r
     where s.id = r.id;
  end if;
end $$;

-- -------------------------------------------------------- TROUBLEMAKERS ----
do $$
begin
  if not exists (select 1 from sections where page_slug = 'troublemakers' and type = 'photo_hero') then
    update sections set display_order = display_order * 10 where page_slug = 'troublemakers';

    -- the plain hero becomes the photo hero; the owner's heading, subheading
    -- and button (whatever they say now) are kept, the photo fields are added
    update sections set type = 'photo_hero', data = $j${"eyebrow": "Behind the counter", "image_url": "/images/pages/chalkboard-counter.jpg", "image_alt": "Behind the counter: a chalkboard of seasonal drinks beside the espresso machine, stacks of cups, and the big menu board on the wall", "caption": "Where the Trouble happens", "frame_style": "black-stacked", "layout": "framed"}$j$::jsonb || data
     where page_slug = 'troublemakers' and type = 'hero' and draft_data is null
       and coalesce(data->>'background_image_url', '') = '';
    -- the polaroid board is automatic (same troublemakers_grid row); add a real
    -- review about the staff and an "ask them what to order" panel after it

    insert into sections (page_slug, type, display_order, data, status, visible)
    values ('troublemakers', 'pull_quote', 1000, $j${"quote": "Their staff are fantastic. I love chatting with them every time I go in.", "attribution": "Heather Roth", "source": "Google review"}$j$::jsonb, 'published', true);

    insert into sections (page_slug, type, display_order, data, status, visible)
    values ('troublemakers', 'cta', 1001, $j${"heading": "Ask them what to order", "body": "It's the question they answer all day — and they'll have your usual down by the third visit.", "button_label": "See the menu", "button_url": "/menu", "secondary_label": "Order Now", "secondary_url": "", "image_url": "/images/pages/latte-art.jpg", "image_alt": "A latte with a leaf poured in the foam, in a black textured mug on a wooden table", "frame_style": "oval-gilt"}$j$::jsonb, 'published', true);

    update sections s set display_order = r.n - 1
      from (select id, row_number() over (order by display_order, id) as n from sections where page_slug = 'troublemakers') r
     where s.id = r.id;
  end if;
end $$;

-- ------------------------------------------------------------- TIMELINE ----
do $$
begin
  if not exists (select 1 from sections where page_slug = 'timeline' and type = 'photo_hero') then
    update sections set display_order = display_order * 10 where page_slug = 'timeline';

    -- the plain hero becomes the photo hero; the owner's heading, subheading
    -- and button (whatever they say now) are kept, the photo fields are added
    update sections set type = 'photo_hero', data = $j${"eyebrow": "Since 2017", "image_url": "/images/pages/wall-detail.jpg", "image_alt": "Close-up of the gallery wall: framed prints, a gold fox head, a pumpkin in an oval frame and a silhouette, all on sage green", "caption": "The gallery wall", "frame_style": "bronze-carved", "layout": "framed", "focus": "50% 90%"}$j$::jsonb || data
     where page_slug = 'timeline' and type = 'hero' and draft_data is null
       and coalesce(data->>'background_image_url', '') = '';
    -- the string of frames is automatic; give milestones without their own
    -- photo the "shop today" photos (labelled as such)
    update sections set data = $j${"fill_images": [{"url": "/images/pages/storefront-wide.jpg", "alt": "The white panelled shopfront of Trouble Brewing Coffee House on Station Ave — black door, big windows, the TROUBLE BREWING sign above and bistro tables out front"}, {"url": "/images/pages/fox-planter.jpg", "alt": "A fox-shaped planter with a spider plant on the counter, with the seating area and green walls of the shop beyond"}, {"url": "/images/pages/chalkboard-counter.jpg", "alt": "Behind the counter: a chalkboard of seasonal drinks beside the espresso machine, stacks of cups, and the big menu board on the wall"}, {"url": "/images/pages/wall-and-bar.jpg", "alt": "A corner of the gallery wall — gilt and black frames and a gold fox head — above the self-serve station with dried flowers, cups and sweeteners"}], "fill_caption": "The shop today", "end_label": "…and counting"}$j$::jsonb || data
     where page_slug = 'timeline' and type = 'timeline_grid' and draft_data is null;

    insert into sections (page_slug, type, display_order, data, status, visible)
    values ('timeline', 'cta', 1000, $j${"heading": "Come be part of the next chapter", "body": "Pull up a chair at 514 Station Ave and stay a while.", "button_label": "Plan a visit", "button_url": "/location", "secondary_label": "Read our story", "secondary_url": "/about", "image_url": "/images/pages/room-fox-sign.jpg", "image_alt": "Inside Trouble Brewing: the round brass sign of the top-hatted fox leaning against the counter between potted plants, under a white pressed-tin ceiling", "frame_style": "gilt-thin"}$j$::jsonb, 'published', true);

    update sections s set display_order = r.n - 1
      from (select id, row_number() over (order by display_order, id) as n from sections where page_slug = 'timeline') r
     where s.id = r.id;
  end if;
end $$;

commit;
