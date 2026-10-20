/* The swappable homepage-hero concepts: content_blocks.homepage_concept picks
   which renderer the home hero row uses (the stored row keeps its own type —
   only the renderer swaps). Shared by Home, the on-page editor, and admin. */

/** The concept the site falls back to before/without a stored choice. */
export const DEFAULT_CONCEPT = 'pastry_case';

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
  step_inside: 'step_inside_hero',
};

export const HERO_TYPES = new Set(Object.values(CONCEPT_TO_TYPE));

/* `short` is the one-liner on the admin picker's cards; `desc` is the longer
   note (switcher tooltips, docs). */
export const CONCEPTS = [
  { value: 'immersive_gallery', label: 'The Gallery Wall', short: 'A wide photo of the shop, with every page hung as a framed picture.', desc: 'Your room: a wide photo of the shop with your logo over it, the live hours board, today\u2019s special, and every page hung as a real framed picture (lead concept).' },
  { value: 'gallery_wall', label: 'Salon Hang', short: 'A welcome sign on the sage wall, surrounded by framed links.', desc: 'A welcome sign on the sage wall, surrounded by framed links.' },
  { value: 'warm_storefront', label: 'Warm Storefront', short: 'A big photo of the space, with your hours and an Order button.', desc: 'Big photo of the space + hours + Order.' },
  { value: 'cozy_editorial', label: 'Cozy Editorial', short: 'A magazine-style layout that tells your story.', desc: 'Magazine-style story layout.' },
  { value: 'modern_coffee', label: 'Modern Coffee', short: 'Bold, dark and oversized, with a hero drink shot.', desc: 'Bold, dark, oversized type with a hero drink shot.' },
  { value: 'tagged_wall', label: 'Tagged Wall', short: 'Your wall photo, with a paper luggage tag for each page.', desc: 'Your real gallery-wall photo, with a paper luggage tag tied to the frames \u2014 each tag is a page of the site.' },
  { value: 'closer_look', label: 'Closer Look', short: 'Your wall under a brass magnifying glass, with a museum label.', desc: 'Your real gallery-wall photo under a brass magnifying glass, with a museum label telling visitors what they\u2019re looking at.' },
  { value: 'scrapbook', label: 'Scrapbook', short: 'Your wall photo taped into a scrapbook, with hand-written notes.', desc: 'Your real wall photo taped into a scrapbook with hand-written notes, surrounded by snapshots of the shop that link around the site.' },
  { value: 'step_inside', label: 'Step Inside', short: 'A scroll walk along your wall, one frame per chapter.', desc: 'A scroll walk along your real wall: each frame opens a chapter with live menu prices, your real rating and reviews, your story and your neighbours. The room\u2019s lights follow your opening hours.' },
  { value: 'wall_tour', label: 'Wall Tour', short: 'Your wall in a gilt frame, toured piece by piece.', desc: 'Your real wall in a gilt frame under a spotlight, gliding from piece to piece like a museum tour after hours.' },
  { value: 'pastry_case', label: 'Pastry Case', short: 'Your counter photo, with today\u2019s drinks and bakes in chalk.', desc: 'Your real counter photo with a chalkboard of today\u2019s drinks and bakes, pulled live from your SpotOn menu with real prices.' },
];
