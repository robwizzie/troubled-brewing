-- Gift Cards page (/gift-cards): "Give someone Trouble".
--
-- Adds the `pages` row and its one section (type `gift_cards`: hero line, the
-- "Buy an e-gift card" button, a how-it-works line and four occasion cards).
-- Mirrors src/lib/seed.js, which is what the site shows until this runs.
--
-- The button link is left BLANK in the section on purpose: blank means "use
-- the site default" (SPOTON_GIFT_CARD_URL in src/lib/config.js, which falls
-- back to the shop's SpotOn order page and its "Purchase gift cards" link).
-- Paste the exact SpotOn e-gift card URL into the section's "Button link" in
-- the editor once it's confirmed.
--
-- Also gives the Menu page's "Ready to order?" band a small "Buying for
-- someone? Send a gift card" link under its button, only when that row still
-- has the seeded shape (same heading, no photo, no second link of its own,
-- no unpublished draft).
--
-- Safe to run more than once: every insert is guarded with `where not exists`
-- and the menu update only touches a row without a second link.
-- Run in Supabase -> SQL editor.

begin;

insert into pages (slug, title, meta_description)
select 'gift-cards', 'Gift Cards | Trouble Brewing Coffee House, Haddon Heights', 'Give someone Trouble: send an e-gift card for Trouble Brewing Coffee House in Haddon Heights, NJ. Pick an amount, add a note, and it goes by email.'
where not exists (select 1 from pages where slug = 'gift-cards');

insert into sections (page_slug, type, display_order, data, status, visible)
select 'gift-cards', 'gift_cards', 0, $j${"eyebrow": "Gift cards", "heading": "Give someone Trouble", "intro": "For the regular, the early riser, the friend who could use a good morning: send a Trouble Brewing e-gift card straight to their inbox.", "button_label": "Buy an e-gift card", "button_url": "", "how_it_works": "Pick an amount, add a note, and we'll email it.", "occasions_heading": "A little Trouble for…", "occasions_hint": "Tap a card to send one.", "occasion_1_label": "Birthday", "occasion_1_note": "Another lap around the sun calls for a latte.", "occasion_1_art": "cake", "occasion_2_label": "Thank you", "occasion_2_note": "For the neighbor, the sitter, the one who always shows up.", "occasion_2_art": "thanks", "occasion_3_label": "Teacher gift", "occasion_3_note": "Fuel for the people grading papers before first bell.", "occasion_3_art": "apple", "occasion_4_label": "Just because", "occasion_4_note": "No occasion needed. That’s the best kind of Trouble.", "occasion_4_art": "fox", "show_phone": true}$j$::jsonb, 'published', true
where not exists (select 1 from sections where page_slug = 'gift-cards' and type = 'gift_cards');

update sections
   set data = data || $j${"secondary_label": "Buying for someone? Send a gift card", "secondary_url": "/gift-cards"}$j$::jsonb
 where page_slug = 'menu' and type = 'cta' and draft_data is null
   and data->>'heading' = 'Ready to order?'
   and coalesce(data->>'image_url', '') = ''
   and coalesce(data->>'secondary_label', '') = ''
   and coalesce(data->>'secondary_url', '') = '';

commit;
