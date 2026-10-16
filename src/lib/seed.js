/* =============================================================================
   Bundled fallback content. Mirrors supabase/seed.sql.
   Every data function in dataService.js falls back to this so the public site
   ALWAYS renders real content — before Supabase is configured, and during any
   outage. Keep in sync with seed.sql. (The weekly backup Action can regenerate
   this from live data — see docs/DEPLOYMENT.md §backups.)
   ============================================================================= */

import { asset } from './config.js';
import SPOTON_MENU from '../data/spoton-menu.json';

export const SITE = {
  name: 'Trouble Brewing Coffee House',
  address: '514 Station Ave, Haddon Heights, NJ 08035',
  phone: '(856) 617-6638',
  phoneHref: 'tel:+18566176638',
  instagram: 'troublebrewingcoffee',
  facebook: 'tbcoffeehouse',
  email: 'hello@troublebrewingcoffeehouse.com',
};

export const PAGES = {
  home: { slug: 'home', title: 'Trouble Brewing Coffee House — Haddon Heights, NJ', meta_description: 'A warm, independent coffee shop and kitchen in Haddon Heights, NJ. Serious espresso, specialty drinks, fresh paninis, brioche breakfast sandwiches, and scratch-baked pastries.' },
  menu: { slug: 'menu', title: 'Menu — Trouble Brewing Coffee House', meta_description: 'Espresso, specialty drinks, paninis, and fresh pastries at Trouble Brewing Coffee House in Haddon Heights, NJ. Order online via SpotOn.' },
  about: { slug: 'about', title: 'Our Story — Trouble Brewing Coffee House', meta_description: 'From mortgage bankers to a neighborhood coffee shop. The story of Trouble Brewing in Haddon Heights, NJ — serious coffee, scratch food, and good Trouble.' },
  events: { slug: 'events', title: 'Events & Community — Trouble Brewing Coffee House', meta_description: 'Upcoming events at Trouble Brewing Coffee House. Host your own gathering in our Haddon Heights space.' },
  location: { slug: 'location', title: 'Hours & Location — Trouble Brewing Coffee House', meta_description: 'Visit Trouble Brewing Coffee House at 514 Station Ave, Haddon Heights, NJ. Hours, parking, and directions.' },
  contact: { slug: 'contact', title: 'Contact & Catering — Trouble Brewing Coffee House', meta_description: 'Get in touch with Trouble Brewing Coffee House or send a catering inquiry.' },
  reviews: { slug: 'reviews', title: 'Reviews — Trouble Brewing Coffee House', meta_description: 'See what the neighborhood says about Trouble Brewing Coffee House. Read our Google reviews and leave your own.' },
  'gallery-wall': { slug: 'gallery-wall', title: 'The Gallery Wall — Trouble Brewing Coffee House', meta_description: 'The stories behind the framed art on our wall. A little bit of Trouble Brewing history, one frame at a time.' },
  troublemakers: { slug: 'troublemakers', title: 'The Troublemakers — Trouble Brewing Coffee House', meta_description: 'Meet the Troublemakers — the team behind your coffee at Trouble Brewing Coffee House in Haddon Heights, NJ.' },
  neighborhood: { slug: 'neighborhood', title: 'Local Love — Trouble Brewing Coffee House', meta_description: "The Haddon Heights businesses we know and love. Support local with Trouble Brewing Coffee House." },
  timeline: { slug: 'timeline', title: 'Our Story So Far — Trouble Brewing Coffee House', meta_description: 'The Trouble Brewing timeline — opening day, anniversaries, menu launches, and the milestones that made us who we are in Haddon Heights, NJ.' },
};

