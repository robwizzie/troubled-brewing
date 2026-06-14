-- =============================================================================
-- Trouble Brewing Coffee House — Seed data
-- Run AFTER schema.sql. Loads pages, default sections, menu, hours, and
-- placeholder content so the site looks complete before any admin edits.
-- Mirrors src/lib/seed.js (the bundled offline fallback). Keep them in sync.
-- Safe to re-run: uses upserts / conflict-skips where practical.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Pages
-- -----------------------------------------------------------------------------
insert into pages (slug, title, meta_description) values
  ('home',          'Trouble Brewing Coffee House — Haddon Heights, NJ', 'A warm, independent coffee shop in Haddon Heights, NJ pouring La Colombe coffee. Espresso, signature drinks, fresh paninis, and pastries.'),
  ('menu',          'Menu — Trouble Brewing Coffee House',               'Espresso, specialty drinks, paninis, and fresh pastries at Trouble Brewing Coffee House in Haddon Heights, NJ. Order online via SpotOn.'),
  ('about',         'Our Story — Trouble Brewing Coffee House',          'From mortgage bankers to a neighborhood coffee shop. The story of Trouble Brewing and our La Colombe coffee in Haddon Heights, NJ.'),
  ('events',        'Events & Community — Trouble Brewing Coffee House',  'Upcoming events at Trouble Brewing Coffee House. Host your own gathering in our Haddon Heights space.'),
  ('location',      'Hours & Location — Trouble Brewing Coffee House',    'Visit Trouble Brewing Coffee House at 514 Station Ave, Haddon Heights, NJ. Hours, parking, and directions.'),
  ('contact',       'Contact & Catering — Trouble Brewing Coffee House',  'Get in touch with Trouble Brewing Coffee House or send a catering inquiry.'),
  ('community',     'Community — Trouble Brewing Coffee House',           'Events, our community board, loyalty, and customer photos from Trouble Brewing Coffee House in Haddon Heights, NJ.'),
  ('reviews',       'Reviews — Trouble Brewing Coffee House',            'See what the neighborhood says about Trouble Brewing Coffee House. Read our Google reviews and leave your own.'),
  ('gallery-wall',  'The Gallery Wall — Trouble Brewing Coffee House',    'The stories behind the framed art on our wall. A little bit of Trouble Brewing history, one frame at a time.'),
  ('troublemakers', 'The Troublemakers — Trouble Brewing Coffee House',   'Meet the Troublemakers — the team behind your coffee at Trouble Brewing Coffee House in Haddon Heights, NJ.'),
  ('neighborhood',  'Local Love — Trouble Brewing Coffee House',          'The Haddon Heights businesses we know and love. Support local with Trouble Brewing Coffee House.')
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Sections (default layout per page). All published + visible.
-- -----------------------------------------------------------------------------

-- HOME --------------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('home', 'gallery_wall_hero', 0, '{
  "frames": [
    {"label": "Our Signature Drink", "link": "/menu", "frame_style": "ornate", "image_url": ""},
    {"label": "Fresh Pastries", "link": "/menu", "frame_style": "oval-gold", "image_url": ""},
    {"label": "What''s On", "link": "/events", "frame_style": "black", "image_url": ""},
    {"label": "Meet the Troublemakers", "link": "/troublemakers", "frame_style": "wood", "image_url": ""},
    {"label": "The Gallery Wall", "link": "/gallery-wall", "frame_style": "gold", "image_url": ""},
    {"label": "Reviews", "link": "/reviews", "frame_style": "black", "image_url": ""},
    {"label": "Local Love", "link": "/neighborhood", "frame_style": "wood", "image_url": ""},
    {"label": "Our Story", "link": "/about", "frame_style": "oval-gold", "image_url": ""}
  ],
  "heading": "Welcome to Trouble Brewing",
  "subheading": "A whole wall of reasons to stop in."
}'),
('home', 'featured_drink', 1, '{"heading": "This Week''s Trouble"}'),
('home', 'hours', 2, '{"heading": "Today at Trouble Brewing"}'),
('home', 'cta', 3, '{"heading": "Skip the line", "body": "Order ahead on SpotOn and we''ll have it ready.", "button_label": "Order Now", "button_url": ""}'),
('home', 'rich_text', 4, '{"heading": "We proudly pour La Colombe", "body_markdown": "Every cup starts with **La Colombe** coffee — thoughtfully roasted, ethically sourced, and pulled with care. It''s the backbone of everything we make, from a classic cappuccino to our signature Banana Split Coffee."}'),
('home', 'rich_text', 5, '{"heading": "A neighborhood spot", "body_markdown": "We''re more than coffee. Come for an event, meet the team, or just settle into the green-walled, art-covered room that regulars call a second home."}'),
('home', 'instagram', 6, '{"embed_handle": "troublebrewingcoffee"}'),
('home', 'newsletter', 7, '{"heading": "Stay in the loop", "body": "New drinks, events, and the occasional bit of Trouble — straight to your inbox.", "mailchimp_action_url": ""}');

