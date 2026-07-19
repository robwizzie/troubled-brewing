/* Declarative editor schema per section type. The on-page editor's SectionPanel
   renders the right form from these, so every section `type` has an admin editor
   (build plan §4.3) without 20 hand-written forms. Collection-backed types carry
   a `manager` key — the panel routes "Manage —" straight to that collection
   (see src/admin/editor/sectionMeta.js). See docs/CMS.md. */

const LAYOUTS = [{ value: 'masonry', label: 'Masonry' }, { value: 'grid', label: 'Grid' }];

export const SECTION_EDITOR_SCHEMAS = {
  hero: {
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'subheading', label: 'Subheading', type: 'textarea', rows: 2 },
      { name: 'background_image_url', label: 'Background image', type: 'image', preset: 'hero' },
      { name: 'cta_label', label: 'Button label', type: 'text' },
      { name: 'cta_url', label: 'Button link', type: 'text', hint: 'A page like /menu, or a full URL.' },
    ],
  },
  rich_text: {
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'body_markdown', label: 'Body', type: 'markdown', rows: 8, hint: 'Supports simple formatting: **bold**, *italic*, [links](https://…), and lists.' },
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
      { name: 'images', label: 'Images', type: 'images' },
      { name: 'layout', label: 'Layout', type: 'select', options: [{ value: 'grid', label: 'Grid' }] },
    ],
  },
  menu_block: {
    manager: 'menu',
    note: 'Your menu items live in the Menu manager. This section just shows them with the heading below.',
    fields: [{ name: 'heading', label: 'Heading', type: 'text' }],
  },
  hours: {
    note: 'Your hours live in the Hours editor. This section shows them live.',
    fields: [{ name: 'heading', label: 'Heading', type: 'text' }],
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
    note: 'Events live in the Events manager.',
    fields: [{ name: 'heading', label: 'Heading', type: 'text' }],
  },
  community_board: {
    note: 'The board’s picks live in Quick Blocks.',
    fields: [{ name: 'heading', label: 'Heading', type: 'text' }],
  },
  instagram: {
    fields: [{ name: 'embed_handle', label: 'Instagram handle', type: 'text', hint: 'Without the @.' }],
  },
  map: {
    fields: [
      { name: 'address', label: 'Address', type: 'text' },
      { name: 'embed_url', label: 'Custom map embed URL', type: 'text', hint: 'Optional — leave blank to auto-build from the address.' },
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
    note: 'Drinks come live from your Menu. Leave items blank to auto-feature your specialty drinks.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'button_label', label: 'Button label', type: 'text' },
    ],
  },
  social_proof: {
    manager: 'testimonials',
    note: 'Rating comes from your Google Profile; quotes from the Testimonials manager (featured first).',
    fields: [{ name: 'label', label: 'Label', type: 'text' }],
  },
  reviews_hero: {
    note: 'The rating + count come live from your Google Profile.',
    fields: [{ name: 'heading', label: 'Heading', type: 'text' }],
  },
  testimonials_wall: {
    manager: 'testimonials',
    note: 'Testimonials live in the Testimonials manager.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'layout', label: 'Layout', type: 'select', options: LAYOUTS },
    ],
  },
  google_reviews_feed: {
    note: 'Pulled live from your cached Google reviews.',
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'count', label: 'How many to show', type: 'number' },
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
      { name: 'ticker_items', label: 'Ticker strip items', type: 'tags', hint: 'The scrolling marquee under the hero — comma separated.' },
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
    note: 'Gallery pieces live in the Gallery Wall manager.',
    fields: [{ name: 'heading', label: 'Heading', type: 'text' }],
  },
  troublemakers_grid: {
    manager: 'troublemakers',
    note: 'Team members live in the Troublemakers manager.',
    fields: [{ name: 'heading', label: 'Heading', type: 'text' }],
  },
  local_businesses_grid: {
    manager: 'neighborhood',
    note: 'Businesses live in the Local Love manager.',
    fields: [{ name: 'heading', label: 'Heading', type: 'text' }],
  },
  timeline_grid: {
    manager: 'timeline',
    note: 'Timeline milestones live in the TB Timeline manager.',
    fields: [{ name: 'heading', label: 'Heading', type: 'text' }],
  },
};

export function schemaFor(type) {
  return SECTION_EDITOR_SCHEMAS[type] || { fields: [{ name: 'heading', label: 'Heading', type: 'text' }] };
}
