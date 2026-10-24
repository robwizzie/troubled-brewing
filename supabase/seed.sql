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
  ('home', 'Trouble Brewing Coffee House | Haddon Heights NJ Coffee Shop', 'Independent coffee shop on Station Ave in Haddon Heights, NJ. La Colombe coffee, Metolius teas, breakfast all day, gluten-free sweets and a Pup Cup.'),
  ('menu', 'Menu | Trouble Brewing Coffee House, Haddon Heights NJ', 'La Colombe espresso drinks, Metolius teas, breakfast sandwiches served all day, lunch melts, fresh bakery and gluten-free sweets. Order ahead online.'),
  ('about', 'Our Story | Trouble Brewing Coffee House, Haddon Heights', 'Haddon Heights locals Tom and Cat opened Trouble Brewing on Station Ave on Friday the 13th, October 2017. Serious coffee, breakfast all day, good Trouble.'),
  ('events', 'Events | Trouble Brewing Coffee House, Haddon Heights NJ', 'Upcoming events and community gatherings at Trouble Brewing Coffee House, 514 Station Ave in Haddon Heights, NJ. See what''s on, then come say hi.'),
  ('location', 'Hours & Directions | Trouble Brewing Coffee House', 'Find Trouble Brewing Coffee House at 514 Station Ave, Haddon Heights, NJ 08035, open seven days a week. Hours, parking, directions: (856) 617-6638.'),
  ('contact', 'Contact & Catering | Trouble Brewing Coffee House', 'Call (856) 617-6638 or send a message to Trouble Brewing Coffee House in Haddon Heights, NJ: questions, feedback and catering inquiries.'),
  ('timeline', 'Our Story So Far | Trouble Brewing Coffee House Timeline', 'From opening day on Friday the 13th, October 2017, to nine years on Station Ave: the milestones of Trouble Brewing Coffee House in Haddon Heights, NJ.'),
  ('reviews', 'Reviews | Trouble Brewing Coffee House, Haddon Heights NJ', 'What neighbors say about Trouble Brewing Coffee House in Haddon Heights, NJ: real Google reviews of our coffee, breakfast and crew. Leave your own.'),
  ('gallery-wall', 'The Gallery Wall | Trouble Brewing Coffee House', 'The green gallery wall at Trouble Brewing Coffee House: framed art, a gold fox and the curiosities that make our Haddon Heights café feel like home.'),
  ('troublemakers', 'Meet the Troublemakers | Trouble Brewing Coffee House', 'Meet the Troublemakers, the crew pouring La Colombe coffee and making breakfast all day at Trouble Brewing Coffee House in Haddon Heights, NJ.'),
  ('neighborhood', 'Local Love: Station Ave Neighbors | Trouble Brewing', 'Our favorite Haddon Heights neighbors on Station Ave: Italian, empanadas, pizza, afternoon tea, flowers and local gifts. Shop small with Trouble Brewing.'),
  ('gift-cards', 'Gift Cards | Trouble Brewing Coffee House, Haddon Heights', 'Give someone Trouble: send an e-gift card for Trouble Brewing Coffee House in Haddon Heights, NJ. Pick an amount, add a note, and it goes by email.')
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Sections (default layout per page). All published + visible.
-- -----------------------------------------------------------------------------

