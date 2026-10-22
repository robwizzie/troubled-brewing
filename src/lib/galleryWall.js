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
    x: 14.1, y: 7.5, w: 30.9, h: 18.9,
    blurb: 'A tall ship under full sail in heavy weather, with two rubber ducks paddling along beside it. Signed in the corner, and hung in the biggest gold frame on the wall.',
  },
  {
    id: 'oval-landscape',
    title: 'The Little Oval',
    shape: 'oval',
    x: 21.6, y: 24.6, w: 10.7, h: 5.7,
    blurb: 'A small painted scene in a slim gold oval — the quietest thing up here, and the one most people walk straight past.',
  },
  {
    id: 'botanical',
    title: 'Botanical Study',
    x: 17.0, y: 30.5, w: 17.4, h: 16.0,
    blurb: 'An orange-flowered botanical plate with its seed and leaf studies set out underneath, double-matted in cream inside a gold frame.',
  },
  {
    id: 'snow-chain',
    title: 'Snow Day',
    x: 35.6, y: 34.5, w: 12.1, h: 6.3,
    blurb: 'A winter scene — a low stone building across an empty white field — in a thin brass frame that hangs from its own chain.',
  },
  {
    id: 'balloon-fox',
    title: 'Foxes in a Balloon',
    x: 48.2, y: 17.6, w: 22.0, h: 23.6,
    blurb: 'Two foxes in waistcoats crossing a pale sky under a striped hot-air balloon, with a few small birds for company. Hung frame-within-a-frame.',
  },
  {
    id: 'butterflies',
    title: 'The Butterfly Plate',
    shape: 'oval',
    x: 70.8, y: 18.2, w: 14.4, h: 13.9,
    blurb: 'A specimen plate of butterflies, printed and labelled the old way, in a gold oval.',
  },
  {
    id: 'lady-in-red',
    title: 'The Lady in Red',
    x: 86.9, y: 20.5, w: 5.2, h: 6.8,
    blurb: 'A figure in a long red costume, lifted from an old illustrated card, in a small black frame.',
  },
  {
    id: 'grey-room',
    title: 'The Grey Room',
    x: 85.9, y: 27.3, w: 13.8, h: 11.7,
    blurb: 'A soft grey photograph of a room full of people under hanging lamps — the only piece on the wall with no colour in it at all.',
  },
  {
    id: 'hare',
    title: 'The Brass Hare',
    kind: 'object',
    x: 74.1, y: 32.2, w: 7.6, h: 9.4,
    blurb: 'Not a picture: a gilded hare’s head mounted straight onto the paint, ears up, watching the espresso machine.',
  },
  {
    id: 'daisies',
    title: 'Daisies',
    x: 80.0, y: 36.2, w: 5.3, h: 6.8,
    blurb: 'A close, warm little painting of white daisies, in a slim black frame.',
  },
  {
    id: 'early-bird',
    title: 'Early Bird',
    x: 87.7, y: 39.1, w: 8.0, h: 8.8,
    blurb: 'A pen drawing captioned EARLY BIRD, floated on a wide brown mat inside a bronze frame.',
  },
  {
    id: 'fox-head',
    title: 'The Gold Fox',
    kind: 'object',
    x: 37.0, y: 42.1, w: 6.8, h: 6.5,
    blurb: 'The wall’s other sculpture — a gilded fox’s head in spectacles, with a fine chain looped under its chin. More or less the house mascot.',
  },
  {
    id: 'pumpkin',
    title: 'The Pumpkin House',
    shape: 'oval',
    x: 44.5, y: 41.9, w: 9.6, h: 9.2,
    blurb: 'A pumpkin with a front door, two lit windows and a curl of vine over the top, painted inside a black oval.',
  },
  {
    id: 'the-company',
    title: 'The Company',
    x: 55.7, y: 41.9, w: 10.4, h: 6.6,
    blurb: 'A painted crowd of hares and long-eared characters, caught mid-conversation, in a plain black frame.',
  },
  {
    id: 'bicycle-fox',
    title: 'Fox on a Bicycle',
    x: 17.6, y: 48.8, w: 22.8, h: 13.5,
    blurb: 'A butterfly-winged fox riding a bicycle past a blue-doored shopfront, window boxes and a row of corn. The most Haddon Heights thing on the wall.',
  },
  {
    id: 'cold-out',
    title: 'Cold Out',
    x: 42.1, y: 52.9, w: 14.4, h: 10.7,
    blurb: 'A French press and a striped scarf, captioned COLD OUT, sunk deep inside a heavy carved gold frame.',
  },
  {
    id: 'silhouette',
    title: 'The Silhouette',
    x: 58.0, y: 49.6, w: 9.7, h: 9.5,
    blurb: 'A dark cut-paper figure on a dusty violet ground, in a bright gold frame.',
  },
  {
    id: 'town-hall',
    title: 'The Town Hall Drawing',
    x: 67.8, y: 43.5, w: 15.8, h: 17.7,
    blurb: 'A pen-and-ink drawing of a domed civic building with bare trees around it, captioned along the bottom edge, in the wide woven-gold frame.',
  },
  {
    id: 'the-cup',
    title: 'The Cup',
    x: 84.5, y: 48.6, w: 10.5, h: 11.2,
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

/* ---- the owner's own wall ------------------------------------------------

   Since the wall editor, the whole wall can live in the Gallery Wall room
   section's own data (`sections.data.pieces`) — one entry per frame with its
   name, credits, story, close-up photo and its box on the photograph — so it
   publishes and discards with the rest of the page, like every other section.
   Until the owner first changes something, that list is absent and the wall
   is exactly what it always was: WALL_ART plus any `gallery_pieces` row
   pinned to a spot with `wall_spot`. The first edit copies that wall in whole
   (seedWallPieces), so nothing on it changes or goes missing. */

const r1 = (n) => Math.round(Number(n) * 10) / 10;
const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v));

