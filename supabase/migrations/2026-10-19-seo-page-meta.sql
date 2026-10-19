-- SEO refresh (2026-10-19): new default page titles + search descriptions.
-- The site's defaults moved to src/lib/seo.js; this brings the live `pages`
-- rows in line WITHOUT touching anything the owner already customised: a
-- column is only updated while it still holds one of the old seeded values.
-- Safe to run more than once. Run in Supabase → SQL Editor.

update pages set title = 'Trouble Brewing Coffee House | Haddon Heights NJ Coffee Shop'
  where slug = 'home' and title in ('Trouble Brewing Coffee House — Haddon Heights, NJ');
update pages set meta_description = 'Independent coffee shop on Station Ave in Haddon Heights, NJ. La Colombe coffee, Metolius teas, breakfast all day, gluten-free sweets and a Pup Cup.'
  where slug = 'home' and (meta_description is null or meta_description = '' or meta_description in ('A warm, independent coffee shop and kitchen in Haddon Heights, NJ. Serious espresso, specialty drinks, fresh paninis, brioche breakfast sandwiches, and scratch-baked pastries.', 'A warm, independent coffee shop in Haddon Heights, NJ pouring La Colombe coffee. Espresso, signature drinks, fresh paninis, and pastries.'));

update pages set title = 'Menu | Trouble Brewing Coffee House, Haddon Heights NJ'
  where slug = 'menu' and title in ('Menu — Trouble Brewing Coffee House');
update pages set meta_description = 'La Colombe espresso drinks, Metolius teas, breakfast sandwiches served all day, lunch melts, fresh bakery and gluten-free sweets. Order ahead online.'
  where slug = 'menu' and (meta_description is null or meta_description = '' or meta_description in ('Espresso, specialty drinks, paninis, and fresh pastries at Trouble Brewing Coffee House in Haddon Heights, NJ. Order online via SpotOn.'));

update pages set title = 'Our Story | Trouble Brewing Coffee House, Haddon Heights'
  where slug = 'about' and title in ('Our Story — Trouble Brewing Coffee House');
update pages set meta_description = 'Haddon Heights locals Tom and Cat opened Trouble Brewing on Station Ave on Friday the 13th, October 2017. Serious coffee, breakfast all day, good Trouble.'
  where slug = 'about' and (meta_description is null or meta_description = '' or meta_description in ('From mortgage bankers to a neighborhood coffee shop. The story of Trouble Brewing in Haddon Heights, NJ — serious coffee, scratch food, and good Trouble.', 'From mortgage bankers to a neighborhood coffee shop. The story of Trouble Brewing and our La Colombe coffee in Haddon Heights, NJ.'));

update pages set title = 'Events | Trouble Brewing Coffee House, Haddon Heights NJ'
  where slug = 'events' and title in ('Events & Community — Trouble Brewing Coffee House');
update pages set meta_description = 'Upcoming events and community gatherings at Trouble Brewing Coffee House, 514 Station Ave in Haddon Heights, NJ. See what''s on, then come say hi.'
  where slug = 'events' and (meta_description is null or meta_description = '' or meta_description in ('Upcoming events at Trouble Brewing Coffee House. Host your own gathering in our Haddon Heights space.'));

update pages set title = 'Hours & Directions | Trouble Brewing Coffee House'
  where slug = 'location' and title in ('Hours & Location — Trouble Brewing Coffee House');
update pages set meta_description = 'Find Trouble Brewing Coffee House at 514 Station Ave, Haddon Heights, NJ 08035, open seven days a week. Hours, parking, directions: (856) 617-6638.'
  where slug = 'location' and (meta_description is null or meta_description = '' or meta_description in ('Visit Trouble Brewing Coffee House at 514 Station Ave, Haddon Heights, NJ. Hours, parking, and directions.'));

update pages set title = 'Contact & Catering | Trouble Brewing Coffee House'
  where slug = 'contact' and title in ('Contact & Catering — Trouble Brewing Coffee House');
update pages set meta_description = 'Call (856) 617-6638 or send a message to Trouble Brewing Coffee House in Haddon Heights, NJ: questions, feedback and catering inquiries.'
  where slug = 'contact' and (meta_description is null or meta_description = '' or meta_description in ('Get in touch with Trouble Brewing Coffee House or send a catering inquiry.'));

update pages set title = 'Our Story So Far | Trouble Brewing Coffee House Timeline'
  where slug = 'timeline' and title in ('Our Story So Far — Trouble Brewing Coffee House');
update pages set meta_description = 'From opening day on Friday the 13th, October 2017, to nine years on Station Ave: the milestones of Trouble Brewing Coffee House in Haddon Heights, NJ.'
  where slug = 'timeline' and (meta_description is null or meta_description = '' or meta_description in ('The Trouble Brewing timeline — opening day, anniversaries, menu launches, and the milestones that made us who we are in Haddon Heights, NJ.'));

update pages set title = 'Reviews | Trouble Brewing Coffee House, Haddon Heights NJ'
  where slug = 'reviews' and title in ('Reviews — Trouble Brewing Coffee House');
update pages set meta_description = 'What neighbors say about Trouble Brewing Coffee House in Haddon Heights, NJ: real Google reviews of our coffee, breakfast and crew. Leave your own.'
  where slug = 'reviews' and (meta_description is null or meta_description = '' or meta_description in ('See what the neighborhood says about Trouble Brewing Coffee House. Read our Google reviews and leave your own.'));

update pages set title = 'The Gallery Wall | Trouble Brewing Coffee House'
  where slug = 'gallery-wall' and title in ('The Gallery Wall — Trouble Brewing Coffee House');
update pages set meta_description = 'The green gallery wall at Trouble Brewing Coffee House: framed art, a gold fox and the curiosities that make our Haddon Heights café feel like home.'
  where slug = 'gallery-wall' and (meta_description is null or meta_description = '' or meta_description in ('The stories behind the framed art on our wall. A little bit of Trouble Brewing history, one frame at a time.'));

update pages set title = 'Meet the Troublemakers | Trouble Brewing Coffee House'
  where slug = 'troublemakers' and title in ('The Troublemakers — Trouble Brewing Coffee House');
update pages set meta_description = 'Meet the Troublemakers, the crew pouring La Colombe coffee and making breakfast all day at Trouble Brewing Coffee House in Haddon Heights, NJ.'
  where slug = 'troublemakers' and (meta_description is null or meta_description = '' or meta_description in ('Meet the Troublemakers — the team behind your coffee at Trouble Brewing Coffee House in Haddon Heights, NJ.'));

update pages set title = 'Local Love: Station Ave Neighbors | Trouble Brewing'
  where slug = 'neighborhood' and title in ('Local Love — Trouble Brewing Coffee House');
update pages set meta_description = 'Our favorite Haddon Heights neighbors on Station Ave: Italian, empanadas, pizza, afternoon tea, flowers and local gifts. Shop small with Trouble Brewing.'
  where slug = 'neighborhood' and (meta_description is null or meta_description = '' or meta_description in ('The Haddon Heights businesses we know and love. Support local with Trouble Brewing Coffee House.'));
