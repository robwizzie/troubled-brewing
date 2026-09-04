/* Declarative editor schema per section type. The on-page editor's SectionPanel
   renders the right form from these, so every section `type` has an admin editor
   (build plan §4.3) without 20 hand-written forms. Collection-backed types carry
   a `manager` key — the panel routes "Manage —" straight to that collection
   (see src/admin/editor/sectionMeta.js). See docs/CMS.md. */

import { WALL_PIECES } from '../../lib/wallPieces.js';
import { MENU_CATEGORY_ORDER, MENU_CATEGORY_LABELS } from '../../lib/menuService.js';

const LAYOUTS = [{ value: 'masonry', label: 'Masonry' }, { value: 'grid', label: 'Grid' }];
const MENU_CATEGORIES = MENU_CATEGORY_ORDER.map((c) => ({ value: c, label: MENU_CATEGORY_LABELS[c] || c }));

export const SECTION_EDITOR_SCHEMAS = {
  hero: {
    fields: [
      { name: 'eyebrow', label: 'Little line above the title', type: 'text', hint: 'Optional. A few words in small caps, e.g. “Since 2021”.' },
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'subheading', label: 'Subheading', type: 'textarea', rows: 2 },
      { name: 'background_image_url', label: 'Background photo', type: 'image', preset: 'hero', hint: 'Optional. Leave it blank and the banner uses the sage-and-cream pattern with the drawn cup and beans, which suits most pages.' },
      { name: 'cta_label', label: 'Button label', type: 'text', hint: 'Leave blank for no button.' },
      { name: 'cta_url', label: 'Button link', type: 'text', hint: 'A page like /menu, a full https:// address, or tel:+18566176638.' },
    ],
  },
  rich_text: {
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'body_markdown', label: 'Body', type: 'markdown', rows: 8, hint: 'Supports simple formatting: **bold**, *italic*, [links](https://…), and lists.' },
      {
        name: 'variant',
        label: 'How it looks',
        type: 'select',
        placeholderOption: false,
        options: [
          { value: '', label: 'Plain — normal text on the page' },
          { value: 'lead', label: 'Opening paragraph — centered and larger, with a coffee cup above' },
          { value: 'alt', label: 'On a soft sage band — good for breaking up a long page' },
        ],
        hint: 'Alternating a couple of blocks onto the sage band is what keeps a long page from reading as one wall of text.',
      },
    ],
  },
  image: {
    fields: [
      { name: 'image_url', label: 'Image', type: 'image', preset: 'hero' },
      { name: 'alt', label: 'Alt text', type: 'text', hint: 'Describe the image for screen readers & SEO.' },
      { name: 'caption', label: 'Caption', type: 'text' },
    ],
  },
  gallery: {
    fields: [
      { name: 'heading', label: 'Heading', type: 'text', hint: 'Optional.' },
      { name: 'images', label: 'Photos', type: 'images', hint: 'Add as many as you like. Alt text describes the photo for screen readers and helps you show up in search.' },
    ],
  },
  menu_block: {
    manager: 'menu',
    note: 'Your menu items live in the Menu manager. This section just shows them with the heading below.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      {
        name: 'layout',
        label: 'How items look',
        type: 'select',
        placeholderOption: false,
        options: [
          { value: 'auto', label: 'Automatic — photo cards once items have photos' },
          { value: 'cards', label: 'Photo cards (same as the homepage)' },
          { value: 'list', label: 'Classic price list' },
        ],
        hint: 'Photo cards are the same card the homepage drinks teaser uses, so a drink looks identical in both places.',
      },
    ],
  },
  hours: {
    note: 'Your opening times live in Settings → Hours, including holiday closures. This section shows them live, so you only ever change them in one place.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'intro', label: 'Line under the heading', type: 'textarea', rows: 2, hint: 'Optional. e.g. “Kitchen closes half an hour before we do.”' },
    ],
  },
  cta: {
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'body', label: 'Body', type: 'textarea', rows: 2 },
      { name: 'button_label', label: 'Button label', type: 'text' },
      { name: 'button_url', label: 'Button link', type: 'text', hint: 'Leave blank (or use an order link) to point at SpotOn ordering.' },
    ],
  },
  events_list: {
    manager: 'events',
    note: 'Add and edit events below. Anything with a date in the past drops off the site by itself — you never have to tidy up.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'intro', label: 'Line under the heading', type: 'textarea', rows: 2, hint: 'Optional.' },
      { name: 'empty_message', label: 'When there’s nothing coming up', type: 'text', hint: 'Shown when the list is empty. Blank = “Nothing on the calendar right now — check back soon.”' },
    ],
  },
  community_board: {
    note: 'What’s flying off the menu and the barista’s pick. Edit the entries in Settings → Quick Blocks.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'intro', label: 'Line under the heading', type: 'textarea', rows: 2, hint: 'Optional.' },
    ],
  },
  instagram: {
    fields: [
      { name: 'heading', label: 'Heading', type: 'text', hint: 'Blank = “Follow the Trouble”.' },
      { name: 'body', label: 'Line under the heading', type: 'textarea', rows: 2, hint: 'Blank uses our default line about latte art and the dog behind the counter.' },
      { name: 'embed_handle', label: 'Instagram handle', type: 'text', hint: 'Without the @.' },
    ],
  },
  map: {
    fields: [
      { name: 'heading', label: 'Heading', type: 'text', hint: 'Blank = “Find us”.' },
      { name: 'address', label: 'Address', type: 'text', hint: 'Drives both the map and the directions button.' },
      { name: 'button_label', label: 'Directions button', type: 'text', hint: 'Blank = “Get directions”.' },
      { name: 'note', label: 'Note under the map', type: 'textarea', rows: 2, hint: 'Optional. The thing people always ask — parking, the lot round the back, which door to use.' },
      { name: 'embed_url', label: 'Custom map embed URL', type: 'text', hint: 'Optional — leave blank to build the map from the address above.' },
    ],
  },
  newsletter: {
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'body', label: 'Body', type: 'textarea', rows: 2 },
      { name: 'mailchimp_action_url', label: 'Mailchimp form URL', type: 'text', hint: 'From your Mailchimp embedded form code.' },
    ],
  },
  featured_drink: {
    fields: [{ name: 'heading', label: 'Heading', type: 'text', hint: 'The little line above the drink name.' }],
    /* The drink itself lives in content_blocks.featured_drink — the panel
       renders these fields with an explicit Save (block saves go live at once). */
    block: {
      key: 'featured_drink',
      title: 'Featured drink',
      note: 'Saving the featured drink updates the live site right away.',
      fields: [
        { name: 'name', label: 'Drink name', type: 'text' },
        { name: 'description', label: 'Description', type: 'textarea', rows: 2 },
        { name: 'price', label: 'Price', type: 'price' },
        { name: 'image_url', label: 'Photo', type: 'image', preset: 'card', folder: 'featured' },
      ],
    },
  },
  signature_drinks: {
    manager: 'menu',
    note: 'These come live from your Menu — same names, prices, descriptions and photos as the Menu page. Name the drinks you want, or leave it blank and we feature the strongest ones in a category.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'subheading', label: 'Line under the heading', type: 'text', hint: 'Optional.' },
      { name: 'items', label: 'Drinks to feature', type: 'tags', hint: 'Exact menu names, comma separated — e.g. Banana Split Coffee, Iced Chai Latte. Blank = pick automatically.' },
      { name: 'category', label: 'Or feature from', type: 'select', placeholderOption: false, options: MENU_CATEGORIES, hint: 'Used when you leave the list above blank.' },
      { name: 'count', label: 'How many to show', type: 'number', min: 1, hint: '3 fits the row on a desktop; more wrap onto a second row.' },
      { name: 'button_label', label: 'Button label', type: 'text' },
      { name: 'button_url', label: 'Button link', type: 'text', hint: 'A page like /menu, or a full URL.' },
    ],
  },
  social_proof: {
    manager: 'reviews',
    note: 'The rating comes from your Google Profile. The quotes are your real Google reviews — featured ones first, then the ones with photos. Manage which ones show below.',
    fields: [
      { name: 'label', label: 'Label', type: 'text' },
      { name: 'count', label: 'How many reviews in the slideshow', type: 'number', min: 3 },
    ],
  },
  reviews_hero: {
    note: 'The star rating and the review count come live from Google, so they’re always current.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'subheading', label: 'Line under the heading', type: 'textarea', rows: 2, hint: 'Optional.' },
    ],
  },
  testimonials_wall: {
    manager: 'testimonials',
    note: 'Your hand-picked favorites. Pick them from your real Google reviews in admin \u2192 Reviews, or write one in here.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'layout', label: 'Layout', type: 'select', options: LAYOUTS },
    ],
  },
  google_reviews_feed: {
    manager: 'reviews',
    note: 'Your real Google reviews. Which ones appear — the star minimum, anything you\u2019ve hidden, the photos you\u2019ve attached — is managed below.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'count', label: 'How many to show at a time', type: 'number', min: 3, hint: 'The rest appear behind a \u201cShow more\u201d button.' },
    ],
  },
  review_cta: {
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'body', label: 'Body', type: 'textarea', rows: 2 },
      { name: 'button_label', label: 'Button label', type: 'text' },
    ],
  },
  gallery_wall_hero: {
    fields: [
      { name: 'eyebrow', label: 'Eyebrow line', type: 'text', hint: 'The little line above the heading, between the ✦ marks.' },
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'subheading', label: 'Subheading', type: 'textarea', rows: 2 },
      { name: 'order_label', label: 'Order button text', type: 'text', hint: 'Blank = "Order Now". Shared by every homepage look.' },
      { name: 'menu_label', label: 'Menu button text', type: 'text', hint: 'The second button. Blank = "See the menu".' },
      { name: 'specials_label', label: 'Specials link text', type: 'text', hint: 'The little link under the welcome sign, next to your live hours.' },
      { name: 'specials_link', label: 'Specials link URL', type: 'text', hint: '/menu#specials opens the menu on the Specialty tab. Any page or full URL works.' },
      { name: 'ticker_items', label: 'Ticker strip items', type: 'tags', hint: 'The scrolling marquee under the hero — comma separated.' },
      { name: 'flank_left_image_url', label: 'Small photo left of the sign', type: 'image', preset: 'card' },
      { name: 'flank_right_image_url', label: 'Small photo right of the sign', type: 'image', preset: 'card' },
      { name: 'frames', label: 'Frames', type: 'frames' },
    ],
  },
  immersive_gallery_hero: {
    fields: [
      { name: 'igh_eyebrow', label: 'Eyebrow line', type: 'text', hint: 'The little line above the logo. Blank = "Welcome to".' },
      { name: 'igh_descriptor', label: 'Descriptor', type: 'text', hint: 'Under the logo. Blank = "Coffee House & Bakery".' },
      { name: 'igh_menu_label', label: 'Menu button text', type: 'text', hint: 'On the Today’s Special note. Blank = "View menu".' },
      { name: 'igh_hours_label', label: 'Chalkboard title', type: 'text', hint: 'Above your live hours. Blank = "Open Daily".' },
      { name: 'igh_address', label: 'Chalkboard address', type: 'text', hint: 'The small print under the hours. Blank for the shop address.' },
      { name: 'igh_special_label', label: 'Special note title', type: 'text', hint: 'The taped note’s heading. Blank = "Today’s Special".' },
      { name: 'igh_special_text', label: 'Special note text', type: 'text', hint: 'e.g. "Honey Almond Latte". Blank hides the note.' },
      { name: 'specials_link', label: 'Special note link URL', type: 'text', hint: '/menu#specials opens the menu on the Specialty tab. Shared by every homepage look.' },
      { name: 'igh_banner_image_url', label: 'Photo behind your name', type: 'image', preset: 'hero', hint: 'The wide shot of the shop at the very top, with your logo lettered over it. A photo of the real room works best.' },
      { name: 'igh_mailchimp_action_url', label: 'Newsletter signup URL (Mailchimp)', type: 'text', hint: 'Shows the "Stay in the Know" signup panel. Blank hides it. See docs/INTEGRATIONS.md.' },
      { name: 'igh_wall_heading', label: 'Line above the wall', type: 'text', hint: 'The little line over the framed pictures. Blank = "Have a look around".' },
      { name: 'ticker_items', label: 'Ticker strip items', type: 'tags', hint: 'The scrolling marquee under the hero — comma separated.' },
      {
        name: 'igh_pieces',
        label: 'The pictures on your wall',
        type: 'wallpieces',
        defaults: WALL_PIECES,
        hint: 'Every framed picture on your homepage — its photo, its label, where it goes and its frame. Leave a box blank to keep the original.',
      },
    ],
  },
  /* Concept heroes use namespaced keys (wsh_/ceh_/mch_) so all four looks can
     share the one hero row's data object without overwriting each other. Blank
     fields fall back to each concept's crafted default copy. */
  warm_storefront_hero: {
    fields: [
      { name: 'wsh_eyebrow', label: 'Eyebrow line', type: 'text', hint: 'The little line above the heading.' },
      { name: 'wsh_title', label: 'Heading', type: 'text' },
      { name: 'wsh_sub', label: 'Subheading', type: 'textarea', rows: 3 },
      { name: 'background_image_url', label: 'Background photo', type: 'image', preset: 'hero' },
      { name: 'order_label', label: 'Order button text', type: 'text', hint: 'Blank = "Order Now". Shared by every homepage look.' },
      { name: 'wsh_ghost_label', label: 'Second button text', type: 'text', hint: 'Blank = "See the menu".' },
      { name: 'ticker_items', label: 'Ticker strip items', type: 'tags', hint: 'The scrolling marquee under the hero — comma separated.' },
    ],
  },
  intro_duo: {
    fields: [
      { name: 'heading_a', label: 'Left heading', type: 'text' },
      { name: 'body_a', label: 'Left text', type: 'markdown', rows: 4 },
      { name: 'heading_b', label: 'Right heading', type: 'text' },
      { name: 'body_b', label: 'Right text', type: 'markdown', rows: 4 },
    ],
  },
  cozy_editorial_hero: {
    fields: [
      { name: 'ceh_eyebrow', label: 'Eyebrow line', type: 'text', hint: 'The little line above the headline.' },
      { name: 'ceh_title', label: 'Headline', type: 'textarea', rows: 3, hint: 'One line per row — the last line gets the italic flourish.' },
      { name: 'ceh_lead', label: 'Intro paragraph', type: 'textarea', rows: 4 },
      { name: 'ceh_signature', label: 'Signature', type: 'text', hint: 'e.g. — Tom & Cat' },
      { name: 'ceh_main_image_url', label: 'Feature photo', type: 'image', preset: 'hero' },
      { name: 'ceh_inset_image_url', label: 'Small overlapping photo', type: 'image', preset: 'card' },
      { name: 'order_label', label: 'Order button text', type: 'text', hint: 'Blank = "Order Now". Shared by every homepage look.' },
      { name: 'ceh_secondary_label', label: 'Second button text', type: 'text', hint: 'Blank = "Our story".' },
      { name: 'ticker_items', label: 'Ticker strip items', type: 'tags', hint: 'The scrolling marquee under the hero — comma separated.' },
    ],
  },
  modern_coffee_hero: {
    fields: [
      { name: 'mch_eyebrow', label: 'Eyebrow line', type: 'text', hint: 'The little line above the big word.' },
      { name: 'mch_word', label: 'Big word', type: 'text', hint: 'The oversized headline word (TROUBLE).' },
      { name: 'mch_brand', label: 'Line under the word', type: 'text', hint: 'Shown between the ✦ marks (Brewing).' },
      { name: 'mch_lead', label: 'Intro paragraph', type: 'textarea', rows: 3 },
      { name: 'mch_drink_image_url', label: 'Drink photo', type: 'image', preset: 'card' },
      { name: 'mch_stats', label: 'Stat row', type: 'textarea', rows: 3, hint: 'One per line, "Big | Little label" — e.g. 20+ | Signature drinks' },
      { name: 'order_label', label: 'Order button text', type: 'text', hint: 'Blank = "Order Now". Shared by every homepage look.' },
      { name: 'ticker_items', label: 'Ticker strip items', type: 'tags', hint: 'The scrolling marquee under the hero — comma separated.' },
    ],
  },
  gallery_pieces_grid: {
    manager: 'gallery',
    note: 'Every piece of art on your wall, with the artist credited and linked. Add and edit them below — a photo, who made it, and the story behind it.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'intro', label: 'Line under the heading', type: 'textarea', rows: 2, hint: 'Optional. A sentence about the wall and the people whose work is on it.' },
    ],
  },
  troublemakers_grid: {
    manager: 'troublemakers',
    note: 'Your team — a photo, what they do, their go-to drink and a few fun facts. Add and edit them below.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'intro', label: 'Line under the heading', type: 'textarea', rows: 2, hint: 'Optional. A sentence introducing the crew.' },
    ],
  },
  local_businesses_grid: {
    manager: 'neighborhood',
    note: 'The businesses themselves live in Local Love below. Give each one a street address and the page lays them out as a walk down the avenue, with your own door marked in place.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'intro', label: 'Line under the heading', type: 'textarea', rows: 2, hint: 'Optional. A sentence about your block.' },
      {
        name: 'order_by',
        label: 'Order them by',
        type: 'select',
        placeholderOption: false,
        options: [
          { value: 'street', label: 'Street number — a walk down the avenue' },
          { value: 'manual', label: 'The order I put them in' },
        ],
      },
      { name: 'show_us', label: 'Mark our own door on the walk', type: 'checkbox', hint: 'Drops a “You are here” card in at 514 Station Ave.' },
    ],
  },
  timeline_grid: {
    manager: 'timeline',
    note: 'Your milestones — opening day, anniversaries, the drink that took off. Add and edit them below.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'intro', label: 'Line under the heading', type: 'textarea', rows: 2, hint: 'Optional.' },
    ],
  },
};

export function schemaFor(type) {
  return SECTION_EDITOR_SCHEMAS[type] || { fields: [{ name: 'heading', label: 'Heading', type: 'text' }] };
}