/** Smallest box the editor allows, in % of the photograph. */
export const MIN_BOX = 1.5;

/** A box kept on the photograph and at least MIN_BOX across, rounded to 0.1%. */
export function clampBox({ x, y, w, h }, min = MIN_BOX) {
  const W = Math.min(100, Math.max(min, num(w, 10)));
  const H = Math.min(100, Math.max(min, num(h, 10)));
  return {
    x: r1(Math.min(100 - W, Math.max(0, num(x, 0)))),
    y: r1(Math.min(100 - H, Math.max(0, num(y, 0)))),
    w: r1(W),
    h: r1(H),
  };
}

/** One editable piece, every field present and the box on the photograph. */
export function normalizeWallPiece(p = {}, i = 0) {
  return {
    id: str(p.id).trim() || `piece-${i + 1}`,
    title: str(p.title),
    artist: str(p.artist),
    artist_url: str(p.artist_url),
    story: str(p.story),
    blurb: str(p.blurb),
    photo: str(p.photo),
    medium: str(p.medium),
    year_label: str(p.year_label),
    for_sale: Boolean(p.for_sale),
    shape: p.shape === 'oval' ? 'oval' : 'rect',
    kind: p.kind === 'object' ? 'object' : '',
    ...clampBox(p),
  };
}

/** The owner's list from section data, or null when they haven't made one. */
export function ownWallPieces(data) {
  const list = data && Array.isArray(data.pieces) ? data.pieces : null;
  if (!list || !list.length) return null;
  const seen = new Set();
  return list.map(normalizeWallPiece).filter((p) => (seen.has(p.id) ? false : seen.add(p.id)));
}

/**
 * The wall as it hangs today, as an editable list in walking order: every
 * built-in frame, with the credits and story of any catalogued piece pinned
 * to it folded in. This is what the first edit copies into the section.
 */
export function seedWallPieces(rows) {
  return spatialOrder(mergeWallArt(rows)).map((a, i) => normalizeWallPiece({
    id: a.id,
    title: a.title,
    artist: a.artist,
    artist_url: a.artistUrl,
    story: a.story,
    blurb: a.blurb,
    photo: a.photo,
    medium: a.medium,
    year_label: a.yearLabel,
    for_sale: a.forSale,
    shape: a.shape,
    kind: a.kind,
    x: a.x, y: a.y, w: a.w, h: a.h,
  }, i));
}

/**
 * The art the room hangs: the owner's list (in their order) when there is
 * one, otherwise the built-in wall in walking order. A catalogued row pinned
 * to a spot still fills any field the owner left blank, so a wall edited
 * before a row was added never hides that row's credits.
 */
export function resolveWall(data, rows) {
  const own = ownWallPieces(data);
  if (!own) return spatialOrder(mergeWallArt(rows));
  const pinned = new Map();
  (Array.isArray(rows) ? rows : []).forEach((r) => {
    const spot = str(r?.wall_spot).trim();
    if (spot && !pinned.has(spot)) pinned.set(spot, r);
  });
  return own.map((p) => {
    const r = pinned.get(p.id) || {};
    const pick = (a, b) => (str(a).trim() ? a : str(b));
    return {
      id: p.id,
      title: p.title.trim() || str(r.title).trim() || 'Untitled',
      x: p.x, y: p.y, w: p.w, h: p.h,
      shape: p.shape === 'oval' ? 'oval' : undefined,
      kind: p.kind || undefined,
      blurb: p.blurb,
      artist: pick(p.artist, r.artist),
      artistUrl: pick(p.artist_url, r.artist_url),
      story: pick(p.story, r.story),
      photo: pick(p.photo, r.image_url),
      medium: pick(p.medium, r.medium),
      yearLabel: pick(p.year_label, r.year_label),
      forSale: p.for_sale || Boolean(r.for_sale),
      linked: true,
    };
  });
}

/** Stage width / height for a photograph of the given aspect (w / h). */
export function stageRatioFor(imageRatio) {
  const r = Number(imageRatio) > 0 ? Number(imageRatio) : IMAGE_W / IMAGE_H;
  return (WALL_FOCUS.w * r) / WALL_FOCUS.h;
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
