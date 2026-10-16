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
  tagged_wall: 'tagged_wall_hero',
  closer_look: 'closer_look_hero',
  scrapbook: 'scrapbook_hero',
  wall_tour: 'wall_tour_hero',
  pastry_case: 'pastry_case_hero',
};

export const HERO_TYPES = new Set(Object.values(CONCEPT_TO_TYPE));

export const CONCEPTS = [
  { value: 'immersive_gallery', label: 'The Gallery Wall', desc: 'Your room: a wide photo of the shop with your logo over it, the live hours board, today\u2019s special, and every page hung as a real framed picture (lead concept).' },
  { value: 'gallery_wall', label: 'Salon Hang', desc: 'A welcome sign on the sage wall, surrounded by framed links.' },
  { value: 'warm_storefront', label: 'Warm Storefront', desc: 'Big photo of the space + hours + Order.' },
  { value: 'cozy_editorial', label: 'Cozy Editorial', desc: 'Magazine-style story layout.' },
  { value: 'modern_coffee', label: 'Modern Coffee', desc: 'Bold, dark, oversized type with a hero drink shot.' },
  { value: 'tagged_wall', label: 'Tagged Wall', desc: 'Your real gallery-wall photo, with a paper luggage tag tied to the frames \u2014 each tag is a page of the site.' },
  { value: 'closer_look', label: 'Closer Look', desc: 'Your real gallery-wall photo under a brass magnifying glass, with a museum label telling visitors what they\u2019re looking at.' },
  { value: 'scrapbook', label: 'Scrapbook', desc: 'Your real wall photo taped into a scrapbook with hand-written notes, surrounded by snapshots of the shop that link around the site.' },
  { value: 'wall_tour', label: 'Wall Tour', desc: 'Your real wall in a gilt frame under a spotlight, gliding from piece to piece like a museum tour after hours.' },
  { value: 'pastry_case', label: 'Pastry Case', desc: 'Your real counter photo with a chalkboard of today\u2019s drinks and bakes, pulled live from your SpotOn menu with real prices.' },
];