-- MENU --------------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('menu', 'menu_block', 0, '{"heading": "The Menu", "categories": ["espresso", "specialty", "food", "pastry", "seasonal"]}'),
('menu', 'cta', 1, '{"heading": "Ready to order?", "body": "Order ahead on SpotOn for pickup.", "button_label": "Order on SpotOn", "button_url": ""}');

-- ABOUT -------------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('about', 'hero', 0, '{"heading": "Our Story", "subheading": "From spreadsheets to steamed milk.", "background_image_url": "", "cta_label": "See the Menu", "cta_url": "/menu"}'),
('about', 'rich_text', 1, '{"heading": "Two bankers walk into a coffee shop", "body_markdown": "Tom and Cat spent years in mortgage banking before deciding the world needed one more genuinely good neighborhood coffee shop more than it needed two more bankers. Trouble Brewing is the result — a warm, art-filled room in the heart of Haddon Heights where the coffee is serious and the vibe is not."}'),
('about', 'rich_text', 2, '{"heading": "Why La Colombe", "body_markdown": "We partnered with **La Colombe** because great coffee shouldn''t be complicated — it should be consistent, ethical, and delicious. That partnership is the foundation we build every drink on."}'),
('about', 'rich_text', 3, '{"heading": "Why local matters", "body_markdown": "Independent shops are the connective tissue of a town. We buy local where we can, host our neighbors, and try to send everyone back out the door a little more caffeinated and a little more cared-for."}');

-- EVENTS ------------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('events', 'hero', 0, '{"heading": "Events & Community", "subheading": "There''s always something brewing.", "background_image_url": "", "cta_label": "Host an event", "cta_url": "/contact"}'),
('events', 'events_list', 1, '{"heading": "Upcoming at Trouble Brewing"}'),
('events', 'cta', 2, '{"heading": "Want to host something?", "body": "Showers, meetings, small parties — our space is yours. Tell us what you''re planning.", "button_label": "Start a catering inquiry", "button_url": "/contact"}');

-- LOCATION ----------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('location', 'hours', 0, '{"heading": "Hours"}'),
('location', 'map', 1, '{"address": "514 Station Ave, Haddon Heights, NJ 08035", "embed_url": ""}'),
('location', 'rich_text', 2, '{"heading": "Parking", "body_markdown": "Street parking is available out front, plus a **lot behind the coffee house**. Enter from White Horse Pike or Atlantic Ave."}'),
('location', 'cta', 3, '{"heading": "Come say hi", "body": "Questions? Give us a call.", "button_label": "Call (856) 617-6638", "button_url": "tel:+18566176638"}');

-- CONTACT -----------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('contact', 'rich_text', 0, '{"heading": "Get in touch", "body_markdown": "Questions, ideas, or planning something? Use the form below for general questions, or the catering form for events. We read every message."}');

-- COMMUNITY ---------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('community', 'events_list', 0, '{"heading": "What''s coming up"}'),
('community', 'community_board', 1, '{"heading": "On the Community Board"}'),
('community', 'rich_text', 2, '{"heading": "Loyalty", "body_markdown": "Regulars are the heart of this place. Ask a Troublemaker about our loyalty perks next time you''re in. *(Full program details coming soon.)*"}'),
('community', 'instagram', 3, '{"embed_handle": "troublebrewingcoffee"}');