-- HOME --------------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
-- frame_style values = the vintage molding recipes in src/lib/frameStyles.js
-- (one of each, like the real wall). Keep in sync with src/lib/seed.js.
('home', 'gallery_wall_hero', 0, '{
  "frames": [
    {"label": "Order / Menu", "link": "/menu", "frame_style": "gilt-grand", "image_url": "images/wall/order-menu.jpg"},
    {"label": "The Troublemakers", "link": "/troublemakers", "frame_style": "black-stacked", "image_url": "images/wall/troublemakers.jpg"},
    {"label": "The Gallery Wall", "link": "/gallery-wall", "frame_style": "gold-tapestry", "image_url": "images/wall/gallery-wall.jpg"},
    {"label": "Events", "link": "/events", "frame_style": "oval-black", "image_url": "images/wall/whats-on.jpg"},
    {"label": "Local Love", "link": "/neighborhood", "frame_style": "gold-botanical", "image_url": "images/wall/local-love.jpg"},
    {"label": "Reviews", "link": "/reviews", "frame_style": "oval-gilt", "image_url": "images/wall/reviews.jpg"},
    {"label": "The Journey", "link": "/timeline", "frame_style": "bronze-carved", "image_url": "images/wall/our-story-so-far.jpg"},
    {"label": "Our Story", "link": "/about", "frame_style": "brass-chain", "image_url": "images/wall/our-story.jpg"}
  ],
  "heading": "Welcome to Trouble Brewing",
  "subheading": "A whole wall of reasons to stop in.",
  "specials_label": "Current Drink Specials",
  "specials_link": "/menu#specials"
}'),
('home', 'food_showcase', 1, '{"heading": "Fresh off the counter", "subheading": "Tap anything to order it on SpotOn."}'),
('home', 'social_proof', 2, '{"label": "Loved by the neighborhood"}'),
('home', 'featured_drink', 3, '{"heading": "This Week''s Trouble"}'),
('home', 'signature_drinks', 4, '{"heading": "Signature sips", "button_label": "See the full menu"}'),
('home', 'hours', 5, '{"heading": "Today at Trouble Brewing"}'),
('home', 'cta', 6, '{"heading": "Skip the line", "body": "Order ahead on SpotOn and we''ll have it ready.", "button_label": "Order Now", "button_url": ""}'),
('home', 'intro_duo', 7, '{"heading_a": "Good coffee, real food", "body_a": "We pull serious espresso, press paninis to order, and turn out warm brioche breakfast sandwiches, fresh-baked scones, and specialty drinks worth the trip — plus gluten-free and vegan options. Breakfast is served all day.", "heading_b": "More than a coffee shop", "body_b": "Come for an event, meet the Troublemakers behind the counter, or just sink into the green-walled, art-covered room our regulars call a second home. That''s the good kind of Trouble."}'),
('home', 'instagram', 8, '{"embed_handle": "troublebrewingcoffee"}'),
('home', 'newsletter', 9, '{"heading": "Stay in the loop", "body": "New drinks, events, and the occasional bit of Trouble — straight to your inbox.", "mailchimp_action_url": ""}');

-- MENU --------------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('menu', 'food_showcase', 0, '{"heading": "Fresh off the counter", "subheading": "Tap anything to order it on SpotOn."}'),
('menu', 'menu_block', 1, '{"heading": "The Menu", "categories": ["espresso", "specialty", "food", "pastry", "seasonal"]}'),
('menu', 'cta', 2, '{"heading": "Ready to order?", "body": "Order ahead on SpotOn for pickup.", "button_label": "Order on SpotOn", "button_url": "", "secondary_label": "Buying for someone? Send a gift card", "secondary_url": "/gift-cards"}');

-- ABOUT -------------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('about', 'hero', 0, '{"heading": "Our Story", "subheading": "From spreadsheets to steamed milk.", "background_image_url": "", "cta_label": "See the Menu", "cta_url": "/menu"}'),
('about', 'rich_text', 1, '{"heading": "Two bankers walk into a coffee shop", "body_markdown": "Tom and Cat spent years in mortgage banking before deciding the world needed one more genuinely good neighborhood coffee shop more than it needed two more bankers. Haddon Heights residents themselves, they opened Trouble Brewing at 514 Station Ave on **Friday the 13th of October, 2017** — about as on-brand an opening day as a shop called Trouble could ask for. It''s been a warm, art-filled room where the coffee is serious and the vibe is not ever since."}'),
('about', 'rich_text', 2, '{"heading": "Why La Colombe", "body_markdown": "We partnered with **La Colombe** because great coffee shouldn''t be complicated — it should be consistent, ethical, and delicious. That partnership is the foundation we build every drink on, alongside **Metolius** teas and breakfast served all day."}'),
('about', 'rich_text', 3, '{"heading": "Why local matters", "body_markdown": "Independent shops are the connective tissue of a town. We buy local where we can, host our neighbors, and try to send everyone back out the door a little more caffeinated and a little more cared-for."}');

