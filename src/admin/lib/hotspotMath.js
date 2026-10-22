import { MIN_BOX, clampBox } from '../../lib/galleryWall.js';

/* The arithmetic behind the wall editor's boxes, kept pure so it can be
   tested without a browser. Every box is { x, y, w, h } in % of the wall
   photograph (left, top, width, height), which is what the public room uses —
   so a box drawn on a laptop lands on the same frame on a phone. */

export const NUDGE = 0.2; // % per arrow press
export const NUDGE_BIG = 1; // % per arrow press with Shift

const r1 = (n) => Math.round(n * 10) / 10;

/** A pointer movement in screen pixels, as % of the photo on screen. */
export function pxToPercent(dxPx, dyPx, rect) {
  const w = rect && rect.width > 0 ? rect.width : 1;
  const h = rect && rect.height > 0 ? rect.height : 1;
  return { dx: (dxPx / w) * 100, dy: (dyPx / h) * 100 };
}

/** Where a pointer is over the photo, in % of it (clamped to the photo). */
export function pointInPhoto(clientX, clientY, rect) {
  const w = rect && rect.width > 0 ? rect.width : 1;
  const h = rect && rect.height > 0 ? rect.height : 1;
  return {
    x: Math.min(100, Math.max(0, ((clientX - (rect?.left || 0)) / w) * 100)),
    y: Math.min(100, Math.max(0, ((clientY - (rect?.top || 0)) / h) * 100)),
  };
}

export const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/**
 * The box after dragging `handle` by (dx, dy) % from where the drag started.
 * 'move' slides the whole box and stops at the photo's edges without
 * squashing it; a corner or edge handle moves only its own edges, never past
 * the photo or closer than `min` to the opposite edge.
 */
export function dragBox(start, handle, dx, dy, min = MIN_BOX) {
  const b = clampBox(start, min);
  if (handle === 'move') {
    return clampBox({ ...b, x: b.x + dx, y: b.y + dy }, min);
  }
  let left = b.x;
  let top = b.y;
  let right = b.x + b.w;
  let bottom = b.y + b.h;
  if (handle.includes('w')) left = Math.min(right - min, Math.max(0, left + dx));
  if (handle.includes('e')) right = Math.max(left + min, Math.min(100, right + dx));
  if (handle.includes('n')) top = Math.min(bottom - min, Math.max(0, top + dy));
  if (handle.includes('s')) bottom = Math.max(top + min, Math.min(100, bottom + dy));
  return { x: r1(left), y: r1(top), w: r1(right - left), h: r1(bottom - top) };
}

/**
 * The box after one arrow-key press, or null for any other key.
 * Arrows move it; with Alt (Option on a Mac) they resize it instead —
 * Right / Down grow it, Left / Up shrink it. Shift takes bigger steps.
 */
export function nudgeBox(box, key, { shift = false, alt = false } = {}) {
  const step = shift ? NUDGE_BIG : NUDGE;
  const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[key];
  if (!d) return null;
  if (alt) return dragBox(box, 'se', d[0], d[1]);
  return dragBox(box, 'move', d[0], d[1]);
}

/** A fresh box for a new piece, centred where the owner is looking. */
export function newBoxAt(cx = 50, cy = 35, w = 10, h = 10) {
  return clampBox({ x: cx - w / 2, y: cy - h / 2, w, h });
}

/** Swap an item one place up (-1) or down (+1) in a list; same list if it can't move. */
export function moveItem(list, index, dir) {
  const j = index + dir;
  if (index < 0 || j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[index], next[j]] = [next[j], next[index]];
  return next;
}

/** A url-safe id for a new piece that isn't already on the wall. */
export function newPieceId(existing, base = 'piece') {
  const taken = new Set((existing || []).map((p) => p.id));
  let n = (existing || []).length + 1;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