export const SECTIONS = {
  home: [
    /* frame_style values are the vintage molding recipes in frameStyles.js —
       one of each, like the real wall (no two frames alike) */
    { type: 'gallery_wall_hero', data: { heading: 'Welcome to Trouble Brewing', subheading: 'A whole wall of reasons to stop in.', specials_label: 'Current Drink Specials', specials_link: '/menu#specials', frames: [
      { label: 'Order / Menu', link: '/menu', frame_style: 'gilt-grand', image_url: asset('images/wall/order-menu.jpg') },
      { label: 'The Troublemakers', link: '/troublemakers', frame_style: 'black-stacked', image_url: asset('images/wall/troublemakers.jpg') },
      { label: 'The Gallery Wall', link: '/gallery-wall', frame_style: 'gold-tapestry', image_url: asset('images/wall/gallery-wall.jpg') },
      { label: 'Events', link: '/events', frame_style: 'oval-black', image_url: asset('images/wall/whats-on.jpg') },
      { label: 'Local Love', link: '/neighborhood', frame_style: 'gold-botanical', image_url: asset('images/wall/local-love.jpg') },
      { label: 'Reviews', link: '/reviews', frame_style: 'oval-gilt', image_url: asset('images/wall/reviews.jpg') },
      { label: 'The Journey', link: '/timeline', frame_style: 'bronze-carved', image_url: asset('images/wall/our-story-so-far.jpg') },
      { label: 'Our Story', link: '/about', frame_style: 'brass-chain', image_url: asset('images/wall/our-story.jpg') },
    ] } },
    { type: 'social_proof', data: { label: 'Loved by the neighborhood', count: 6 } },
    { type: 'featured_drink', data: { heading: "This Week's Trouble" } },
    { type: 'signature_drinks', data: { heading: 'Signature sips', category: 'specialty', count: 3, button_label: 'See the full menu', button_url: '/menu' } },
    { type: 'hours', data: { heading: 'This week at Trouble Brewing' } },
    { type: 'cta', data: { heading: 'Skip the line', body: "Order ahead on SpotOn and we'll have it ready.", button_label: 'Order Now', button_url: '' } },
    { type: 'intro_duo', data: {
      heading_a: 'Good coffee, real food',
      body_a: 'We pull serious espresso, press paninis to order, and turn out warm brioche breakfast sandwiches, fresh-baked scones, and specialty drinks worth the trip — plus gluten-free and vegan options. Breakfast is served all day.',
      heading_b: 'More than a coffee shop',
      body_b: 'Come for an event, meet the Troublemakers behind the counter, or just sink into the green-walled, art-covered room our regulars call a second home. That\'s the good kind of Trouble.',
    } },
    { type: 'instagram', data: { embed_handle: 'troublebrewingcoffee' } },
    { type: 'newsletter', data: { heading: 'Stay in the loop', body: 'New drinks, events, and the occasional bit of Trouble — straight to your inbox.', mailchimp_action_url: '' } },
  ],
  menu: [
    { type: 'menu_block', data: { heading: 'The Menu', categories: ['espresso', 'specialty', 'food', 'pastry', 'seasonal'], layout: 'auto' } },
    { type: 'cta', data: { heading: 'Ready to order?', body: 'Order ahead on SpotOn for pickup.', button_label: 'Order on SpotOn', button_url: '' } },
  ],
  about: [
    { type: 'hero', data: { heading: 'Our Story', subheading: 'From spreadsheets to steamed milk.', background_image_url: '', cta_label: 'See the Menu', cta_url: '/menu' } },
    { type: 'rich_text', data: { variant: 'lead', heading: 'Two bankers walk into a coffee shop', body_markdown: 'Tom and Cat spent years in mortgage banking before deciding the world needed one more genuinely good neighborhood coffee shop more than it needed two more bankers. Haddon Heights residents themselves, they opened Trouble Brewing at 514 Station Ave on **Friday the 13th of October, 2017** — about as on-brand an opening day as a shop called Trouble could ask for. It\'s been a warm, art-filled room where the coffee is serious and the vibe is not ever since.' } },
    { type: 'rich_text', data: { variant: 'alt', heading: "What's in the cup", body_markdown: "Great coffee shouldn't be complicated — it should be consistent, ethical, and delicious. We pour **La Colombe** beans and steep **Metolius** teas, pull every shot with care, and build everything from a classic cappuccino to the season's specialty lattes on top of it." } },
    { type: 'rich_text', data: { heading: 'Why local matters', body_markdown: 'Independent shops are the connective tissue of a town. We buy local where we can, host our neighbors, and try to send everyone back out the door a little more caffeinated and a little more cared-for.' } },
  ],
  /* The old /community page is folded in here: its events list was a duplicate
     of this one, and the board, the loyalty note and the Instagram strip are
     the rest of "community" — they belong on the page people already visit. */
  events: [
    { type: 'hero', data: { heading: 'Events & Community', subheading: "There's always something brewing.", background_image_url: '', cta_label: 'Host an event', cta_url: '/contact' } },
    { type: 'events_list', data: { heading: 'Upcoming at Trouble Brewing' } },
    { type: 'community_board', data: { heading: 'On the Community Board' } },
    { type: 'cta', data: { heading: 'Want to host something?', body: "Showers, meetings, small parties — our space is yours. Tell us what you're planning.", button_label: 'Start a catering inquiry', button_url: '/contact' } },
    { type: 'rich_text', data: { heading: 'Loyalty', body_markdown: "Regulars are the heart of this place. Ask a Troublemaker about our loyalty perks next time you're in. *(Full program details coming soon.)*" } },
    { type: 'instagram', data: { embed_handle: 'troublebrewingcoffee' } },
  ],
  /* Find us BEFORE the hours: someone opening this page on a phone is usually
     standing somewhere trying to get here, and the map is the thing they came
     for. The hours sit right under it, where they read as "…and it's open". */
  location: [
    { type: 'hero', data: { heading: 'Hours & Location', subheading: 'Find us on Station Ave. Pull up a chair and stay a while.', background_image_url: '', cta_label: '', cta_url: '' } },
    { type: 'map', data: { address: '514 Station Ave, Haddon Heights, NJ 08035', embed_url: '' } },
    { type: 'hours', data: { heading: "When we're open" } },
    { type: 'rich_text', data: { heading: 'Parking', body_markdown: 'Street parking is available out front, plus a **lot behind the coffee house**. Enter from White Horse Pike or Atlantic Ave.' } },
    { type: 'cta', data: { heading: 'Come say hi', body: 'Questions? Give us a call.', button_label: 'Call (856) 617-6638', button_url: 'tel:+18566176638' } },
  ],
  contact: [
    { type: 'hero', data: { heading: 'Get in touch', subheading: 'Questions, ideas, or planning something? Use the forms below. We read every message.', background_image_url: '', cta_label: '', cta_url: '' } },
  ],
  reviews: [
    { type: 'reviews_hero', data: { heading: 'What the neighborhood says' } },
    { type: 'testimonials_wall', data: { heading: 'A few of our favorites', layout: 'masonry' } },
    { type: 'google_reviews_feed', data: { heading: 'Fresh from Google', count: 9 } },
    { type: 'review_cta', data: { heading: 'Been in lately?', body: "We'd love to hear about it.", button_label: 'Leave a review on Google' } },
  ],
  /* The page opens ON the wall itself — the shop's own photograph, with every
     frame in it clickable (see GalleryWallRoom.jsx). No hero banner above it:
     a picture of the room is a better opener than a band of type over it, and
     the room carries its own heading. The grid underneath is the same
     collection as a catalogue, for the pieces photographed on their own. */
  'gallery-wall': [
    { type: 'gallery_wall_room', data: { heading: 'The Gallery Wall', intro: 'Every frame on this wall arrived some other way — found, gifted, or made by somebody who drinks here. Have a proper look at any of them.', hint: 'Pick something off the wall', image_url: '' } },
    { type: 'gallery_pieces_grid', data: { heading: 'The collection, close up', intro: 'The same wall, photographed piece by piece. Where we know who made something, their name links to them.' } },
  ],
  troublemakers: [
    { type: 'hero', data: { heading: 'The Troublemakers', subheading: 'The people behind your coffee.', background_image_url: '', cta_label: '', cta_url: '' } },
    { type: 'troublemakers_grid', data: { heading: 'Meet the team', intro: 'The people who will know your order by the third visit.' } },
  ],
  neighborhood: [
    { type: 'hero', data: { heading: 'Local Love', subheading: "The Haddon Heights spots we can't get enough of.", background_image_url: '', cta_label: '', cta_url: '' } },
    { type: 'local_businesses_grid', data: { heading: 'Our neighbors', intro: 'Everyone on this list is a few doors from our own. Station Ave only works because all of it works.', order_by: 'street', show_us: true } },
    { type: 'cta', data: { heading: 'Know a great local spot?', body: "Tell us who we're missing.", button_label: 'Send a suggestion', button_url: '/contact' } },
  ],
  timeline: [
    { type: 'hero', data: { heading: 'Our Story So Far', subheading: 'A few of the moments that made Trouble.', background_image_url: '', cta_label: '', cta_url: '' } },
    { type: 'timeline_grid', data: { heading: 'The Trouble Brewing timeline' } },
  ],
};

