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
      body_a: 'We pull serious espresso, press paninis to order, and turn out warm brioche breakfast sandwiches, fresh-baked scones, and specialty drinks worth the trip — plus gluten-free and vegan options.',
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
    { type: 'rich_text', data: { variant: 'lead', heading: 'Two bankers walk into a coffee shop', body_markdown: 'Tom and Cat spent years in mortgage banking before deciding the world needed one more genuinely good neighborhood coffee shop more than it needed two more bankers. Trouble Brewing is the result: a warm, art-filled room in the heart of Haddon Heights where the coffee is serious and the vibe is not.' } },
    { type: 'rich_text', data: { variant: 'alt', heading: "What's in the cup", body_markdown: "Great coffee shouldn't be complicated — it should be consistent, ethical, and delicious. We pour **La Colombe** beans and pull every shot with care, then build everything from a classic cappuccino to our specialty drinks on top of it." } },
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
  'gallery-wall': [
    { type: 'hero', data: { heading: 'The Gallery Wall', subheading: 'Every frame has a story. Some are even true.', background_image_url: '', cta_label: '', cta_url: '' } },
    { type: 'gallery_pieces_grid', data: { heading: 'The collection', intro: 'Real work by real people, most of it found locally. Where we know who made a piece, their name links to them.' } },
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
  social_links: { instagram: 'https://instagram.com/troublebrewingcoffee', facebook: '', tiktok: '', x: '', youtube: '' },
};

export const GOOGLE_PROFILE = {
  id: 1,
  rating: 4.9,
  review_count: 0,
  reviews: [],
  formatted_address: '514 Station Ave, Haddon Heights, NJ 08035',
  formatted_phone: '(856) 617-6638',
  weekday_hours: [],
  weekday_periods: [],
  maps_url: 'https://www.google.com/maps/search/?api=1&query=Trouble+Brewing+Coffee+House+Haddon+Heights',
};

export const INSTAGRAM_FEED = { id: 1, handle: 'troublebrewingcoffee', posts: [] };

export const TESTIMONIALS = [
  { id: 't-1', author: 'Sarah M.', source: '', rating: 5, quote: 'The Banana Split Coffee is unreal and the team always remembers my order. My favorite spot in Haddon Heights.', featured: true, display_order: 0 },
  { id: 't-2', author: 'Dave R.', source: '', rating: 5, quote: 'Real La Colombe coffee, fresh paninis, and a room you actually want to hang out in. This is what a coffee shop should be.', featured: true, display_order: 1 },
  { id: 't-3', author: 'Priya K.', source: '', rating: 5, quote: 'The cranberry walnut chicken salad panini ruined every other panini for me. Cozy, friendly, local — go.', featured: false, display_order: 2 },
];

/* Starter rows that teach the shape of a good entry — the owners replace them
   with the real pieces off the wall. Note `artist`: the whole point of this
   page is the work and the people who made it, so the field is filled in here
   as a prompt rather than left blank. */
export const GALLERY_PIECES = [
  { id: 'g-1', title: 'The Ornate Gold One', artist: '', artist_url: '', medium: '', year_label: 'Found, undated', frame_style: 'gilt-grand', for_sale: false, story: "Nobody quite remembers where this one came from — it just showed up during the build-out and refused to leave. Now it's the unofficial centerpiece of the wall. (Owner: if you know who made it, add them above — the credit is the best part of this page.)", image_url: '', display_order: 0 },
  { id: 'g-2', title: 'Tiny Oval Mystery', artist: '', artist_url: '', medium: '', year_label: '', frame_style: 'oval-gilt', for_sale: false, story: 'A flea-market find from a rainy Saturday. We bought it for the frame and kept it for the smile it gets out of regulars.', image_url: '', display_order: 1 },
];

/* Starter rows the owners replace with the real team. Note `drink`: "what
   should I order?" is the question these people field all day, and their own
   answer is the most useful thing on the card. */
export const TEAM_MEMBERS = [
  { id: 'tm-1', name: 'Katie', role: 'General Manager', pronouns: '', drink: '', started_label: '', bio: 'Keeps the whole operation running and somehow still remembers your usual.', photo_url: '', fun_facts: { favorite_local_food: '', favorite_movie: '', favorite_book: '', favorite_show: '', favorite_artist: '' }, display_order: 0, active: true },
  { id: 'tm-2', name: 'A Troublemaker', role: 'Barista', pronouns: '', drink: '', started_label: '', bio: 'Pulls shots, makes friends, occasionally causes (delicious) trouble.', photo_url: '', fun_facts: { favorite_local_food: '', favorite_movie: '', favorite_book: '', favorite_show: '', favorite_artist: '' }, display_order: 1, active: true },
];

