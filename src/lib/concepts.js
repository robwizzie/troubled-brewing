/* The swappable homepage-hero concepts: content_blocks.homepage_concept picks
   which renderer the home hero row uses (the stored row keeps its own type —
   only the renderer swaps). Shared by Home, the on-page editor, and admin. */

/** The concept the site falls back to before/without a stored choice. */
export const DEFAULT_CONCEPT = 'immersive_gallery';

export const CONCEPT_TO_TYPE = {
  gallery_wall: 'gallery_wall_hero',
  immersive_gallery: 'immersive_gallery_hero',
  warm_storefront: 'warm_storefront_hero',
  cozy_editorial: 'cozy_editorial_hero',
  modern_coffee: 'modern_coffee_hero',
};

export const HERO_TYPES = new Set(Object.values(CONCEPT_TO_TYPE));

export const CONCEPTS = [
  { value: 'immersive_gallery', label: 'The Gallery Wall', desc: 'Your room: a wide photo of the shop with your logo over it, the live hours board, today\u2019s special, and every page hung as a real framed picture (lead concept).' },
  { value: 'gallery_wall', label: 'Salon Hang', desc: 'A welcome sign on the sage wall, surrounded by framed links.' },
  { value: 'warm_storefront', label: 'Warm Storefront', desc: 'Big photo of the space + hours + Order.' },
  { value: 'cozy_editorial', label: 'Cozy Editorial', desc: 'Magazine-style story layout.' },
  { value: 'modern_coffee', label: 'Modern Coffee', desc: 'Bold, dark, oversized type with a hero drink shot.' },
];
