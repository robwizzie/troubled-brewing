/* THE REAL WALL, AS DATA.

   `public/images/wall/gallery-wall.jpg` (934×1400 — and the same frame at up
   to 3000px wide, see src/lib/wallPhoto.js) is the shop's own photograph of
   the green gallery wall over the condiment counter. The Gallery
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
 * pixel. `scale` is clamped at 5×: the room loads the photographer's
 * full-resolution frame (up to 3000px wide, see src/lib/wallPhoto.js) as it
 * zooms, so a small frame can come right up to the glass and stay sharp —
 * past ~5× even that runs out of real detail.
 */
export function viewFor(rect, fit) {
  const raw = Math.min((100 * fit.w) / rect.w, (WALL_FOCUS.h * fit.h) / rect.h);
  const scale = Math.min(Math.max(raw, 1), 5);
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

/* ---- walking the wall ----------------------------------------------------

   Prev / Next, the counter and the index all share one order, and it has to
   be the order your eye would take standing in front of the wall — otherwise
   "Next" teleports across the room and the visitor loses their place. A salon
   hang like this one is stacked in loose columns, so the walk goes column by
   column, left to right, and top to bottom inside each column: every step is
   to a neighbour. A column breaks wherever there is a clear horizontal gap
   (more than `gap` % of the width) between the centres of the pieces. */

/**
 * The pieces in walking order: columns left → right, top → bottom in each.
 * Pure and stable — the same art always walks the same way.
 */
export function spatialOrder(art, gap = 5) {
  const list = Array.isArray(art) ? art : [];
  const byX = list
    .map((a) => ({ a, cx: a.x + a.w / 2, cy: a.y + a.h / 2 }))
    .sort((p, q) => p.cx - q.cx || p.cy - q.cy);
  const columns = [];
  byX.forEach((p) => {
    const col = columns[columns.length - 1];
    if (col && p.cx - col[col.length - 1].cx <= gap) col.push(p);
    else columns.push([p]);
  });
  return columns.flatMap((col) => col.sort((p, q) => p.cy - q.cy || p.cx - q.cx).map((p) => p.a));
}

/**
 * One step along the walk. `wrap` carries on round from the last piece to
 * the first (the room's Prev / Next); without it the walk stops at either end.
 * An index that isn't on the wall yet (-1) steps onto the first or last piece.
 */
export function stepIndex(index, delta, length, wrap = true) {
  if (!length) return -1;
  if (index < 0) return delta < 0 ? length - 1 : 0;
  const next = index + delta;
  if (wrap) return ((next % length) + length) % length;
  return Math.min(length - 1, Math.max(0, next));
}

/**
 * The piece under a point on the photograph (x, y in % of it) — the smallest
 * frame that contains it, so a little piece hung over a big one still wins;
 * otherwise the nearest frame, measured in real pixels of the photograph.
 * This is what a tap on the mini-map lands on.
 */
export function pieceAt(art, x, y) {
  const list = Array.isArray(art) ? art : [];
  const inside = list
    .filter((a) => x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h)
    .sort((p, q) => p.w * p.h - q.w * q.h);
  if (inside.length) return inside[0];
  let best = null;
  let bestD = Infinity;
  list.forEach((a) => {
    const dx = (a.x + a.w / 2 - x) * IMAGE_W;
    const dy = (a.y + a.h / 2 - y) * IMAGE_H;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = a; }
  });
  return best;
}

/**
 * A box in % of the photograph, re-expressed in % of the resting room (the
 * WALL_FOCUS slice) — the coordinates the mini-map is drawn in.
 */
export function toFocusBox(rect) {
  return {
    x: ((rect.x - WALL_FOCUS.x) / WALL_FOCUS.w) * 100,
    y: ((rect.y - WALL_FOCUS.y) / WALL_FOCUS.h) * 100,
    w: (rect.w / WALL_FOCUS.w) * 100,
    h: (rect.h / WALL_FOCUS.h) * 100,
  };
}

/** The inverse for a single point: mini-map % → photograph %. */
export function fromFocusPoint(fx, fy) {
  return {
    x: WALL_FOCUS.x + (fx / 100) * WALL_FOCUS.w,
    y: WALL_FOCUS.y + (fy / 100) * WALL_FOCUS.h,
  };
}

/**
 * The part of the photograph a view leaves on screen, in % of the photograph:
 * the "you are here" box on the mini-map.
 */
export function visibleBox(view) {
  return {
    x: -view.x / view.scale,
    y: -view.y / view.scale,
    w: 100 / view.scale,
    h: WALL_FOCUS.h / view.scale,
  };
}

/* ---- deep links -----------------------------------------------------------

   `/gallery-wall?piece=pumpkin` opens the room on that piece, and the address
   bar follows the visitor as they walk (replaceState, so Back still leaves
   the page rather than stepping back through every frame). */

export const PIECE_PARAM = 'piece';

/** The piece id a query string asks for, if it is one of `ids`; else null. */
export function readPieceParam(search, ids) {
  let id = null;
  try {
    id = new URLSearchParams(search || '').get(PIECE_PARAM);
  } catch {
    return null;
  }
  if (!id) return null;
  return ids.includes(id) ? id : null;
}

/**
 * `href` with ?piece= set to `id` (or removed for null), every other
 * parameter and the hash kept. Returns path + search + hash — what
 * history.replaceState wants.
 */
export function withPieceParam(href, id) {
  const url = new URL(href, 'http://local.invalid');
  if (id) url.searchParams.set(PIECE_PARAM, id);
  else url.searchParams.delete(PIECE_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}