/* The bundled menu now tracks SpotOn: the "SpotOn menu sync" workflow scrapes
   the shop's live ordering page daily, updates Supabase, and commits the
   refreshed snapshot here — so even the no-Supabase fallback stays aligned
   with what customers can actually order. See scripts/sync-spoton-menu.mjs. */
export const MENU_ITEMS = SPOTON_MENU.items.map((i) => ({ dietary_flags: [], available: true, ...i }));

// day_of_week: 0=Sun ... 6=Sat
export const HOURS = [
  { day_of_week: 0, open_time: '8:00 AM', close_time: '3:00 PM' },
  { day_of_week: 1, open_time: '7:30 AM', close_time: '7:00 PM' },
  { day_of_week: 2, open_time: '7:30 AM', close_time: '7:00 PM' },
  { day_of_week: 3, open_time: '7:30 AM', close_time: '7:00 PM' },
  { day_of_week: 4, open_time: '7:30 AM', close_time: '7:00 PM' },
  { day_of_week: 5, open_time: '7:30 AM', close_time: '5:00 PM' },
  { day_of_week: 6, open_time: '7:30 AM', close_time: '5:00 PM' },
];

export const HOURS_OVERRIDES = [];

export const CONTENT_BLOCKS = {
  homepage_concept: { concept: 'immersive_gallery' },
  featured_drink: { name: 'Banana Split Coffee', description: 'Our signature dessert-in-a-cup. If you only try one thing, make it this.', price: '6.50', image_url: '' },
  staff_picks: { items: [ { label: 'Flying off the menu', value: 'Cranberry Walnut Chicken Salad Panini' }, { label: "Barista's pick", value: 'Banana Split Coffee' } ] },
  loyalty_copy: { body_markdown: 'Ask a Troublemaker about loyalty perks. Full program details coming soon.' },
  announcement_banner: { enabled: false, message: '' },
  /* Which Google reviews the site shows + the owner's per-review overrides.
     See src/lib/reviews.js — 4★ is the default floor ("only the good ones"). */
  review_settings: { min_rating: 4, hidden: {}, pinned: {}, photos: {} },
  social_links: { instagram: 'https://instagram.com/troublebrewingcoffee', facebook: 'https://www.facebook.com/tbcoffeehouse', tiktok: 'https://www.tiktok.com/@troublebrewingcoffee', x: '', youtube: '' },
};

