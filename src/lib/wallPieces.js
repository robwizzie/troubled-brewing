/* The Immersive Gallery hero's wall, as data.

   Each entry is one destination that hangs on the wall, in BOTH of the hero's
   two lives:

     desktop  a hotspot on the scene artwork (public/images/wall/
              immersive-scene.jpg, 1536×1024) — `x/y/w/h` are % boxes tuned to
              hug a painted frame's molding, so the brass label lands exactly
              on its bottom edge. THE GEOMETRY IS TIED TO THE ARTWORK, which is
              why it is not owner-editable: moving a box moves a label off a
              frame. Re-tune here if the artwork is ever re-generated.

     phone    a real framed photograph on the re-hung salon wall — `frame` is a
              molding from the shared vocabulary (frameStyles.js /
              `.gw-frame__art--*`), `ar` its shape, `img` the photograph, and
              `motif` + `caption` the hand-lettered sign shown until the photo
              exists. The caption matters: a board with only a small glyph on
              it reads as a frame that failed to load, while the same board
              with a line of lettering reads as a painted sign — a real piece
              on the wall.

   What the OWNER controls — the label, where it links, the photograph and the
   molding — is overridable per piece from the editor (`igh_pieces`), merged
   here by index so the artwork geometry always survives. See
   mergeWallPieces(). */

import { normalizeFrameStyle } from './frameStyles.js';

export const IMMERSIVE_WALL_PIECES = [
  { label: 'Menu', to: '/menu', x: 18.4, y: 9.0, w: 19.9, h: 17.1, frame: 'gilt-grand', ar: '4 / 5', img: 'images/wall/order-menu.jpg', motif: 'cup' },
  { label: 'About Us', to: '/about', x: 39.7, y: 6.6, w: 17.6, h: 17.8, frame: 'brass-chain', ar: '4 / 3', img: 'images/wall/our-story.jpg', motif: 'fox' },
  { label: 'Events', to: '/events', x: 59.2, y: 5.9, w: 10.0, h: 19.3, round: true, frame: 'oval-black', ar: '1 / 1.1', img: 'images/wall/whats-on.jpg', motif: 'balloon' },
  { label: 'Gallery Wall', to: '/gallery-wall', x: 20.7, y: 30.3, w: 16.4, h: 33.7, frame: 'gold-tapestry', ar: '3 / 4', img: 'images/wall/gallery-wall.jpg', motif: 'scene' },
  { label: 'Local Love', to: '/neighborhood', x: 39.3, y: 33.7, w: 7.0, h: 16.3, frame: 'gold-botanical', ar: '7 / 5', img: 'images/wall/local-love.jpg', motif: 'heart' },
  { label: 'Troublemakers', to: '/troublemakers', x: 54.6, y: 27.6, w: 7.3, h: 14.4, frame: 'black-stacked', ar: '1 / 1', img: 'images/wall/troublemakers.jpg', motif: 'hat' },
  { label: 'Reviews', to: '/reviews', x: 70.3, y: 20.8, w: 9.0, h: 13.6, frame: 'oval-gilt', ar: '1 / 1', img: 'images/wall/reviews.jpg', motif: 'star' },
  { label: 'Community', to: '/community', x: 39.7, y: 54.4, w: 10.7, h: 17.9, frame: 'black-mat', ar: '4 / 3.4', img: 'images/wall/flank-coffee.jpg', small: true, motif: 'bunting' },
  /* The one piece with no photograph of its own yet: drop a storefront shot in
     as public/images/wall/location.jpg and it hangs like the rest. Until then
     it falls back to the painted chalk address sign, which is a real wall
     piece rather than a hole in the hang. */
  { label: 'Visit Us', to: '/location', x: 52.1, y: 57.8, w: 6.0, h: 13.0, frame: 'black-flat', ar: '4 / 3', img: 'images/wall/location.jpg', tint: 'chalk', motif: 'pin', caption: '514 Station Ave\nHaddon Heights' },
  { label: 'Our Story', to: '/timeline', x: 65.4, y: 45.1, w: 10.2, h: 25.0, frame: 'bronze-carved', ar: '7 / 5', img: 'images/wall/our-story-so-far.jpg', motif: 'book' },
  { label: 'Contact', to: '/contact', x: 77.9, y: 50.8, w: 4.2, h: 14.0, frame: 'gilt-thin', ar: '3 / 4', img: 'images/wall/flank-food.jpg', motif: 'envelope' },
];

/** The owner-editable half of a piece — what the editor renders a row for. */
export const WALL_PIECE_FIELDS = ['label', 'to', 'img', 'frame'];

/**
 * Merge the owner's per-piece overrides (from the hero's `igh_pieces` data)
 * onto the built-in wall. Overrides are matched BY INDEX and every field is
 * optional, so a half-filled row — a new label but no new photo, say — keeps
 * everything it didn't set. A blank string means "use the default"; to hang a
 * piece with no photograph, the editor writes the sentinel '-' instead, which
 * is how an owner deliberately falls a piece back to its drawn stand-in.
 */
export function mergeWallPieces(overrides) {
  const rows = Array.isArray(overrides) ? overrides : [];
  return IMMERSIVE_WALL_PIECES.map((base, i) => {
    const o = rows[i] || {};
    const img = o.img === '-' ? '' : (o.img || base.img);
    return {
      ...base,
      label: (o.label || '').trim() || base.label,
      to: (o.to || '').trim() || base.to,
      img,
      frame: o.frame ? normalizeFrameStyle(o.frame) : base.frame,
    };
  });
}
