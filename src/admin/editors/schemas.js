/* Declarative editor schema per section type. The on-page editor's SectionPanel
   renders the right form from these, so every section `type` has an admin editor
   (build plan §4.3) without 20 hand-written forms. Collection-backed types carry
   a `manager` key — the panel routes "Manage —" straight to that collection
   (see src/admin/editor/sectionMeta.js). See docs/CMS.md. */

import { WALL_PIECES } from '../../lib/wallPieces.js';
import { MENU_CATEGORY_ORDER, MENU_CATEGORY_LABELS } from '../../lib/menuService.js';
import { FRAME_STYLE_OPTIONS } from '../../lib/frameStyles.js';

const LAYOUTS = [{ value: 'masonry', label: 'Masonry' }, { value: 'grid', label: 'Grid' }];
const FRAMES = FRAME_STYLE_OPTIONS;
const PHOTO_HINT = 'Blank = no photo. The shop photos we ship live in /images/pages/ — upload your own to replace one.';
const ALT_HINT = 'Describe the photo for someone who can’t see it (and for Google), e.g. “The black front door at 514 Station Ave under the Trouble Brewing sign”.';
const GIFT_ART = [
  { value: 'cake', label: 'Birthday cake' },
  { value: 'thanks', label: 'Envelope with a heart' },
  { value: 'apple', label: 'Apple (teacher)' },
  { value: 'fox', label: 'The fox with his coffee' },
  { value: 'cup', label: 'Steaming cup' },
  { value: 'heart', label: 'Heart' },
];
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
          { value: 'note', label: 'A taped-up note — short, practical things like parking' },
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
    note: 'Add a photo and the band becomes a sage panel with the photo hung in a frame beside it (and room for a second button).',
    fields: [
      { name: 'eyebrow', label: 'Little line above the heading', type: 'text', hint: 'Optional. Shows on the photo panel.' },
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'body', label: 'Body', type: 'textarea', rows: 2 },
      { name: 'button_label', label: 'Button label', type: 'text' },
      { name: 'button_url', label: 'Button link', type: 'text', hint: 'Leave blank (or use an order link) to point at SpotOn ordering.' },
      { name: 'image_url', label: 'Photo', type: 'image', preset: 'card', hint: 'Optional. ' + PHOTO_HINT },
      { name: 'image_alt', label: 'Photo alt text', type: 'text', hint: ALT_HINT },
      { name: 'frame_style', label: 'Frame', type: 'select', options: FRAMES },
      { name: 'secondary_label', label: 'Second button label', type: 'text', hint: 'Optional. A second button on the photo panel; without a photo, a small link under the button.' },
      { name: 'secondary_url', label: 'Second button link', type: 'text' },
    ],
  },
  events_list: {
    manager: 'events',
    note: 'Add and edit events below — each one becomes a poster with a calendar date block (add a photo or flyer to fill the poster). Anything with a date in the past leaves the posters by itself; with “Show past events” on, past events that have a photo move to a photo wall underneath.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'intro', label: 'Line under the heading', type: 'textarea', rows: 2, hint: 'Optional.' },
      { name: 'empty_heading', label: 'Heading when there’s nothing coming up', type: 'text', hint: 'Blank = “Nothing on the calendar just yet”.' },
      { name: 'empty_message', label: 'When there’s nothing coming up', type: 'text', hint: 'Shown when the list is empty. Blank = “Nothing on the calendar right now — check back soon.”' },
      { name: 'empty_image_url', label: 'Photo when there’s nothing coming up', type: 'image', preset: 'card', hint: PHOTO_HINT },
      { name: 'empty_image_alt', label: 'That photo’s alt text', type: 'text', hint: ALT_HINT },
      { name: 'instagram_handle', label: 'Instagram handle to follow', type: 'text', hint: 'Without the @. Blank hides the “Follow us” button.' },
      { name: 'show_past', label: 'Show past events (with photos) as a photo wall', type: 'checkbox' },
      { name: 'past_heading', label: 'Past events heading', type: 'text', hint: 'Blank = “Lately at Trouble”.' },
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
       renders these fields; they publish with the rest of the page. */
    block: {
      key: 'featured_drink',
      title: 'Featured drink',
      note: 'The featured drink goes live with the rest of the page when you press Publish.',
      fields: [
        { name: 'item', label: 'Menu item to feature', type: 'text', hint: 'The exact name as it appears on the menu, e.g. Iced Matcha Latte. Its name, price and photo come live from the menu; if it’s ever switched off, another available drink is featured instead.' },
        { name: 'description', label: 'Description', type: 'textarea', rows: 2, hint: 'Blank uses the menu’s description.' },
        { name: 'image_url', label: 'Photo', type: 'image', preset: 'card', folder: 'featured', hint: 'Blank uses the menu item’s photo.' },
        { name: 'name', label: 'Drink name (manual)', type: 'text', hint: 'Only used when no menu item is chosen above.' },
        { name: 'price', label: 'Price (manual)', type: 'price', hint: 'Only used when no menu item is chosen above.' },
      ],
    },
  },
  signature_drinks: {
    manager: 'menu',
    note: 'These come live from your Menu — same names, prices, descriptions and photos as the Menu page. Name the drinks you want, or leave it blank and we feature the strongest ones in a category.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'subheading', label: 'Line under the heading', type: 'text', hint: 'Optional.' },
      { name: 'items', label: 'Drinks to feature', type: 'tags', hint: 'Exact menu names, comma separated — e.g. Iced Matcha Latte, Iced Chai Latte. Blank = pick automatically.' },
      { name: 'category', label: 'Or feature from', type: 'select', placeholderOption: false, options: MENU_CATEGORIES, hint: 'Used when you leave the list above blank.' },
      { name: 'count', label: 'How many to show', type: 'number', min: 1, hint: '3 fits the row on a desktop; more wrap onto a second row.' },
      { name: 'button_label', label: 'Button label', type: 'text' },
      { name: 'button_url', label: 'Button link', type: 'text', hint: 'A page like /menu, or a full URL.' },
    ],
  },
  food_showcase: {
    manager: 'menu',
    note: 'A shelf of your menu photos that gently bob, with hand-lettered price tags. It fills itself from the Menu: every item whose photo is a background-removed cutout (file name ending in "-cutout") shows up automatically, and tapping one opens your SpotOn order page.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'subheading', label: 'Line under the heading', type: 'text', hint: 'Optional.' },
      { name: 'items', label: 'Only these items', type: 'tags', hint: 'Exact menu names, comma separated, in the order you want them. Blank = every item with a cutout photo.' },
      { name: 'categories', label: 'Only these categories', type: 'tags', hint: 'Any of: espresso, specialty, food, pastry, seasonal. Blank = all.' },
      { name: 'hide_filters', label: 'Hide the category buttons', type: 'checkbox' },
      { name: 'hide_prices', label: 'Hide prices on the tags', type: 'checkbox' },
      { name: 'include_photos', label: 'Include ordinary photos too', type: 'checkbox', hint: 'Off = cutouts only, which look best standing on the shelf.' },
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
      { name: 'eyebrow', label: 'Eyebrow line', type: 'text', hint: 'The little line above the heading, between the little star marks.' },
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
      { name: 'igh_special_text', label: 'Special note text', type: 'text', hint: 'Until you type here it shows the featured drink (Quick Blocks → Featured drink). Type your own text to override it; clear it to hide the note.' },
      { name: 'specials_link', label: 'Special note link URL', type: 'text', hint: '/menu#specials opens the menu on the Specialty tab. Shared by every homepage look.' },
      { name: 'igh_mailchimp_action_url', label: 'Newsletter signup URL (Mailchimp)', type: 'text', hint: 'Shows the "Stay in the Know" signup panel. Blank hides it. See docs/INTEGRATIONS.md.' },
      { name: 'igh_wall_heading', label: 'Line above the wall (phones)', type: 'text', hint: 'The little line over the framed pictures on a phone. Blank = "Have a look around".' },
      { name: 'igh_scene_image_url', label: 'Header image', type: 'image', preset: 'hero', hint: 'The big picture of the room at the top of the homepage. The pictures in its frames are part of this image, so edit them in the image itself and upload the new version here. Blank uses the one we ship.' },
      { name: 'ticker_items', label: 'Ticker strip items', type: 'tags', hint: 'The scrolling marquee under the hero — comma separated.' },
      {
        name: 'igh_pieces',
        label: 'The pictures on your wall',
        type: 'wallpieces',
        defaults: WALL_PIECES,
        hint: 'The label on each frame in the header, where it links, and — on phones, where the wall re-hangs itself as real framed photos — which photo hangs there. Leave a box blank to keep the original.',
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
      { name: 'mch_brand', label: 'Line under the word', type: 'text', hint: 'Shown between the little star marks (Brewing).' },
      { name: 'mch_lead', label: 'Intro paragraph', type: 'textarea', rows: 3 },
      { name: 'mch_drink_image_url', label: 'Drink photo', type: 'image', preset: 'card' },
      { name: 'mch_stats', label: 'Stat row', type: 'textarea', rows: 3, hint: 'One per line, "Big | Little label" — e.g. 20+ | Signature drinks' },
      { name: 'order_label', label: 'Order button text', type: 'text', hint: 'Blank = "Order Now". Shared by every homepage look.' },
      { name: 'ticker_items', label: 'Ticker strip items', type: 'tags', hint: 'The scrolling marquee under the hero — comma separated.' },
    ],
  },
  /* The three real-wall concepts (twh_/clh_/sbh_) hang the shop's own
     photograph of the gallery wall. The photo field warns about the same
     geometry bargain the Gallery Wall page makes: tags, the lens's labels and
     the scribbles are measured against the photo we ship. */
  tagged_wall_hero: {
    fields: [
      { name: 'twh_eyebrow', label: 'Eyebrow line', type: 'text', hint: 'The little line above the heading.' },
      { name: 'twh_title', label: 'Heading', type: 'text', hint: 'Blank = "Come in. Look around."' },
      { name: 'twh_sub', label: 'Subheading', type: 'textarea', rows: 3 },
      { name: 'twh_hint', label: 'Hand-written nudge', type: 'text', hint: 'The scribble under the hours, pointing at the wall. Blank = "Pick a tag, any tag →".' },
      { name: 'order_label', label: 'Order button text', type: 'text', hint: 'Blank = "Order Now". Shared by every homepage look.' },
      { name: 'twh_menu_label', label: 'Second button text', type: 'text', hint: 'Blank = "See the menu".' },
      { name: 'twh_tags', label: 'Tags on the wall', type: 'textarea', rows: 8, hint: 'One per line: "piece | label | link". Pieces: ducks, oval-landscape, botanical, snow-chain, balloon-fox, butterflies, lady-in-red, grey-room, hare, daisies, early-bird, fox-head, pumpkin, the-company, bicycle-fox, cold-out, silhouette, town-hall, the-cup. Blank keeps our seven.' },
      { name: 'twh_photo_url', label: 'The wall photo', type: 'image', preset: 'hero', folder: 'wall', hint: 'Careful: the tags are pinned to frames in the photo we ship. A different picture will still show, but the tags will hang in the wrong places. Blank uses ours.' },
      { name: 'ticker_items', label: 'Ticker strip items', type: 'tags', hint: 'The scrolling marquee under the hero — comma separated.' },
    ],
  },
  closer_look_hero: {
    fields: [
      { name: 'clh_eyebrow', label: 'Eyebrow line', type: 'text', hint: 'The little line above the heading.' },
      { name: 'clh_title', label: 'Heading', type: 'text', hint: 'Blank = "Have a closer look".' },
      { name: 'clh_sub', label: 'Subheading', type: 'textarea', rows: 3 },
      { name: 'order_label', label: 'Order button text', type: 'text', hint: 'Blank = "Order Now". Shared by every homepage look.' },
      { name: 'clh_menu_label', label: 'Second button text', type: 'text', hint: 'Blank = "See the menu".' },
      { name: 'clh_photo_url', label: 'The wall photo', type: 'image', preset: 'hero', folder: 'wall', hint: 'Careful: the magnifying glass knows where each piece is in the photo we ship. A different picture will still show, but the labels will name the wrong art. Blank uses ours. The labels themselves come from Gallery Wall pieces — pin a piece to a spot there and its title and artist show here.' },
      { name: 'ticker_items', label: 'Ticker strip items', type: 'tags', hint: 'The scrolling marquee under the hero — comma separated.' },
    ],
  },
  scrapbook_hero: {
    fields: [
      { name: 'sbh_eyebrow', label: 'Hand-written line', type: 'text', hint: 'The pink scribble above the heading.' },
      { name: 'sbh_title', label: 'Heading', type: 'text' },
      { name: 'sbh_sub', label: 'Subheading', type: 'textarea', rows: 3 },
      { name: 'sbh_hours_label', label: 'Sticky note title', type: 'text', hint: 'Above your live hours. Blank = "Open today".' },
      { name: 'order_label', label: 'Order button text', type: 'text', hint: 'Blank = "Order Now". Shared by every homepage look.' },
      { name: 'sbh_menu_label', label: 'Second button text', type: 'text', hint: 'Blank = "See the menu".' },
      { name: 'sbh_photo_url', label: 'The wall photo', type: 'image', preset: 'hero', folder: 'wall', hint: 'Careful: the hand-written arrows point at things in the photo we ship. Blank uses ours.' },
      { name: 'ticker_items', label: 'Ticker strip items', type: 'tags', hint: 'The scrolling marquee under the hero — comma separated.' },
    ],
  },
  step_inside_hero: {
    note: 'Scroll down the homepage and the photo walks along your wall, one frame per chapter. The drinks, rating and review come from your live menu and Google; the lights follow your hours.',
    fields: [
      { name: 'sih_title', label: 'Heading', type: 'text', hint: 'Blank = "Step inside".' },
      { name: 'sih_sub', label: 'Subheading', type: 'textarea', rows: 3 },
      { name: 'order_label', label: 'Order button text', type: 'text', hint: 'Blank = "Order Now". Shared by every homepage look.' },
      { name: 'sih_photo_url', label: 'The wall photo', type: 'image', preset: 'hero', folder: 'wall', hint: 'Careful: each chapter zooms to a frame measured in the photo we ship. Blank uses ours.' },
      { name: 'ticker_items', label: 'Ticker strip items', type: 'tags', hint: 'The scrolling marquee under the hero — comma separated.' },
    ],
  },
  wall_tour_hero: {
    fields: [
      { name: 'wth_eyebrow', label: 'Eyebrow line', type: 'text', hint: 'The little gold line above the heading.' },
      { name: 'wth_title', label: 'Heading', type: 'text', hint: 'Blank = "Coffee with a view".' },
      { name: 'wth_sub', label: 'Subheading', type: 'textarea', rows: 3 },
      { name: 'order_label', label: 'Order button text', type: 'text', hint: 'Blank = "Order Now". Shared by every homepage look.' },
      { name: 'wth_menu_label', label: 'Second button text', type: 'text', hint: 'Blank = "See the menu".' },
      { name: 'wth_photo_url', label: 'The wall photo', type: 'image', preset: 'hero', folder: 'wall', hint: 'Careful: the tour knows where each piece is in the photo we ship. Blank uses ours.' },
      { name: 'ticker_items', label: 'Ticker strip items', type: 'tags', hint: 'The scrolling marquee under the hero — comma separated.' },
    ],
  },
  pastry_case_hero: {
    note: 'The chalkboard lists drinks and bakes from your live menu (synced from SpotOn), with their prices — nothing to keep up to date here. To show a photo of the REAL chalkboard instead, use Settings → Today’s chalkboard (it switches back to this drawn board on its own after a few days).',
    fields: [
      { name: 'pch_eyebrow', label: 'Hand-written line', type: 'text', hint: 'The yellow scribble above the heading.' },
      { name: 'pch_title', label: 'Heading', type: 'text', hint: 'Blank = "Fresh out of the case".' },
      { name: 'pch_sub', label: 'Subheading', type: 'textarea', rows: 3 },
      { name: 'pch_board_title', label: 'Chalkboard title', type: 'text', hint: 'Blank = "On the board today".' },
      { name: 'pch_drinks', label: 'Drinks on the board', type: 'tags', hint: 'Menu item names, comma separated, exactly as on the menu. Blank = iced matcha, chai, hot matcha and frozen coffee.' },
      { name: 'order_label', label: 'Order button text', type: 'text', hint: 'Blank = "Order Now". Shared by every homepage look.' },
      { name: 'pch_menu_label', label: 'Second button text', type: 'text', hint: 'Blank = "Full menu".' },
      { name: 'pch_photo_url', label: 'Counter photo', type: 'image', preset: 'hero', hint: 'Blank uses the photo of the pastry case we ship.' },
      { name: 'ticker_items', label: 'Ticker strip items', type: 'tags', hint: 'The scrolling marquee under the hero — comma separated.' },
    ],
  },
  gallery_wall_room: {
    note: 'The photograph of your actual wall, with every frame in it clickable. Use “Edit the pieces on the wall” above for names, artists, stories, close-ups, the box around each piece and the wall photo itself.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'intro', label: 'Line under the heading', type: 'textarea', rows: 2 },
      { name: 'hint', label: 'Nudge on the photo', type: 'text', hint: 'The little line that floats over the wall until someone opens a piece. Blank = “Pick something off the wall”.' },
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
    note: 'Your team, as polaroids — a photo, what they do, their go-to drink and a few fun facts. Type their drink exactly as it’s named on the menu and it links to it. Someone without a photo yet gets a “photo coming soon” polaroid. Add and edit them below.',
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
        name: 'layout',
        label: 'Show them as',
        type: 'select',
        placeholderOption: false,
        options: [
          { value: 'street', label: 'A drawn Station Ave you scroll along' },
          { value: 'grid', label: 'A grid of cards' },
        ],
        hint: 'The street draws each business as a little storefront in street-number order. Tap one to see its details.',
      },
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
    note: 'Your milestones — opening day, anniversaries, the drink that took off — hung as framed photos along a picture wire. Give a milestone its own photo below and it shows that; the others borrow the “shop today” photos here, labelled so nobody thinks they’re from that day.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'intro', label: 'Line under the heading', type: 'textarea', rows: 2, hint: 'Optional.' },
      { name: 'fill_images', label: 'Photos for milestones without their own', type: 'images', hint: 'Photos of the shop as it is now. They take turns on any milestone that has no photo of its own.' },
      { name: 'fill_caption', label: 'Label on those photos', type: 'text', hint: 'Blank = “The shop today”. Keeps it honest that they aren’t from the event itself.' },
      { name: 'end_label', label: 'Tag at the end of the wire', type: 'text', hint: 'Blank = “…and counting”.' },
    ],
  },
  /* Photo-led building blocks for the inside pages (About, Location, Events,
     Troublemakers, Timeline): the shop's own photographs hung in the same
     frame moldings as the homepage wall. */
  photo_hero: {
    fields: [
      { name: 'eyebrow', label: 'Little line above the title', type: 'text', hint: 'Optional.' },
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'subheading', label: 'Subheading', type: 'textarea', rows: 2 },
      { name: 'image_url', label: 'Photo', type: 'image', preset: 'hero', hint: PHOTO_HINT },
      { name: 'image_alt', label: 'Photo alt text', type: 'text', hint: ALT_HINT },
      { name: 'caption', label: 'Brass plate under the photo', type: 'text', hint: 'Optional. A few words — e.g. “514 Station Ave”.' },
      {
        name: 'layout',
        label: 'How it looks',
        type: 'select',
        placeholderOption: false,
        options: [
          { value: 'framed', label: 'Framed — the photo hung in a frame beside the heading' },
          { value: 'full', label: 'Full width — the photo behind the heading' },
        ],
      },
      { name: 'frame_style', label: 'Frame (framed look)', type: 'select', options: FRAMES },
      { name: 'focus', label: 'Keep in view', type: 'text', hint: 'Optional. Which part of the photo to keep when it’s cropped, e.g. “center 30%” or “left center”.' },
      { name: 'cta_label', label: 'Button label', type: 'text', hint: 'Leave blank for no button. A label with “Order” and no link goes to SpotOn.' },
      { name: 'cta_url', label: 'Button link', type: 'text', hint: 'A page like /menu, a full https:// address, or tel:+18566176638.' },
      { name: 'secondary_label', label: 'Second button label', type: 'text', hint: 'Optional.' },
      { name: 'secondary_url', label: 'Second button link', type: 'text' },
    ],
  },
  photo_story: {
    note: 'One chapter: a short bit of text beside a framed photo. Stack a few and flip “Photo on” between them so the page zig-zags.',
    fields: [
      { name: 'eyebrow', label: 'Little line above the heading', type: 'text', hint: 'Optional.' },
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'body_markdown', label: 'Text', type: 'markdown', rows: 6, hint: 'Keep it to a short paragraph or two. Supports **bold**, *italic* and [links](https://…).' },
      { name: 'image_url', label: 'Photo', type: 'image', preset: 'hero', hint: PHOTO_HINT },
      { name: 'image_alt', label: 'Photo alt text', type: 'text', hint: ALT_HINT },
      { name: 'caption', label: 'Brass plate under the photo', type: 'text', hint: 'Optional.' },
      { name: 'frame_style', label: 'Frame', type: 'select', options: FRAMES },
      {
        name: 'image_side',
        label: 'Photo on',
        type: 'select',
        placeholderOption: false,
        options: [{ value: 'right', label: 'The right' }, { value: 'left', label: 'The left' }],
      },
      { name: 'inset_url', label: 'Small second photo', type: 'image', preset: 'card', hint: 'Optional. Tucked over the corner of the main frame.' },
      { name: 'inset_alt', label: 'Second photo alt text', type: 'text' },
      { name: 'inset_frame', label: 'Second photo frame', type: 'select', options: FRAMES },
      { name: 'link_label', label: 'Link button label', type: 'text', hint: 'Optional.' },
      { name: 'link_url', label: 'Link button link', type: 'text', hint: 'A page like /neighborhood, or a full URL.' },
      {
        name: 'tone',
        label: 'Background',
        type: 'select',
        placeholderOption: false,
        options: [{ value: 'paper', label: 'Cream paper' }, { value: 'sage', label: 'Sage wall' }],
      },
    ],
  },
  pull_quote: {
    note: 'Only ever a real quote — a customer’s words from a review, or a line from a published write-up — with who said it.',
    fields: [
      { name: 'quote', label: 'Quote', type: 'textarea', rows: 3 },
      { name: 'attribution', label: 'Who said it', type: 'text' },
      { name: 'source', label: 'Where', type: 'text', hint: 'e.g. “Google review” or the publication’s name.' },
    ],
  },
  photo_mosaic: {
    note: 'A few photos hung together. “Salon” mixes frames like your wall (4–6 photos look best); “Row” lines up tall frames.',
    fields: [
      { name: 'eyebrow', label: 'Little line above the heading', type: 'text', hint: 'Optional.' },
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'intro', label: 'Text under the heading', type: 'markdown', rows: 4, hint: 'Optional.' },
      { name: 'badges', label: 'Brass labels', type: 'tags', hint: 'Optional, comma separated — e.g. La Colombe coffee, Metolius tea.' },
      { name: 'images', label: 'Photos', type: 'images', hint: 'Alt text describes each photo. The photos we ship also carry a little name plate; a photo you add here shows without one.' },
      {
        name: 'layout',
        label: 'How they hang',
        type: 'select',
        placeholderOption: false,
        options: [{ value: 'salon', label: 'Salon — mixed frames, like the wall' }, { value: 'strip', label: 'Row — tall frames side by side' }],
      },
      {
        name: 'tone',
        label: 'Background',
        type: 'select',
        placeholderOption: false,
        options: [{ value: 'paper', label: 'Cream paper' }, { value: 'sage', label: 'Sage wall' }],
      },
    ],
  },
  visit_panel: {
    note: 'The map and this week’s hours (live from Settings → Hours, today picked out), side by side. Parking lives in its own “Parking” text block underneath, which the fox also quotes when someone asks where to park.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text', hint: 'Blank = “Find us”.' },
      { name: 'address', label: 'Address', type: 'text', hint: 'Drives both the map and the directions button.' },
      { name: 'directions_label', label: 'Directions button', type: 'text', hint: 'Blank = “Get directions”.' },
      { name: 'phone_label', label: 'Call button', type: 'text', hint: 'Optional, e.g. “Call (856) 617-6638”.' },
      { name: 'phone_url', label: 'Call button link', type: 'text', hint: 'tel:+18566176638' },
      { name: 'hours_heading', label: 'Hours sign title', type: 'text', hint: 'Blank = “This week”.' },
      { name: 'embed_url', label: 'Custom map embed URL', type: 'text', hint: 'Optional — leave blank to build the map from the address above.' },
    ],
  },
  gift_cards: {
    note: 'The Gift Cards page. Every button and every occasion card opens the same SpotOn gift-card page in a new tab. Keep the copy to what’s true for every card (no amounts or expiry rules: SpotOn’s checkout shows those).',
    fields: [
      { name: 'eyebrow', label: 'Little line above the heading', type: 'text', hint: 'Blank = none. We ship “Gift cards”.' },
      { name: 'heading', label: 'Heading', type: 'text', hint: 'Blank = “Give someone Trouble”.' },
      { name: 'intro', label: 'A line under the heading', type: 'textarea', rows: 2, hint: 'Optional.' },
      { name: 'button_label', label: 'Button label', type: 'text', hint: 'Blank = “Buy an e-gift card”.' },
      { name: 'button_url', label: 'Button link (SpotOn gift-card page)', type: 'text', hint: 'The full https:// address of your SpotOn e-gift card page. Leave blank to use the site default (your SpotOn order page, which has a “Purchase gift cards” link).' },
      { name: 'how_it_works', label: 'How it works (one line)', type: 'text', hint: 'Keep it true for every card, e.g. “Pick an amount, add a note, and we’ll email it.”' },
      { name: 'occasions_heading', label: 'Occasion cards heading', type: 'text', hint: 'Blank = “A little Trouble for…”.' },
      { name: 'occasions_hint', label: 'Line under that heading', type: 'text', hint: 'Blank = “Tap a card to send one.”' },
      { name: 'occasion_1_label', label: 'Card 1: occasion', type: 'text', hint: 'Blank hides this card.' },
      { name: 'occasion_1_note', label: 'Card 1: short line', type: 'text' },
      { name: 'occasion_1_art', label: 'Card 1: drawing', type: 'select', options: GIFT_ART },
      { name: 'occasion_2_label', label: 'Card 2: occasion', type: 'text', hint: 'Blank hides this card.' },
      { name: 'occasion_2_note', label: 'Card 2: short line', type: 'text' },
      { name: 'occasion_2_art', label: 'Card 2: drawing', type: 'select', options: GIFT_ART },
      { name: 'occasion_3_label', label: 'Card 3: occasion', type: 'text', hint: 'Blank hides this card.' },
      { name: 'occasion_3_note', label: 'Card 3: short line', type: 'text' },
      { name: 'occasion_3_art', label: 'Card 3: drawing', type: 'select', options: GIFT_ART },
      { name: 'occasion_4_label', label: 'Card 4: occasion', type: 'text', hint: 'Blank hides this card.' },
      { name: 'occasion_4_note', label: 'Card 4: short line', type: 'text' },
      { name: 'occasion_4_art', label: 'Card 4: drawing', type: 'select', options: GIFT_ART },
      { name: 'show_phone', label: 'Show “Questions? Call us” under the cards', type: 'checkbox' },
    ],
  },
  wish_list: {
    note: 'The “Make a wish for the menu” form, the same one as in the fox’s card and on /wish. Wishes land in Wish list. Each visitor can make one wish a day, and nobody leaves an email or phone number.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text', hint: 'Blank = “Make a wish for the menu”.' },
      { name: 'intro', label: 'A line under the heading', type: 'textarea', rows: 2, hint: 'Blank = “A drink or a treat you’d love to see? Tom and Cat read every one.”' },
    ],
  },
};

export function schemaFor(type) {
  return SECTION_EDITOR_SCHEMAS[type] || { fields: [{ name: 'heading', label: 'Heading', type: 'text' }] };
}