/* The shop's real Google profile, as last cached by the google-profile Edge
   Function (backups/2026-10-12.json). Live data replaces it as soon as
   Supabase answers; this is what the site shows without it. */
export const GOOGLE_PROFILE = {
  id: 1,
  place_id: 'ChIJaRXwqCHMxokR3omz5QWgCws',
  rating: 4.6,
  review_count: 298,
  reviews: [
  {
    "text": "Definitely one of my favorite coffee shops that I have come across. I love that they collaborate with other local businesses. I’m a big fan of their Milky Way iced coffee, and their breakfast sandwiches are delicious. I love hanging out inside or outside. Their staff are fantastic. I love chatting with them every time I go in.",
    "time": "a month ago",
    "author": "Heather Roth",
    "rating": 5,
    "profile_photo": "https://lh3.googleusercontent.com/a-/ALV-UjWju8uFG9DxuWcjfYDxqRwb_ekPbUOYniQo8fx8GJDUKkfT-7vh=s128-c0x00000000-cc-rp-mo-ba4"
  },
  {
    "text": "My son and I stopped in to have a hot chia and cold latte with breakfast sandwiches and pastries. Great service, drinks and food great. Beautiful town. Been there before. Bonus--it's dog friendly 🦮. Definitely will be back.",
    "time": "3 months ago",
    "author": "Leticia Vega",
    "rating": 5,
    "profile_photo": "https://lh3.googleusercontent.com/a/ACg8ocK2stLWFX1KLwwrysxqUDDVKWLZQ9mR7VR_aAi5xVpzJj5Djg=s128-c0x00000000-cc-rp-mo-ba3"
  },
  {
    "text": "Good coffee for a good price. Blueberry scone was very good massive Blueberrys barista Tyler was friendly and fast would visit again when on a trip from California",
    "time": "2 months ago",
    "author": "Cory Mathews",
    "rating": 5,
    "profile_photo": "https://lh3.googleusercontent.com/a/ACg8ocLsBTv178G6N999q-4pMrmMszxX735ztNc7AFj57o4CZsKy7Mw=s128-c0x00000000-cc-rp-mo-ba5"
  },
  {
    "text": "Coffee was great but they messed up my breakfast order. No bacon in my bagel. Just egg and cheese. My other order pork roll egg and cheese on a jalepeno cheddar bagel was very skimp. I spent $24 with tip for a skimp breakfast. I would recommend the coffee only.",
    "time": "6 months ago",
    "author": "Erika Lorraine",
    "rating": 3,
    "profile_photo": "https://lh3.googleusercontent.com/a-/ALV-UjXaqSU_eTtsUqSFzSx1SCHPOy-vJEjhp7V6aZLzb7VEvbPaV52h=s128-c0x00000000-cc-rp-mo-ba3"
  },
  {
    "text": "While browsing for coffee shops in the area, this one caught my eye. It did not disappoint! This shop is cozy, clearly loved by locals, and has plenty of seating without feeling overcrowded. Chosen decor includes foxes and mushrooms and adds the right touch of whimsy 🍄\nI'm not out this way often but I'll definitely stop again the next time I am!",
    "time": "a month ago",
    "author": "Hazel Stjernelys",
    "rating": 5,
    "profile_photo": "https://lh3.googleusercontent.com/a/ACg8ocJ96fr6hk3y_fKoXrQgKDGMazMNX3TsuHOYDeItFGLXpQBoa2Y=s128-c0x00000000-cc-rp-mo-ba3"
  }
],
  formatted_address: '514 Station Ave, Haddon Heights, NJ 08035',
  formatted_phone: '(856) 617-6638',
  weekday_hours: ["Monday: 7:30 AM – 7:00 PM", "Tuesday: 7:30 AM – 7:00 PM", "Wednesday: 7:30 AM – 7:00 PM", "Thursday: 7:30 AM – 7:00 PM", "Friday: 7:30 AM – 5:00 PM", "Saturday: 7:30 AM – 5:00 PM", "Sunday: 8:00 AM – 3:00 PM"],
  weekday_periods: [],
  lat: 39.882783599999996,
  lng: -75.057658,
  maps_url: 'https://maps.google.com/?cid=795905706350053854',
};

