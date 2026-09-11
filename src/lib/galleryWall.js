/* THE REAL WALL, AS DATA.

   `public/images/wall/gallery-wall.jpg` (934×1400) is the shop's own
   photograph of the green gallery wall over the condiment counter. The Gallery
   Wall page hangs that photograph as its canvas and lays a hotspot over every
   piece in it, so a visitor explores the actual wall instead of scrolling a
   grid of thumbnails.

   Each entry is a % box over that photograph, measured off the frame's outer
   molding. THE GEOMETRY IS TIED TO THIS EXACT PHOTOGRAPH — if the wall is ever
   re-shot (or the owner uploads a different picture in the editor), the boxes
   below have to be re-measured or the hotspots land on the wrong art. That is
   the same deal `src/lib/wallPieces.js` makes with the homepage scene, and the
   editor field says so.

   `blurb` is a plain description of what is visibly in the frame — nothing
   invented. The real stories, and the artists who deserve the credit, live in
   the owner-managed Gallery Wall collection (`gallery_pieces`) and get pinned
   to a spot with that row's `wall_spot`. Until a row is pinned, the page shows
   the description and says, honestly, that the story isn't written up yet.

   `shape: 'oval'` only softens the highlight ring; `kind: 'object'` marks the
   two pieces that aren't pictures at all (the gilded fox and hare heads), so
   the page can call them what they are. */

const IMAGE_W = 934;
const IMAGE_H = 1400;

/* The slice of the photograph the page shows at rest: full width, down to just
   under the lowest frame. Everything below is the counter, which is a lovely
   part of the room and a poor part of a gallery. */
export const WALL_FOCUS = { x: 0, y: 1.5, w: 100, h: 66.5 };

/** Stage width ÷ height, so the room's frame is exactly the slice above. */
export const WALL_STAGE_RATIO = (WALL_FOCUS.w * IMAGE_W) / (WALL_FOCUS.h * IMAGE_H);

/** Natural size of the photograph — used to crop close-ups at native pixels. */
export const WALL_IMAGE = { w: IMAGE_W, h: IMAGE_H };

export const WALL_ART = [
  {
    id: 'ducks',
    title: 'The Rubber Ducks',
    x: 14.0, y: 7.3, w: 30.3, h: 17.7,
    blurb: 'A tall ship under full sail in heavy weather, with two rubber ducks paddling along beside it. Signed in the corner, and hung in the biggest gold frame on the wall.',
  },
  {
    id: 'oval-landscape',
    title: 'The Little Oval',
    shape: 'oval',
    x: 21.7, y: 24.6, w: 10.6, h: 5.8,
    blurb: 'A small painted scene in a slim gold oval — the quietest thing up here, and the one most people walk straight past.',
  },
  {
    id: 'botanical',
    title: 'Botanical Study',
    x: 17.2, y: 30.4, w: 16.4, h: 17.2,
    blurb: 'An orange-flowered botanical plate with its seed and leaf studies set out underneath, double-matted in cream inside a gold frame.',
  },
  {
    id: 'snow-chain',
    title: 'Snow Day',
    x: 36.9, y: 34.3, w: 10.7, h: 5.9,
    blurb: 'A winter scene — a low stone building across an empty white field — in a thin brass frame that hangs from its own chain.',
  },
  {
    id: 'balloon-fox',
    title: 'Foxes in a Balloon',
    x: 48.4, y: 18.4, w: 21.0, h: 22.6,
    blurb: 'Two foxes in waistcoats crossing a pale sky under a striped hot-air balloon, with a few small birds for company. Hung frame-within-a-frame.',
  },
  {
    id: 'butterflies',
    title: 'The Butterfly Plate',
    shape: 'oval',
    x: 70.3, y: 17.6, w: 11.8, h: 15.5,
    blurb: 'A specimen plate of butterflies, printed and labelled the old way, in a gold oval.',
  },
  {
    id: 'lady-in-red',
    title: 'The Lady in Red',
    x: 84.4, y: 20.4, w: 7.2, h: 7.0,
    blurb: 'A figure in a long red costume, lifted from an old illustrated card, in a small black frame.',
  },
  {
    id: 'grey-room',
    title: 'The Grey Room',
    x: 83.5, y: 26.7, w: 15.3, h: 11.3,
    blurb: 'A soft grey photograph of a room full of people under hanging lamps — the only piece on the wall with no colour in it at all.',
  },
  {
    id: 'hare',
    title: 'The Brass Hare',
    kind: 'object',
    x: 74.2, y: 31.6, w: 5.4, h: 10.0,
    blurb: 'Not a picture: a gilded hare’s head mounted straight onto the paint, ears up, watching the espresso machine.',
  },
  {
    id: 'daisies',
    title: 'Daisies',
    x: 80.7, y: 35.6, w: 5.6, h: 6.9,
    blurb: 'A close, warm little painting of white daisies, in a slim black frame.',
  },
  {
    id: 'early-bird',
    title: 'Early Bird',
    x: 87.8, y: 38.6, w: 9.0, h: 9.8,
    blurb: 'A pen drawing captioned EARLY BIRD, floated on a wide brown mat inside a bronze frame.',
  },
  {
    id: 'fox-head',
    title: 'The Gold Fox',
    kind: 'object',
    x: 37.0, y: 41.5, w: 7.9, h: 8.2,
    blurb: 'The wall’s other sculpture — a gilded fox’s head in spectacles, with a fine chain looped under its chin. More or less the house mascot.',
  },
  {
    id: 'pumpkin',
    title: 'The Pumpkin House',
    shape: 'oval',
    x: 44.6, y: 41.3, w: 9.8, h: 9.3,
    blurb: 'A pumpkin with a front door, two lit windows and a curl of vine over the top, painted inside a black oval.',
  },
  {
    id: 'the-company',
    title: 'The Company',
    x: 55.6, y: 41.5, w: 11.0, h: 8.3,
    blurb: 'A painted crowd of hares and long-eared characters, caught mid-conversation, in a plain black frame.',
  },
  {
    id: 'bicycle-fox',
    title: 'Fox on a Bicycle',
    x: 17.4, y: 48.6, w: 23.0, h: 13.8,
    blurb: 'A butterfly-winged fox riding a bicycle past a blue-doored shopfront, window boxes and a row of corn. The most Haddon Heights thing on the wall.',
  },
  {
    id: 'cold-out',
    title: 'Cold Out',
    x: 41.8, y: 52.4, w: 14.8, h: 13.4,
    blurb: 'A French press and a striped scarf, captioned COLD OUT, sunk deep inside a heavy carved gold frame.',
  },
  {
    id: 'silhouette',
    title: 'The Silhouette',
    x: 58.4, y: 49.8, w: 10.2, h: 11.6,
    blurb: 'A dark cut-paper figure on a dusty violet ground, in a bright gold frame.',
  },
  {
    id: 'town-hall',
    title: 'The Town Hall Drawing',
    x: 69.4, y: 44.0, w: 17.6, h: 19.6,
    blurb: 'A pen-and-ink drawing of a domed civic building with bare trees around it, captioned along the bottom edge, in the wide woven-gold frame.',
  },
  {
    id: 'the-cup',
    title: 'The Cup',
    x: 86.6, y: 48.6, w: 9.8, h: 12.0,
    blurb: 'A cup and saucer, a spoon and a scatter of shapes — the one piece on this wall that is unmistakably about coffee.',
  },
];

