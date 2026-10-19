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
  food_showcase: {
    manager: 'menu',
    note: 'A shelf of your menu photos that gently bob, with hand-lettered price tags. It fills itself from the Menu: every item whose photo is a background-removed cutout (file name ending in "-cutout") shows up automatically, and tapping one jumps to it on the Menu page.',
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
      { name: 'mch_brand', label: 'Line under the word', type: 'text', hint: 'Shown between the ✦ marks (Brewing).' },
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
    note: 'The chalkboard lists drinks and bakes from your live menu (synced from SpotOn), with their prices — nothing to keep up to date here.',
    fields: [
      { name: 'pch_eyebrow', label: 'Hand-written line', type: 'text', hint: 'The yellow scribble above the heading.' },
      { name: 'pch_title', label: 'Heading', type: 'text', hint: 'Blank = "Fresh out of the case".' },
      { name: 'pch_sub', label: 'Subheading', type: 'textarea', rows: 3 },
      { name: 'pch_board_title', label: 'Chalkboard title', type: 'text', hint: 'Blank = "On the board today".' },
      { name: 'pch_drinks', label: 'Drinks on the board', type: 'tags', hint: 'Menu item names, comma separated, exactly as on the menu. Blank = Banana Split Coffee, chai, matcha and frozen coffee.' },
      { name: 'order_label', label: 'Order button text', type: 'text', hint: 'Blank = "Order Now". Shared by every homepage look.' },
      { name: 'pch_menu_label', label: 'Second button text', type: 'text', hint: 'Blank = "Full menu".' },
      { name: 'pch_photo_url', label: 'Counter photo', type: 'image', preset: 'hero', hint: 'Blank uses the photo of the pastry case we ship.' },
      { name: 'ticker_items', label: 'Ticker strip items', type: 'tags', hint: 'The scrolling marquee under the hero — comma separated.' },
    ],
  },
  gallery_wall_room: {
    manager: 'gallery',
    note: 'The photograph of your actual wall, with every frame in it clickable. Pieces you add below can be pinned to a frame in the photo — pick “Where it hangs on the wall photo” on a piece and its artist, story and photo show up when a visitor opens that frame.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'intro', label: 'Line under the heading', type: 'textarea', rows: 2 },
      { name: 'hint', label: 'Nudge on the photo', type: 'text', hint: 'The little line that floats over the wall until someone opens a piece. Blank = “Pick something off the wall”.' },
      {
        name: 'image_url',
        label: 'The wall photo',
        type: 'image',
        preset: 'hero',
        folder: 'wall',
        hint: 'Careful: the clickable frames are measured against the photo we ship (public/images/wall/gallery-wall.jpg). A different picture of the wall will still show, but the hotspots will be in the wrong places until they are re-measured in code. Blank uses ours.',
      },
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