export const INSTAGRAM_FEED = { id: 1, handle: 'troublebrewingcoffee', posts: [] };

/* Real Google reviews the owners picked as favorites (the live testimonials
   table). Nothing here is written by us. */
export const TESTIMONIALS = [
  {"id": "t-1", "author": "Hazel Stjernelys", "source": "Google", "rating": 5, "quote": "While browsing for coffee shops in the area, this one caught my eye. It did not disappoint! This shop is cozy, clearly loved by locals, and has plenty of seating without feeling overcrowded. Chosen decor includes foxes and mushrooms and adds the right touch of whimsy 🍄\nI'm not out this way often but I'll definitely stop again the next time I am!", "image_url": "", "featured": true, "display_order": 0},
  {"id": "t-2", "author": "Cory Mathews", "source": "Google", "rating": 5, "quote": "Good coffee for a good price. Blueberry scone was very good massive Blueberrys barista Tyler was friendly and fast would visit again when on a trip from California", "image_url": "", "featured": false, "display_order": 1},
  {"id": "t-3", "author": "Leticia Vega", "source": "Google", "rating": 5, "quote": "My son and I stopped in to have a hot chia and cold latte with breakfast sandwiches and pastries. Great service, drinks and food great. Beautiful town. Been there before. Bonus--it's dog friendly 🦮. Definitely will be back.", "image_url": "", "featured": false, "display_order": 2},
  {"id": "t-4", "author": "Heather Roth", "source": "Google", "rating": 5, "quote": "Definitely one of my favorite coffee shops that I have come across. I love that they collaborate with other local businesses. I’m a big fan of their Milky Way iced coffee, and their breakfast sandwiches are delicious. I love hanging out inside or outside. Their staff are fantastic. I love chatting with them every time I go in.", "image_url": "", "featured": true, "display_order": 3},
];

