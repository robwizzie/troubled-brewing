/* =============================================================================
   Bundled fallback content. Mirrors supabase/seed.sql.
   Every data function in dataService.js falls back to this so the public site
   ALWAYS renders real content — before Supabase is configured, and during any
   outage. Keep in sync with seed.sql. (The weekly backup Action can regenerate
   this from live data — see docs/DEPLOYMENT.md §backups.)
   ============================================================================= */

import { asset } from './config.js';

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
  community: { slug: 'community', title: 'Community — Trouble Brewing Coffee House', meta_description: 'Events, our community board, loyalty, and customer photos from Trouble Brewing Coffee House in Haddon Heights, NJ.' },
  reviews: { slug: 'reviews', title: 'Reviews — Trouble Brewing Coffee House', meta_description: 'See what the neighborhood says about Trouble Brewing Coffee House. Read our Google reviews and leave your own.' },
  'gallery-wall': { slug: 'gallery-wall', title: 'The Gallery Wall — Trouble Brewing Coffee House', meta_description: 'The stories behind the framed art on our wall. A little bit of Trouble Brewing history, one frame at a time.' },
  troublemakers: { slug: 'troublemakers', title: 'The Troublemakers — Trouble Brewing Coffee House', meta_description: 'Meet the Troublemakers — the team behind your coffee at Trouble Brewing Coffee House in Haddon Heights, NJ.' },
  neighborhood: { slug: 'neighborhood', title: 'Local Love — Trouble Brewing Coffee House', meta_description: "The Haddon Heights businesses we know and love. Support local with Trouble Brewing Coffee House." },
  timeline: { slug: 'timeline', title: 'Our Story So Far — Trouble Brewing Coffee House', meta_description: 'The Trouble Brewing timeline — opening day, anniversaries, menu launches, and the milestones that made us who we are in Haddon Heights, NJ.' },
};