-- REVIEWS -----------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('reviews', 'reviews_hero', 0, '{"heading": "What the neighborhood says"}'),
('reviews', 'testimonials_wall', 1, '{"heading": "A few of our favorites", "layout": "masonry"}'),
('reviews', 'google_reviews_feed', 2, '{"heading": "Fresh from Google", "count": 5}'),
('reviews', 'review_cta', 3, '{"heading": "Been in lately?", "body": "We''d love to hear about it.", "button_label": "Leave a review on Google"}');

-- GALLERY WALL ------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('gallery-wall', 'hero', 0, '{"heading": "The Gallery Wall", "subheading": "Every frame has a story. Some are even true.", "background_image_url": "", "cta_label": "", "cta_url": ""}'),
('gallery-wall', 'gallery_pieces_grid', 1, '{"heading": "The collection"}');

-- TROUBLEMAKERS -----------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('troublemakers', 'hero', 0, '{"heading": "The Troublemakers", "subheading": "The people behind your coffee.", "background_image_url": "", "cta_label": "", "cta_url": ""}'),
('troublemakers', 'troublemakers_grid', 1, '{"heading": "Meet the team"}');

-- NEIGHBORHOOD ------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('neighborhood', 'hero', 0, '{"heading": "Local Love", "subheading": "The Haddon Heights spots we can''t get enough of.", "background_image_url": "", "cta_label": "", "cta_url": ""}'),
('neighborhood', 'local_businesses_grid', 1, '{"heading": "Our neighbors"}'),
('neighborhood', 'cta', 2, '{"heading": "Know a great local spot?", "body": "Tell us who we''re missing.", "button_label": "Send a suggestion", "button_url": "/contact"}');

-- -----------------------------------------------------------------------------
-- Menu items (placeholder prices — confirm with client)
-- -----------------------------------------------------------------------------
insert into menu_items (name, description, price, category, dietary_flags, available, display_order) values
('Cappuccino', 'La Colombe espresso and steamed milk, balanced and classic.', 4.50, 'espresso', '{}', true, 0),
('Iced Chai Latte', 'Spiced chai over ice with milk — cozy, even cold.', 5.50, 'specialty', '{}', true, 1),
('Banana Split Coffee', 'Our signature: a playful, dessert-inspired coffee you can''t get anywhere else.', 6.50, 'specialty', '{}', true, 2),
('Coffee Flight', 'A tasting flight to explore what La Colombe can do.', 9.00, 'specialty', '{}', true, 3),
('Croissant', 'Buttery, flaky, baked-fresh.', 3.75, 'pastry', '{}', true, 4),
('Brioche Breakfast Sandwich', 'Egg and cheese on soft brioche. Add pork roll or bacon.', 7.50, 'food', '{}', true, 5),
('Scone', 'Rotating flavors — ask what''s in today.', 3.50, 'pastry', '{}', true, 6),
('Buffalo Chicken Panini', 'Spicy three-cheese, Frank''s RedHot, fire-braised chicken on seeded rye.', 11.00, 'food', '{}', true, 7),
('Cranberry Walnut Chicken Salad Panini', 'Our most popular — cranberry walnut chicken salad, pressed warm.', 11.00, 'food', '{}', true, 8),
('BLT', 'Bacon, lettuce, tomato on seeded rye.', 9.50, 'food', '{}', true, 9),
('Gluten-Free Cookie', 'All the cookie, none of the gluten.', 3.25, 'pastry', '{gluten-free}', true, 10),
('Vegan Cookie', 'Plant-based and genuinely good.', 3.25, 'pastry', '{vegan}', true, 11);