/* The catalogued pieces from the wall (title, artist, story, photo). Empty
   until the owners write them up — the Gallery Wall page describes every piece
   in its photograph honestly in the meantime (src/lib/galleryWall.js), which is
   better than the invented backstories that used to sit here. */
export const GALLERY_PIECES = [];

/* Starter rows the owners replace with the real team. Note `drink`: "what
   should I order?" is the question these people field all day, and their own
   answer is the most useful thing on the card. */
export const TEAM_MEMBERS = [
  { id: 'tm-1', name: 'Katie', role: 'General Manager', pronouns: '', drink: '', started_label: '', bio: 'Keeps the whole operation running and somehow still remembers your usual.', photo_url: '', fun_facts: { favorite_local_food: '', favorite_movie: '', favorite_book: '', favorite_show: '', favorite_artist: '' }, display_order: 0, active: true },
];

/* Real Haddon Heights businesses, checked against their own sites, the borough
   business directory and local press (Sept 2026). Ordered by street number,
   which is how the page lays them out — Trouble Brewing's own door at 514 sits
   between Anthony's and Lula's, which is a nicer fact than any copy we could
   write. Owners edit all of it in admin → Local Love; `we_love` is theirs to
   fill in, since only they know what they actually send people for. */
export const LOCAL_BUSINESSES = [
  { id: 'lb-1', name: "Anthony's Creative Italian Cuisine", category: 'restaurant', address: '512 Station Ave', url: 'https://www.anthonysonstation.com/', logo_url: '', photo_url: '', blurb: 'BYOB Italian right next door, in three dining rooms inside a 1930s building. Our closest neighbor by about twenty feet.', we_love: '', display_order: 0 },
  { id: 'lb-2', name: "Lula's Empanadas", category: 'restaurant', address: '516 Station Ave', url: 'https://www.facebook.com/lulasempanadas/', logo_url: '', photo_url: '', blurb: 'Contemporary Dominican empanadas from Yaslyn Lora, named after her mother \u2014 up to eighteen flavors, now from a proper Station Ave storefront. They chipped in prizes for our ninth-birthday raffle.', we_love: '', display_order: 1 },
  { id: 'lb-3', name: "Ralph's Pizza", category: 'restaurant', address: '520 Station Ave', url: 'https://ralphspizzahaddonheights.com/', logo_url: '', photo_url: '', blurb: 'Family-run pizza on Station Ave for more than thirty years, with a back room that has hosted half the birthdays in town. They donated to our ninth-birthday raffle, too.', we_love: '', display_order: 2 },
  { id: 'lb-4', name: 'South Jersey Special', category: 'retail', address: '531 Station Ave', url: 'https://southjerseyspecial.com/', logo_url: '', photo_url: '', blurb: 'Amy Murphy\u2019s gift shop of South Jersey makers \u2014 cards, prints, jewelry and small-batch things, most of it funny, all of it local. Another of our birthday-raffle donors.', we_love: '', display_order: 3 },
  { id: 'lb-5', name: "Jane's Tea House", category: 'cafe', address: '602 Station Ave', url: 'https://janesteahouse.com/', logo_url: '', photo_url: '', blurb: 'Proper afternoon tea a few doors up. The one place on the street we happily send people for a hot drink.', we_love: '', display_order: 4 },
  { id: 'lb-6', name: 'Cabana Water Ice Co.', category: 'other', address: '603 Station Ave', url: '', logo_url: '', photo_url: '', blurb: 'Homemade water ice and hand-dipped ice cream, going since 1989. The summer half of a Station Ave afternoon.', we_love: '', display_order: 5 },
  { id: 'lb-7', name: 'April Robin Florist & Gift', category: 'retail', address: '620 Station Ave', url: 'https://www.aprilrobinflorist.com/', logo_url: '', photo_url: '', blurb: 'The florist at the top of the avenue \u2014 where the flowers on our counter usually come from.', we_love: '', display_order: 6 },
  { id: 'lb-8', name: "John's Friendly Market", category: 'other', address: '622 Station Ave', url: '', logo_url: '', photo_url: '', blurb: 'The old-fashioned neighborhood grocery and deli. Exactly the sort of place a main street stops being a main street without.', we_love: '', display_order: 7 },
];

