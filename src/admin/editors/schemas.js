/* Declarative editor schema per section type. The schema-driven SectionEditor
   renders the right form from these, so every section `type` has an admin editor
   (build plan §4.3) without 20 hand-written forms. Collection-backed types edit
   just their heading and point the owner to the relevant manager. See docs/CMS.md. */

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
    note: 'The featured drink lives in Quick Blocks.',
    fields: [{ name: 'heading', label: 'Heading', type: 'text' }],
  },
  reviews_hero: {
    note: 'The rating + count come live from your Google Profile.',
    fields: [{ name: 'heading', label: 'Heading', type: 'text' }],
  },
  testimonials_wall: {
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
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'subheading', label: 'Subheading', type: 'textarea', rows: 2 },
      { name: 'frames', label: 'Frames', type: 'frames' },
    ],
  },
  warm_storefront_hero: {
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'subheading', label: 'Subheading', type: 'textarea', rows: 2 },
      { name: 'background_image_url', label: 'Background photo', type: 'image', preset: 'hero' },
    ],
  },
  cozy_editorial_hero: {
    fields: [
      { name: 'heading', label: 'Heading', type: 'text' },
      { name: 'subheading', label: 'Subheading', type: 'textarea', rows: 3 },
      { name: 'background_image_url', label: 'Photo', type: 'image', preset: 'hero' },
    ],
  },
  gallery_pieces_grid: {
    note: 'Gallery pieces live in the Gallery Wall manager.',
    fields: [{ name: 'heading', label: 'Heading', type: 'text' }],
  },
  troublemakers_grid: {
    note: 'Team members live in the Troublemakers manager.',
    fields: [{ name: 'heading', label: 'Heading', type: 'text' }],
  },
  local_businesses_grid: {
    note: 'Businesses live in the Local Love manager.',
    fields: [{ name: 'heading', label: 'Heading', type: 'text' }],
  },
};

export function schemaFor(type) {
  return SECTION_EDITOR_SCHEMAS[type] || { fields: [{ name: 'heading', label: 'Heading', type: 'text' }] };
}