-- -----------------------------------------------------------------------------
-- Hours (Sun=0 ... Sat=6). Confirm with client.
-- -----------------------------------------------------------------------------
insert into hours (day_of_week, open_time, close_time) values
  (0, '8:00 AM', '3:00 PM'),   -- Sun
  (1, '7:30 AM', '7:00 PM'),   -- Mon
  (2, '7:30 AM', '7:00 PM'),   -- Tue
  (3, '7:30 AM', '7:00 PM'),   -- Wed
  (4, '7:30 AM', '7:00 PM'),   -- Thu
  (5, '7:30 AM', '5:00 PM'),   -- Fri
  (6, '7:30 AM', '5:00 PM')    -- Sat
on conflict (day_of_week) do nothing;

-- -----------------------------------------------------------------------------
-- Content blocks
-- -----------------------------------------------------------------------------
insert into content_blocks (key, data) values
('homepage_concept', '{"concept": "gallery_wall"}'),
('featured_drink', '{"name": "Banana Split Coffee", "description": "Our signature dessert-in-a-cup. If you only try one thing, make it this.", "price": "6.50", "image_url": ""}'),
('staff_picks', '{"items": [{"label": "Flying off the menu", "value": "Cranberry Walnut Chicken Salad Panini"}, {"label": "Barista''s pick", "value": "Banana Split Coffee"}]}'),
('loyalty_copy', '{"body_markdown": "Ask a Troublemaker about loyalty perks. Full program details coming soon."}'),
('announcement_banner', '{"enabled": false, "message": ""}')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Google profile (single placeholder row — refreshed by the Edge Function)
-- -----------------------------------------------------------------------------
insert into google_profile (id, rating, review_count, maps_url)
values (1, 4.9, 0, 'https://www.google.com/maps/search/?api=1&query=Trouble+Brewing+Coffee+House+Haddon+Heights')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Testimonials (placeholder — owner replaces with real favorites)
-- -----------------------------------------------------------------------------
insert into testimonials (author, source, rating, quote, featured, display_order) values
('Sarah M.', 'Google', 5, 'The Banana Split Coffee is unreal and the team always remembers my order. My favorite spot in Haddon Heights.', true, 0),
('Dave R.', 'Google', 5, 'Real La Colombe coffee, fresh paninis, and a room you actually want to hang out in. This is what a coffee shop should be.', true, 1),
('Priya K.', 'Google', 5, 'The cranberry walnut chicken salad panini ruined every other panini for me. Cozy, friendly, local — go.', false, 2);

-- -----------------------------------------------------------------------------
-- Gallery pieces (placeholder — owner adds the real wall + stories)
-- -----------------------------------------------------------------------------
insert into gallery_pieces (title, story, display_order) values
('The Ornate Gold One', 'Nobody quite remembers where this one came from — it just showed up during the build-out and refused to leave. Now it''s the unofficial centerpiece of the wall.', 0),
('Tiny Oval Mystery', 'A flea-market find from a rainy Saturday. We bought it for the frame and kept it for the smile it gets out of regulars.', 1);

-- -----------------------------------------------------------------------------
-- Team members ("Troublemakers") — placeholder so the page renders
-- -----------------------------------------------------------------------------
insert into team_members (name, role, bio, fun_facts, display_order, active) values
('Katie', 'General Manager', 'Keeps the whole operation running and somehow still remembers your usual.', '{"favorite_local_food": "—", "favorite_movie": "—", "favorite_book": "—", "favorite_show": "—", "favorite_artist": "—"}', 0, true),
('A Troublemaker', 'Barista', 'Pulls shots, makes friends, occasionally causes (delicious) trouble.', '{"favorite_local_food": "—", "favorite_movie": "—", "favorite_book": "—", "favorite_show": "—", "favorite_artist": "—"}', 1, true);

-- -----------------------------------------------------------------------------
-- Local businesses (placeholder Haddon Heights neighbors — confirm with client)
-- -----------------------------------------------------------------------------
insert into local_businesses (name, category, blurb, url, display_order) values
('A Neighborhood Favorite', 'restaurant', 'One of the great local spots we send people to. (Owner: replace with a real neighbor + link.)', '', 0),
('A Local Shop', 'retail', 'Independent and worth a visit. (Owner: replace with a real neighbor + link.)', '', 1);