export const SECTIONS = {
  home: [
    { type: 'gallery_wall_hero', data: { heading: 'Welcome to Trouble Brewing', subheading: 'A whole wall of reasons to stop in.', frames: [
      { label: 'Order / Menu', link: '/menu', frame_style: 'ornate', image_url: asset('images/wall/order-menu.jpg') },
      { label: 'The Troublemakers', link: '/troublemakers', frame_style: 'pink', image_url: asset('images/wall/troublemakers.jpg') },
      { label: 'The Gallery Wall', link: '/gallery-wall', frame_style: 'ornate', image_url: asset('images/wall/gallery-wall.jpg') },
      { label: 'Events', link: '/events', frame_style: 'oval-black', image_url: asset('images/wall/whats-on.jpg') },
      { label: 'Local Love', link: '/neighborhood', frame_style: 'oval-pink', image_url: asset('images/wall/local-love.jpg') },
      { label: 'Reviews', link: '/reviews', frame_style: 'oval-gold', image_url: asset('images/wall/reviews.jpg') },
      { label: 'The Journey', link: '/timeline', frame_style: 'ornate', image_url: asset('images/wall/our-story-so-far.jpg') },
      { label: 'Our Story', link: '/about', frame_style: 'black', image_url: asset('images/wall/our-story.jpg') },
    ] } },
    { type: 'social_proof', data: { label: 'Loved by the neighborhood' } },
    { type: 'featured_drink', data: { heading: "This Week's Trouble" } },
    { type: 'signature_drinks', data: { heading: 'Signature sips', button_label: 'See the full menu' } },
    { type: 'hours', data: { heading: 'Today at Trouble Brewing' } },
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
    { type: 'menu_block', data: { heading: 'The Menu', categories: ['espresso', 'specialty', 'food', 'pastry', 'seasonal'] } },
    { type: 'cta', data: { heading: 'Ready to order?', body: 'Order ahead on SpotOn for pickup.', button_label: 'Order on SpotOn', button_url: '' } },
  ],
  about: [
    { type: 'hero', data: { heading: 'Our Story', subheading: 'From spreadsheets to steamed milk.', background_image_url: '', cta_label: 'See the Menu', cta_url: '/menu' } },
    { type: 'rich_text', data: { variant: 'lead', heading: 'Two bankers walk into a coffee shop', body_markdown: 'Tom and Cat spent years in mortgage banking before deciding the world needed one more genuinely good neighborhood coffee shop more than it needed two more bankers. Trouble Brewing is the result: a warm, art-filled room in the heart of Haddon Heights where the coffee is serious and the vibe is not.' } },
    { type: 'rich_text', data: { variant: 'alt', heading: "What's in the cup", body_markdown: "Great coffee shouldn't be complicated — it should be consistent, ethical, and delicious. We pour **La Colombe** beans and pull every shot with care, then build everything from a classic cappuccino to our specialty drinks on top of it." } },
    { type: 'rich_text', data: { heading: 'Why local matters', body_markdown: 'Independent shops are the connective tissue of a town. We buy local where we can, host our neighbors, and try to send everyone back out the door a little more caffeinated and a little more cared-for.' } },
  ],
  events: [
    { type: 'hero', data: { heading: 'Events & Community', subheading: "There's always something brewing.", background_image_url: '', cta_label: 'Host an event', cta_url: '/contact' } },
    { type: 'events_list', data: { heading: 'Upcoming at Trouble Brewing' } },
    { type: 'cta', data: { heading: 'Want to host something?', body: "Showers, meetings, small parties — our space is yours. Tell us what you're planning.", button_label: 'Start a catering inquiry', button_url: '/contact' } },
  ],
  location: [
    { type: 'hero', data: { heading: 'Hours & Location', subheading: 'Find us on Station Ave. Pull up a chair and stay a while.', background_image_url: '', cta_label: '', cta_url: '' } },
    { type: 'hours', data: { heading: "When we're open" } },
    { type: 'map', data: { address: '514 Station Ave, Haddon Heights, NJ 08035', embed_url: '' } },
    { type: 'rich_text', data: { heading: 'Parking', body_markdown: 'Street parking is available out front, plus a **lot behind the coffee house**. Enter from White Horse Pike or Atlantic Ave.' } },
    { type: 'cta', data: { heading: 'Come say hi', body: 'Questions? Give us a call.', button_label: 'Call (856) 617-6638', button_url: 'tel:+18566176638' } },
  ],
  contact: [
    { type: 'hero', data: { heading: 'Get in touch', subheading: 'Questions, ideas, or planning something? Use the forms below. We read every message.', background_image_url: '', cta_label: '', cta_url: '' } },
  ],
  community: [
    { type: 'hero', data: { heading: 'Community', subheading: "Events, the board, and a little neighborhood love. There's always something brewing.", background_image_url: '', cta_label: '', cta_url: '' } },
    { type: 'events_list', data: { heading: "What's coming up" } },
    { type: 'community_board', data: { heading: 'On the Community Board' } },
    { type: 'rich_text', data: { heading: 'Loyalty', body_markdown: "Regulars are the heart of this place. Ask a Troublemaker about our loyalty perks next time you're in. *(Full program details coming soon.)*" } },
    { type: 'instagram', data: { embed_handle: 'troublebrewingcoffee' } },
  ],
  reviews: [
    { type: 'reviews_hero', data: { heading: 'What the neighborhood says' } },
    { type: 'testimonials_wall', data: { heading: 'A few of our favorites', layout: 'masonry' } },
    { type: 'google_reviews_feed', data: { heading: 'Fresh from Google', count: 5 } },
    { type: 'review_cta', data: { heading: 'Been in lately?', body: "We'd love to hear about it.", button_label: 'Leave a review on Google' } },
  ],
  'gallery-wall': [
    { type: 'hero', data: { heading: 'The Gallery Wall', subheading: 'Every frame has a story. Some are even true.', background_image_url: '', cta_label: '', cta_url: '' } },
    { type: 'gallery_pieces_grid', data: { heading: 'The collection' } },
  ],
  troublemakers: [
    { type: 'hero', data: { heading: 'The Troublemakers', subheading: 'The people behind your coffee.', background_image_url: '', cta_label: '', cta_url: '' } },
    { type: 'troublemakers_grid', data: { heading: 'Meet the team' } },
  ],
  neighborhood: [
    { type: 'hero', data: { heading: 'Local Love', subheading: "The Haddon Heights spots we can't get enough of.", background_image_url: '', cta_label: '', cta_url: '' } },
    { type: 'local_businesses_grid', data: { heading: 'Our neighbors' } },
    { type: 'cta', data: { heading: 'Know a great local spot?', body: "Tell us who we're missing.", button_label: 'Send a suggestion', button_url: '/contact' } },
  ],
  timeline: [
    { type: 'hero', data: { heading: 'Our Story So Far', subheading: 'A few of the moments that made Trouble.', background_image_url: '', cta_label: '', cta_url: '' } },
    { type: 'timeline_grid', data: { heading: 'The Trouble Brewing timeline' } },
  ],
};