-- EVENTS ------------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('events', 'hero', 0, '{"heading": "Events & Community", "subheading": "There''s always something brewing.", "background_image_url": "", "cta_label": "Host an event", "cta_url": "/contact"}'),
('events', 'events_list', 1, '{"heading": "Upcoming at Trouble Brewing"}'),
('events', 'community_board', 2, '{"heading": "On the Community Board"}'),
('events', 'cta', 3, '{"heading": "Want to host something?", "body": "Showers, meetings, small parties — our space is yours. Tell us what you''re planning.", "button_label": "Start a catering inquiry", "button_url": "/contact"}'),
('events', 'rich_text', 4, '{"heading": "Loyalty", "body_markdown": "Regulars are the heart of this place. Ask a Troublemaker about our loyalty perks next time you''re in. *(Full program details coming soon.)*"}'),
('events', 'instagram', 5, '{"embed_handle": "troublebrewingcoffee"}');

-- LOCATION ----------------------------------------------------------
-- Find us BEFORE the hours: someone opening this page on a phone is usually
-- trying to get here, and the map is what they came for.
insert into sections (page_slug, type, display_order, data) values
('location', 'map', 0, '{"address": "514 Station Ave, Haddon Heights, NJ 08035", "embed_url": ""}'),
('location', 'hours', 1, '{"heading": "Hours"}'),
('location', 'rich_text', 2, '{"heading": "Parking", "body_markdown": "Street parking is available out front, plus a **lot behind the coffee house**. Enter from White Horse Pike or Atlantic Ave."}'),
('location', 'cta', 3, '{"heading": "Come say hi", "body": "Questions? Give us a call.", "button_label": "Call (856) 617-6638", "button_url": "tel:+18566176638"}');

-- CONTACT -----------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('contact', 'rich_text', 0, '{"heading": "Get in touch", "body_markdown": "Questions, ideas, or planning something? Use the form below for general questions, or the catering form for events. We read every message."}');

-- REVIEWS -----------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('reviews', 'reviews_hero', 0, '{"heading": "What the neighborhood says"}'),
('reviews', 'testimonials_wall', 1, '{"heading": "A few of our favorites", "layout": "masonry"}'),
('reviews', 'google_reviews_feed', 2, '{"heading": "Fresh from Google", "count": 5}'),
('reviews', 'review_cta', 3, '{"heading": "Been in lately?", "body": "We''d love to hear about it.", "button_label": "Leave a review on Google"}');

-- GALLERY WALL ------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('gallery-wall', 'gallery_wall_room', 0, '{"heading": "The Gallery Wall", "intro": "Every frame on this wall arrived some other way — found, gifted, or made by somebody who drinks here. Have a proper look at any of them.", "hint": "Pick something off the wall", "image_url": ""}'),
('gallery-wall', 'gallery_pieces_grid', 1, '{"heading": "The collection, close up"}');

-- TROUBLEMAKERS -----------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('troublemakers', 'hero', 0, '{"heading": "The Troublemakers", "subheading": "The people behind your coffee.", "background_image_url": "", "cta_label": "", "cta_url": ""}'),
('troublemakers', 'troublemakers_grid', 1, '{"heading": "Meet the team"}');

-- NEIGHBORHOOD ------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('neighborhood', 'hero', 0, '{"heading": "Local Love", "subheading": "The Haddon Heights spots we can''t get enough of.", "background_image_url": "", "cta_label": "", "cta_url": ""}'),
('neighborhood', 'local_businesses_grid', 1, '{"heading": "Our neighbors"}'),
('neighborhood', 'cta', 2, '{"heading": "Know a great local spot?", "body": "Tell us who we''re missing.", "button_label": "Send a suggestion", "button_url": "/contact"}');

-- GIFT CARDS --------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('gift-cards', 'gift_cards', 0, '{"eyebrow": "Gift cards", "heading": "Give someone Trouble", "intro": "For the regular, the early riser, the friend who could use a good morning: send a Trouble Brewing e-gift card straight to their inbox.", "button_label": "Buy an e-gift card", "button_url": "", "how_it_works": "Pick an amount, add a note, and we''ll email it.", "occasions_heading": "A little Trouble for…", "occasions_hint": "Tap a card to send one.", "occasion_1_label": "Birthday", "occasion_1_note": "Another lap around the sun calls for a latte.", "occasion_1_art": "cake", "occasion_2_label": "Thank you", "occasion_2_note": "For the neighbor, the sitter, the one who always shows up.", "occasion_2_art": "thanks", "occasion_3_label": "Teacher gift", "occasion_3_note": "Fuel for the people grading papers before first bell.", "occasion_3_art": "apple", "occasion_4_label": "Just because", "occasion_4_note": "No occasion needed. That’s the best kind of Trouble.", "occasion_4_art": "fox", "show_phone": true}');

