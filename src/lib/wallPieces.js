import { normalizeFrameStyle } from './frameStyles.js';

/* The homepage wall, as data.

   Every destination hangs as a real framed PHOTOGRAPH from the shop
   (public/images/wall/) in a molding from the shared vocabulary
   (frameStyles.js / `.gw-frame__art--*`), with the same engraved brass
   nameplate the rest of the site uses.

     id      stable key for the owner's overrides — NOT the array position.
             Overrides used to merge by index, which meant adding or removing
             a piece silently re-pointed every saved photo after it.
     frame   the molding
     ar      the piece's shape, so the hang mixes portraits, landscapes,
             squares and ovals like a wall collected over years
     img     the photograph inside it
     small   hangs at ~84% of the column — a wall where every piece is the
             same width reads as a grid, not a salon hang
     motif   drawn stand-in used until the photograph exists
     caption lettering for that stand-in: a board carrying only a glyph reads
             as a photo that failed to load, while the same board with a line
             of lettering reads as a painted sign

   NOTHING HERE IS AI-GENERATED. The hero used to be built over a generated
   café scene with generated art in its frames; the room is now drawn in CSS
   and every picture on the wall is a photograph of the actual shop, so the
   artists whose work hangs in the real room are the only artists on the
   page. See docs/DESIGN.md.

   The owner controls each piece's label, link, photograph and molding from
   the editor (`igh_pieces`); mergeWallPieces() folds those over the defaults
   below. */

export const WALL_PIECES = [
  { id: 'menu', label: 'Menu', to: '/menu', frame: 'gilt-grand', ar: '4 / 5', img: 'images/wall/order-menu.jpg', motif: 'cup' },
  { id: 'about', label: 'About Us', to: '/about', frame: 'brass-chain', ar: '4 / 3', img: 'images/wall/our-story.jpg', motif: 'fox' },
  { id: 'events', label: 'Events', to: '/events', frame: 'oval-black', ar: '1 / 1.1', img: 'images/wall/whats-on.jpg', motif: 'balloon' },
  { id: 'gallery', label: 'Gallery Wall', to: '/gallery-wall', frame: 'gold-tapestry', ar: '3 / 4', img: 'images/wall/gallery-wall.jpg', motif: 'scene' },
  { id: 'local', label: 'Local Love', to: '/neighborhood', frame: 'gold-botanical', ar: '7 / 5', img: 'images/wall/local-love.jpg', motif: 'heart' },
  { id: 'team', label: 'Troublemakers', to: '/troublemakers', frame: 'black-stacked', ar: '1 / 1', img: 'images/wall/troublemakers.jpg', motif: 'hat' },
  { id: 'reviews', label: 'Reviews', to: '/reviews', frame: 'oval-gilt', ar: '1 / 1', img: 'images/wall/reviews.jpg', motif: 'star' },
  /* The one piece with no photograph of its own yet: drop a storefront shot in
     as public/images/wall/location.jpg (or upload one in the editor) and it
     hangs like the rest. Until then it falls back to the painted chalk address
     sign, which is a real wall piece rather than a hole in the hang. */
  { id: 'visit', label: 'Visit Us', to: '/location', frame: 'black-flat', ar: '4 / 3', img: 'images/wall/location.jpg', tint: 'chalk', motif: 'pin', caption: '514 Station Ave\nHaddon Heights' },
  { id: 'timeline', label: 'Our Story', to: '/timeline', frame: 'bronze-carved', ar: '7 / 5', img: 'images/wall/our-story-so-far.jpg', motif: 'book' },
  { id: 'contact', label: 'Contact', to: '/contact', frame: 'gilt-thin', ar: '3 / 4', img: 'images/wall/flank-food.jpg', small: true, motif: 'envelope' },
];

/* The shop's own gold sculptures, hung among the pictures. Keyed to the piece
   they hang under so the masonry carries them into different columns instead
   of stacking them wherever there happens to be room — which is how they sit
   on the real wall, tucked between frames. */
export const WALL_OBJECTS = [
  { after: 'gallery', mod: 'fox', src: 'images/brand/fox-head.webp' },
  { after: 'reviews', mod: 'hare', src: 'images/brand/rabbit-head.webp' },
];

/**
 * Merge the owner's per-piece overrides (the hero's `igh_pieces`) onto the
 * built-in wall.
 *
 * Rows are matched BY `id`, so adding, removing or reordering a piece here
 * never re-points a photograph the owner already chose. Every field is
 * optional and a blank one means "use the built-in", so a half-filled row —
 * a new label but no new photo — keeps everything it didn't set. To hang a
 * piece with no photograph at all, the editor writes the sentinel '-'.
 */
export function mergeWallPieces(overrides) {
  const rows = Array.isArray(overrides) ? overrides : [];
  const byId = new Map(rows.filter((r) => r && r.id).map((r) => [r.id, r]));
  return WALL_PIECES.map((base) => {
    const o = byId.get(base.id) || {};
    return {
      ...base,
      label: (o.label || '').trim() || base.label,
      to: (o.to || '').trim() || base.to,
      img: o.img === '-' ? '' : (o.img || base.img),
      frame: o.frame ? normalizeFrameStyle(o.frame) : base.frame,
    };
  });
}