export const MENU_ITEMS = [
  { id: 's-1', name: 'Cappuccino', description: 'Espresso and steamed milk, balanced and classic.', price: 4.5, category: 'espresso', dietary_flags: [], available: true, display_order: 0 },
  { id: 's-2', name: 'Iced Chai Latte', description: 'Spiced chai over ice with milk — cozy, even cold.', price: 5.5, category: 'specialty', dietary_flags: [], available: true, display_order: 1 },
  { id: 's-3', name: 'Banana Split Coffee', description: "Our signature: a playful, dessert-inspired coffee you can't get anywhere else.", price: 6.5, category: 'specialty', dietary_flags: [], available: true, display_order: 2 },
  { id: 's-4', name: 'Coffee Flight', description: 'A tasting flight through our espresso lineup.', price: 9.0, category: 'specialty', dietary_flags: [], available: true, display_order: 3 },
  { id: 's-5', name: 'Croissant', description: 'Buttery, flaky, baked-fresh.', price: 3.75, category: 'pastry', dietary_flags: [], available: true, display_order: 4 },
  { id: 's-6', name: 'Brioche Breakfast Sandwich', description: 'Egg and cheese on soft brioche. Add pork roll or bacon.', price: 7.5, category: 'food', dietary_flags: [], available: true, display_order: 5 },
  { id: 's-7', name: 'Scone', description: "Rotating flavors — ask what's in today.", price: 3.5, category: 'pastry', dietary_flags: [], available: true, display_order: 6 },
  { id: 's-8', name: 'Buffalo Chicken Panini', description: "Spicy three-cheese, Frank's RedHot, fire-braised chicken on seeded rye.", price: 11.0, category: 'food', dietary_flags: [], available: true, display_order: 7 },
  { id: 's-9', name: 'Cranberry Walnut Chicken Salad Panini', description: 'Our most popular — cranberry walnut chicken salad, pressed warm.', price: 11.0, category: 'food', dietary_flags: [], available: true, display_order: 8 },
  { id: 's-10', name: 'BLT', description: 'Bacon, lettuce, tomato on seeded rye.', price: 9.5, category: 'food', dietary_flags: [], available: true, display_order: 9 },
  { id: 's-11', name: 'Gluten-Free Cookie', description: 'All the cookie, none of the gluten.', price: 3.25, category: 'pastry', dietary_flags: ['gluten-free'], available: true, display_order: 10 },
  { id: 's-12', name: 'Vegan Cookie', description: 'Plant-based and genuinely good.', price: 3.25, category: 'pastry', dietary_flags: ['vegan'], available: true, display_order: 11 },
];

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
  homepage_concept: { concept: 'gallery_wall' },
  featured_drink: { name: 'Banana Split Coffee', description: 'Our signature dessert-in-a-cup. If you only try one thing, make it this.', price: '6.50', image_url: '' },
  staff_picks: { items: [ { label: 'Flying off the menu', value: 'Cranberry Walnut Chicken Salad Panini' }, { label: "Barista's pick", value: 'Banana Split Coffee' } ] },
  loyalty_copy: { body_markdown: 'Ask a Troublemaker about loyalty perks. Full program details coming soon.' },
  announcement_banner: { enabled: false, message: '' },
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
  maps_url: 'https://www.google.com/maps/search/?api=1&query=Trouble+Brewing+Coffee+House+Haddon+Heights',
};