-- TIMELINE ----------------------------------------------------------
insert into sections (page_slug, type, display_order, data) values
('timeline', 'hero', 0, '{"heading": "Our Story So Far", "subheading": "A few of the moments that made Trouble.", "background_image_url": "", "cta_label": "", "cta_url": ""}'),
('timeline', 'timeline_grid', 1, '{"heading": "The Trouble Brewing timeline"}');

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
('homepage_concept', '{"concept": "immersive_gallery"}'),
('featured_drink', '{"item": "Iced Matcha Latte", "description": "Iced matcha over cold milk, finished with a fresh strawberry."}'),
('staff_picks', '{"items": [{"label": "Flying off the menu", "value": "Cranberry Walnut Chicken Salad"}, {"label": "This week''s feature", "value": "Iced Matcha Latte"}]}'),
('loyalty_copy', '{"body_markdown": "Ask a Troublemaker about loyalty perks. Full program details coming soon."}'),
('announcement_banner', '{"enabled": false, "message": ""}'),
('social_links', '{"instagram": "https://instagram.com/troublebrewingcoffee", "facebook": "https://www.facebook.com/tbcoffeehouse", "tiktok": "https://www.tiktok.com/@troublebrewingcoffee", "x": "", "youtube": ""}'),
-- Which Google reviews the site shows + the owner's per-review overrides
-- (hidden / pinned / attached photo), keyed by author+text. See src/lib/reviews.js
-- and admin -> Reviews. 4 stars is the default floor: only the good ones.
('review_settings', '{"min_rating": 4, "hidden": {}, "pinned": {}, "photos": {}}'),
-- A staff photo of the real chalkboard (admin -> Today's chalkboard); off until
-- they publish one. See src/lib/chalkboard.js.
('chalkboard_photo', '{"url": "", "path": "", "caption": "", "updated_at": null, "enabled": false, "max_age_days": 3}')
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Google profile (last known real values — refreshed daily by the Edge Function)
-- -----------------------------------------------------------------------------
insert into google_profile (id, place_id, rating, review_count, maps_url)
values (1, 'ChIJaRXwqCHMxokR3omz5QWgCws', 4.6, 298, 'https://maps.google.com/?cid=795905706350053854')
on conflict (id) do nothing;

-- Instagram cache (single placeholder row — refreshed by the Edge Function;
-- never seed private_secrets: the owner pastes the real token in the Dashboard)
insert into instagram_feed (id, handle) values (1, 'troublebrewingcoffee')
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Testimonials: intentionally NOT seeded. The site shows only real reviews —
-- Google reviews arrive via the google-profile Edge Function, and owners add
-- hand-picked favorites in /admin. Never insert invented quotes here.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- Gallery pieces: intentionally NOT seeded. The Gallery Wall page describes
-- every piece in the wall photograph from what is visibly in it
-- (src/lib/galleryWall.js); owners catalogue the real titles, artists and
-- stories in /admin. Invented backstories used to sit here.
-- -----------------------------------------------------------------------------

-- -----------------------------------------------------------------------------
-- Team members ("Troublemakers") — placeholder so the page renders
-- -----------------------------------------------------------------------------
-- Starter rows the owners replace with the real team. Fun facts are seeded
-- EMPTY rather than as em-dashes: the page hides a blank fact, so an unfilled
-- card looks finished instead of carrying five rows of punctuation.
insert into team_members (name, role, bio, fun_facts, display_order, active) values
('Katie', 'General Manager', 'Keeps the whole operation running and somehow still remembers your usual.', '{"favorite_local_food": "", "favorite_movie": "", "favorite_book": "", "favorite_show": "", "favorite_artist": ""}', 0, true);

-- -----------------------------------------------------------------------------
-- Local businesses (placeholder Haddon Heights neighbors — confirm with client)
-- -----------------------------------------------------------------------------
-- Client-named starting entries (confirm exact names, categories, and URLs).
-- Fully owner-editable in the Local Love manager.
-- Real Station Ave businesses, checked against their own sites, the borough
-- directory and local press. The page orders them by street number, so Trouble
-- Brewing's own door at 514 falls between Anthony's and Lula's on its own.
-- `we_love` is left blank on purpose: only the owners know what they actually
-- send people there for.
insert into local_businesses (name, category, address, blurb, url, display_order) values
('Anthony''s Creative Italian Cuisine', 'restaurant', '512 Station Ave', 'BYOB Italian right next door, in three dining rooms inside a 1930s building. Our closest neighbor by about twenty feet.', 'https://www.anthonysonstation.com/', 0),
('Lula''s Empanadas', 'restaurant', '516 Station Ave', 'Contemporary Dominican empanadas from Yaslyn Lora, named after her mother — up to eighteen flavors, now from a proper Station Ave storefront. They chipped in prizes for our ninth-birthday raffle.', 'https://www.facebook.com/lulasempanadas/', 1),
('Michael''s Jewelers and Gemologist', 'retail', '519 Station Ave', 'Custom, one-of-a-kind jewelry designed and made right in the shop by Michael Bartorelli, a GIA graduate gemologist who started out on Philadelphia’s Jewelers Row at thirteen. Repairs, too — just across the street from us.', 'https://michaelsnj.com/', 2),
('Ralph''s Pizza', 'restaurant', '520 Station Ave', 'Family-run pizza on Station Ave for more than thirty years, with a back room that has hosted half the birthdays in town. They donated to our ninth-birthday raffle, too.', 'https://ralphspizzahaddonheights.com/', 3),
('South Jersey Special', 'retail', '531 Station Ave', 'Amy Murphy’s gift shop of South Jersey makers — cards, prints, jewelry and small-batch things, most of it funny, all of it local. Another of our birthday-raffle donors.', 'https://southjerseyspecial.com/', 4),
('Jane''s Tea House', 'cafe', '602 Station Ave', 'Proper afternoon tea a few doors up. The one place on the street we happily send people for a hot drink.', 'https://janesteahouse.com/', 5),
('Cabana Water Ice Co.', 'other', '603 Station Ave', 'Homemade water ice and hand-dipped ice cream, going since 1989. The summer half of a Station Ave afternoon.', '', 6),
('Doc''s Finds Records', 'retail', '606 Station Ave', 'Records, new and hard to find — fresh releases and original pressings of classic rock, jazz, blues and more, with new stock in the bins every week. An online shop that put down roots on Station Ave in 2022, and the reason for the occasional sidewalk sale with a live band.', 'https://docsfindsrecords.com/', 7),
('April Robin Florist & Gift', 'retail', '620 Station Ave', 'The florist at the top of the avenue — where the flowers on our counter usually come from.', 'https://www.aprilrobinflorist.com/', 8),
('John''s Friendly Market', 'other', '622 Station Ave', 'The old-fashioned neighborhood grocery and deli. Exactly the sort of place a main street stops being a main street without.', '', 9);

-- -----------------------------------------------------------------------------
-- TB Timeline milestones — real, sourced dates (see src/lib/seed.js)
-- -----------------------------------------------------------------------------
insert into timeline_events (date_label, sort_date, title, description, display_order) values
('Friday the 13th · Oct 2017', '2017-10-13', 'Trouble opens on Station Ave', 'Tom and Cat, Haddon Heights locals, open Trouble Brewing Coffee House at 514 Station Ave — on Friday the 13th, naturally. La Colombe in the grinder, breakfast all day.', 0),
('December 2019', '2019-12-07', 'The internet finds out', 'New Jersey Isn’t Boring writes Trouble up as one of the best spots around to work from a coffee shop — comfy seats, free WiFi, a shelf of books and drinks sized Trouble and Big Trouble.', 1),
('October 2026', '2026-10-13', 'Nine years of Trouble', 'A birthday raffle with prizes from our Station Ave neighbors — Lula’s Empanadas, Ralph’s Pizza, South Jersey Special and Doc’s Unique Boutique — and two birthday lattes: The Max (a dirt-cake iced latte) and The Ruby (cake batter, strawberry cold foam, sprinkles).', 2),
('October 2026', '2026-10-14', 'A Quick Bites review', 'The Retrospect stops in for its Quick Bites column and comes away talking about the cappuccino, the pumpkin spice frozen coffee and the French toast muffin — "a group favorite."', 3);