/* Real Haddon Heights businesses, checked against their own sites, the borough
   business directory and local press (Sept 2026). Ordered by street number,
   which is how the page lays them out — Trouble Brewing's own door at 514 sits
   between Anthony's and Lula's, which is a nicer fact than any copy we could
   write. Owners edit all of it in admin → Local Love; `we_love` is theirs to
   fill in, since only they know what they actually send people for. */
export const LOCAL_BUSINESSES = [
  { id: 'lb-1', name: "Anthony's Creative Italian Cuisine", category: 'restaurant', address: '512 Station Ave', url: 'https://www.anthonysonstation.com/', logo_url: '', photo_url: '', blurb: 'BYOB Italian right next door, in three dining rooms inside a 1930s building. Our closest neighbor by about twenty feet.', we_love: '', display_order: 0 },
  { id: 'lb-2', name: "Lula's Empanadas", category: 'restaurant', address: '516 Station Ave', url: 'https://www.facebook.com/lulasempanadas/', logo_url: '', photo_url: '', blurb: 'Contemporary Dominican empanadas from a takeout window, named after the owner\u2019s mother. Up to eighteen flavors, and a couple of picnic tables out front.', we_love: '', display_order: 1 },
  { id: 'lb-3', name: "Ralph's Pizza", category: 'restaurant', address: '520 Station Ave', url: 'https://ralphspizzahaddonheights.com/', logo_url: '', photo_url: '', blurb: 'Family-run pizza on Station Ave for more than thirty years, with a back room that has hosted half the birthdays in town.', we_love: '', display_order: 2 },
  { id: 'lb-4', name: 'South Jersey Special', category: 'retail', address: '531 Station Ave', url: 'https://southjerseyspecial.com/', logo_url: '', photo_url: '', blurb: 'A gift shop of South Jersey makers \u2014 cards, prints, jewelry and small-batch things, most of it funny, all of it local.', we_love: '', display_order: 3 },
  { id: 'lb-5', name: "Jane's Tea House", category: 'cafe', address: '602 Station Ave', url: 'https://janesteahouse.com/', logo_url: '', photo_url: '', blurb: 'Proper afternoon tea a few doors up. The one place on the street we happily send people for a hot drink.', we_love: '', display_order: 4 },
  { id: 'lb-6', name: 'Cabana Water Ice Co.', category: 'other', address: '603 Station Ave', url: '', logo_url: '', photo_url: '', blurb: 'Homemade water ice and hand-dipped ice cream, going since 1989. The summer half of a Station Ave afternoon.', we_love: '', display_order: 5 },
  { id: 'lb-7', name: 'April Robin Florist & Gift', category: 'retail', address: '620 Station Ave', url: 'https://www.aprilrobinflorist.com/', logo_url: '', photo_url: '', blurb: 'The florist at the top of the avenue \u2014 where the flowers on our counter usually come from.', we_love: '', display_order: 6 },
  { id: 'lb-8', name: "John's Friendly Market", category: 'other', address: '622 Station Ave', url: '', logo_url: '', photo_url: '', blurb: 'The old-fashioned neighborhood grocery and deli. Exactly the sort of place a main street stops being a main street without.', we_love: '', display_order: 7 },
];

export const TIMELINE_EVENTS = [
  { id: 'tl-1', date_label: 'Day One', sort_date: '2021-01-01', title: 'Trouble Brewing opens its doors', description: 'Tom & Cat trade spreadsheets for steamed milk and open Trouble Brewing Coffee House in Haddon Heights. (Owner: update with the real date + story.)', image_url: '', display_order: 0 },
  { id: 'tl-2', date_label: 'Year One', sort_date: '2022-01-01', title: 'Our first anniversary', description: 'One year of regulars, La Colombe, and good Trouble. Thank you, Haddon Heights.', image_url: '', display_order: 1 },
  { id: 'tl-3', date_label: 'A new signature', sort_date: '2023-01-01', title: 'The Banana Split Coffee is born', description: 'Our now-signature, dessert-inspired drink joins the menu and quickly becomes a favorite.', image_url: '', display_order: 2 },
];

export const EVENTS = [];