export const TESTIMONIALS = [
  { id: 't-1', author: 'Sarah M.', source: 'Google', rating: 5, quote: 'The Banana Split Coffee is unreal and the team always remembers my order. My favorite spot in Haddon Heights.', featured: true, display_order: 0 },
  { id: 't-2', author: 'Dave R.', source: 'Google', rating: 5, quote: 'Real La Colombe coffee, fresh paninis, and a room you actually want to hang out in. This is what a coffee shop should be.', featured: true, display_order: 1 },
  { id: 't-3', author: 'Priya K.', source: 'Google', rating: 5, quote: 'The cranberry walnut chicken salad panini ruined every other panini for me. Cozy, friendly, local — go.', featured: false, display_order: 2 },
];

export const GALLERY_PIECES = [
  { id: 'g-1', title: 'The Ornate Gold One', story: "Nobody quite remembers where this one came from — it just showed up during the build-out and refused to leave. Now it's the unofficial centerpiece of the wall.", image_url: '', display_order: 0 },
  { id: 'g-2', title: 'Tiny Oval Mystery', story: 'A flea-market find from a rainy Saturday. We bought it for the frame and kept it for the smile it gets out of regulars.', image_url: '', display_order: 1 },
];

export const TEAM_MEMBERS = [
  { id: 'tm-1', name: 'Katie', role: 'General Manager', bio: 'Keeps the whole operation running and somehow still remembers your usual.', photo_url: '', fun_facts: { favorite_local_food: '—', favorite_movie: '—', favorite_book: '—', favorite_show: '—', favorite_artist: '—' }, display_order: 0, active: true },
  { id: 'tm-2', name: 'A Troublemaker', role: 'Barista', bio: 'Pulls shots, makes friends, occasionally causes (delicious) trouble.', photo_url: '', fun_facts: { favorite_local_food: '—', favorite_movie: '—', favorite_book: '—', favorite_show: '—', favorite_artist: '—' }, display_order: 1, active: true },
];

export const LOCAL_BUSINESSES = [
  { id: 'lb-1', name: "Anthony's", category: 'restaurant', blurb: 'A neighborhood favorite we love to send people to. (Owner: confirm details + add a link.)', url: '', photo_url: '', display_order: 0 },
  { id: 'lb-2', name: "Ralph's", category: 'restaurant', blurb: 'Good food, good people, right around the corner. (Owner: confirm details + add a link.)', url: '', photo_url: '', display_order: 1 },
  { id: 'lb-3', name: "Lula's", category: 'cafe', blurb: 'One of the local spots that makes Haddon Heights special. (Owner: confirm details + add a link.)', url: '', photo_url: '', display_order: 2 },
];

export const TIMELINE_EVENTS = [
  { id: 'tl-1', date_label: 'Day One', sort_date: '2021-01-01', title: 'Trouble Brewing opens its doors', description: 'Tom & Cat trade spreadsheets for steamed milk and open Trouble Brewing Coffee House in Haddon Heights. (Owner: update with the real date + story.)', image_url: '', display_order: 0 },
  { id: 'tl-2', date_label: 'Year One', sort_date: '2022-01-01', title: 'Our first anniversary', description: 'One year of regulars, La Colombe, and good Trouble. Thank you, Haddon Heights.', image_url: '', display_order: 1 },
  { id: 'tl-3', date_label: 'A new signature', sort_date: '2023-01-01', title: 'The Banana Split Coffee is born', description: 'Our now-signature, dessert-inspired drink joins the menu and quickly becomes a favorite.', image_url: '', display_order: 2 },
];

export const EVENTS = [];