/** Options for the "which frame on the wall" picker in the Gallery Wall manager. */
export const WALL_SPOT_OPTIONS = WALL_ART.map((a) => ({ value: a.id, label: a.title }));

/**
 * Fold the owner's catalogued pieces onto the wall.
 *
 * A `gallery_pieces` row claims a spot with `wall_spot`; its title, artist,
 * credits, story and photograph then win over the built-in description. A spot
 * nobody has claimed keeps its description and reports `linked: false`, which
 * is how the page knows to invite the story rather than pretend it has one.
 *
 * Two rows pointing at the same spot is an owner slip, not a crash: the first
 * one wins (rows arrive in `display_order`).
 */
export function mergeWallArt(pieces) {
  const rows = Array.isArray(pieces) ? pieces : [];
  const bySpot = new Map();
  rows.forEach((p) => {
    const spot = (p?.wall_spot || '').trim();
    if (spot && !bySpot.has(spot)) bySpot.set(spot, p);
  });
  return WALL_ART.map((art) => {
    const p = bySpot.get(art.id);
    if (!p) return { ...art, linked: false };
    return {
      ...art,
      linked: true,
      pieceId: p.id,
      title: (p.title || '').trim() || art.title,
      artist: p.artist || '',
      artistUrl: p.artist_url || '',
      medium: p.medium || '',
      yearLabel: p.year_label || '',
      story: p.story || '',
      photo: p.image_url || '',
      forSale: Boolean(p.for_sale),
    };
  });
}

/**
 * The transform that puts `rect` (a % box over the photograph) where `fit`
 * wants it in the stage — `fit` being the share of the stage the piece may
 * fill and the point it should center on, both 0–1.
 *
 * Everything is expressed in percentages OF THE PHOTOGRAPH, which is what CSS
 * `translate()` percentages mean on the photograph's own layer — so the room
 * pans and zooms correctly at every screen size without measuring a single
 * pixel. `scale` is clamped: the source is 934px wide, and blowing a
 * thumb-sized frame up past ~3× turns a photograph into porridge.
 */
export function viewFor(rect, fit) {
  const raw = Math.min((100 * fit.w) / rect.w, (WALL_FOCUS.h * fit.h) / rect.h);
  const scale = Math.min(Math.max(raw, 1), 3.4);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  /* Vertically the pan is held inside the photograph: centering a piece hung
     near the ceiling would otherwise open a strip of bare stage above the
     picture rail. Horizontally it is NOT held — a piece at the right-hand edge
     can only be brought to the middle by panning past the edge of the
     photograph, and the room is in shadow by then, so the overrun reads as the
     wall running out rather than as a gap. */
  const y = WALL_FOCUS.h * fit.cy - scale * cy;
  return {
    scale,
    x: 100 * fit.cx - scale * cx,
    y: Math.min(0, Math.max(WALL_FOCUS.h - 100 * scale, y)),
  };
}

/** The resting view: the whole wall, nothing magnified. */
export const REST_VIEW = viewFor(WALL_FOCUS, { cx: 0.5, cy: 0.5, w: 1, h: 1 });