/* Real milestones only, each one checkable: the opening date from the shop's
   own posts (a 9th birthday on Oct 13, 2026) and New Jersey Isn't Boring's
   2019 write-up ("opened on Friday the 13th in 2017"); the birthday raffle
   and lattes from the shop's Instagram; the review from The Retrospect. */
export const TIMELINE_EVENTS = [
  { id: 'tl-1', date_label: 'Friday the 13th · Oct 2017', sort_date: '2017-10-13', title: 'Trouble opens on Station Ave', description: 'Tom and Cat, Haddon Heights locals, open Trouble Brewing Coffee House at 514 Station Ave — on Friday the 13th, naturally. La Colombe in the grinder, breakfast all day.', image_url: '', display_order: 0 },
  { id: 'tl-2', date_label: 'December 2019', sort_date: '2019-12-07', title: 'The internet finds out', description: 'New Jersey Isn\u2019t Boring writes Trouble up as one of the best spots around to work from a coffee shop — comfy seats, free WiFi, a shelf of books and drinks sized Trouble and Big Trouble.', image_url: '', display_order: 1 },
  { id: 'tl-3', date_label: 'October 2026', sort_date: '2026-10-13', title: 'Nine years of Trouble', description: 'A birthday raffle with prizes from our Station Ave neighbors — Lula\u2019s Empanadas, Ralph\u2019s Pizza, South Jersey Special and Doc\u2019s Unique Boutique — and two birthday lattes: The Max (a dirt-cake iced latte) and The Ruby (cake batter, strawberry cold foam, sprinkles).', image_url: '', display_order: 2 },
  { id: 'tl-4', date_label: 'October 2026', sort_date: '2026-10-14', title: 'A Quick Bites review', description: 'The Retrospect stops in for its Quick Bites column and comes away talking about the cappuccino, the pumpkin spice frozen coffee and the French toast muffin — "a group favorite."', image_url: '', display_order: 3 },
];

export const EVENTS = [];
