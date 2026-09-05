import { normalizeFrameStyle } from './frameStyles.js';

/* The homepage wall, as data — one entry per destination, carrying BOTH of the
   places a piece hangs:

     the scene   `x/y/w/h` are % boxes over the room artwork
                 (public/images/wall/immersive-scene.jpg, 1536×1024), tuned to
                 hug each painted frame's molding so the brass nameplate lands
                 exactly on its bottom edge. Nothing is drawn INSIDE the box —
                 the pictures in the room are part of the artwork, and are
                 edited there. THE GEOMETRY IS TIED TO THE ARTWORK — re-tune if
                 the room is ever re-exported with the frames moved.

     the wall    on a phone the room becomes a banner and the wall re-hangs
                 itself as a salon hang: `frame` is a molding from the shared
                 vocabulary (frameStyles.js / `.gw-frame__art--*`), `ar` its
                 shape, `small` hangs it at ~84% of the column so the hang
                 reads as collected rather than laid out.

   Shared by both: `img`, the shop's own photograph, and `motif` + `caption`,
   the hand-lettered sign shown until that photograph exists.

   `id` is the stable key for the owner's overrides — NOT the array position.
   Overrides used to merge by index, which meant adding or removing a piece
   silently re-pointed every saved photo after it.

   The owner controls each piece's label, link, photograph and molding from the
   editor (`igh_pieces`); mergeWallPieces() folds those over the defaults. */

export const WALL_PIECES = [
  { id: 'menu', label: 'Menu', to: '/menu', x: 18.4, y: 9.0, w: 19.9, h: 17.1, frame: 'gilt-grand', ar: '4 / 5', img: 'images/wall/order-menu.jpg', motif: 'cup' },
  { id: 'about', label: 'About Us', to: '/about', x: 39.7, y: 6.6, w: 17.6, h: 17.8, frame: 'brass-chain', ar: '4 / 3', img: 'images/wall/our-story.jpg', motif: 'fox' },
  { id: 'events', label: 'Events', to: '/events', x: 59.2, y: 5.9, w: 10.0, h: 19.3, round: true, frame: 'oval-black', ar: '1 / 1.1', img: 'images/wall/whats-on.jpg', motif: 'balloon' },
  { id: 'gallery', label: 'Gallery Wall', to: '/gallery-wall', x: 20.7, y: 30.3, w: 16.4, h: 33.7, frame: 'gold-tapestry', ar: '3 / 4', img: 'images/wall/gallery-wall.jpg', motif: 'scene' },
  { id: 'local', label: 'Local Love', to: '/neighborhood', x: 39.3, y: 33.7, w: 7.0, h: 16.3, frame: 'gold-botanical', ar: '7 / 5', img: 'images/wall/local-love.jpg', motif: 'heart' },
  { id: 'team', label: 'Troublemakers', to: '/troublemakers', x: 54.6, y: 27.6, w: 7.3, h: 14.4, frame: 'black-stacked', ar: '1 / 1', img: 'images/wall/troublemakers.jpg', motif: 'hat' },
  { id: 'reviews', label: 'Reviews', to: '/reviews', x: 70.3, y: 20.8, w: 9.0, h: 13.6, frame: 'oval-gilt', ar: '1 / 1', img: 'images/wall/reviews.jpg', motif: 'star' },
  /* This frame used to point at /community, which has been retired. Rather than
     leave a painted frame with nowhere to go, it carries today's specials —
     the one destination a regular actually looks for and the only one the menu
     link doesn't already cover. */
  { id: 'specials', label: 'Specials', to: '/menu#specials', x: 39.7, y: 54.4, w: 10.7, h: 17.9, frame: 'black-mat', ar: '4 / 3.4', img: 'images/wall/flank-coffee.jpg', small: true, motif: 'bunting' },
  /* The one piece with no photograph of its own yet: drop a storefront shot in
     as public/images/wall/location.jpg (or upload one in the editor) and it
     hangs like the rest. Until then it falls back to the painted chalk address
     sign, which is a real wall piece rather than a hole in the hang. */
  { id: 'visit', label: 'Visit Us', to: '/location', x: 52.1, y: 57.8, w: 6.0, h: 13.0, frame: 'black-flat', ar: '4 / 3', img: 'images/wall/location.jpg', tint: 'chalk', motif: 'pin', caption: '514 Station Ave\nHaddon Heights' },
  { id: 'timeline', label: 'Our Story', to: '/timeline', x: 65.4, y: 45.1, w: 10.2, h: 25.0, frame: 'bronze-carved', ar: '7 / 5', img: 'images/wall/our-story-so-far.jpg', motif: 'book' },
  { id: 'contact', label: 'Contact', to: '/contact', x: 77.9, y: 50.8, w: 4.2, h: 14.0, frame: 'gilt-thin', ar: '3 / 4', img: 'images/wall/flank-food.jpg', small: true, motif: 'envelope' },
];

/* The shop's own gold sculptures, hung among the pictures on the phone wall.
   Keyed to the piece they hang under so the masonry carries them into
   different columns instead of stacking them wherever there happens to be
   room — which is how they sit on the real wall, tucked between frames. */
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
