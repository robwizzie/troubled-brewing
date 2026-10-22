import { MIN_BOX, MAX_TILT, WALL_ASPECT, clampBox, clampTilt } from '../../lib/galleryWall.js';

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
 * the photo or closer than `min` to the opposite edge. On a tilted box the
 * handles work along the box's OWN axes and the opposite corner or edge
 * stays exactly where it was.
 */
export function dragBox(start, handle, dx, dy, min = MIN_BOX, aspect = WALL_ASPECT) {
  if (handle !== 'move' && Number(start?.r)) return resizeTilted(start, handle, dx, dy, min, aspect);
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

/** Resize a tilted box by one handle, in its own frame, the far side pinned. */
export function resizeTilted(start, handle, dx, dy, min = MIN_BOX, aspect = WALL_ASPECT) {
  const th = (Number(start.r) * Math.PI) / 180;
  const cos = Math.cos(th);
  const sin = Math.sin(th);
  const cx = (start.x + start.w / 2) * aspect;
  const cy = start.y + start.h / 2;
  // the pointer's movement, turned into the box's own axes
  const ux = dx * aspect;
  const lx = ux * cos + dy * sin;
  const ly = -ux * sin + dy * cos;
  let l = (-start.w * aspect) / 2;
  let r = (start.w * aspect) / 2;
  let t = -start.h / 2;
  let b = start.h / 2;
  const minX = min * aspect;
  if (handle.includes('w')) l = Math.min(r - minX, l + lx);
  if (handle.includes('e')) r = Math.max(l + minX, r + lx);
  if (handle.includes('n')) t = Math.min(b - min, t + ly);
  if (handle.includes('s')) b = Math.max(t + min, b + ly);
  const W = Math.min(100 * aspect, r - l);
  const H = Math.min(100, b - t);
  // where the new middle is, back in photo units
  const mx = (l + r) / 2;
  const my = (t + b) / 2;
  const ncx = cx + mx * cos - my * sin;
  const ncy = cy + mx * sin + my * cos;
  return { x: r1((ncx - W / 2) / aspect), y: r1(ncy - H / 2), w: r1(W / aspect), h: r1(H) };
}

/* ---- tilt ------------------------------------------------------------------ */

export const TILT_STEP = 0.5; // degrees per [ or ]
export const TILT_STEP_BIG = 5; // with Shift
export const SNAP_LEVEL = 1.5; // within this of level, a drag lets go at exactly 0

/**
 * The tilt a rotate-drag should land on: Shift snaps to 5-degree steps,
 * otherwise anything within SNAP_LEVEL of level IS level. Always within
 * ±MAX_TILT and rounded to 0.1.
 */
export function snapTilt(deg, { shift = false } = {}) {
  let d = Number(deg) || 0;
  if (shift) d = Math.round(d / TILT_STEP_BIG) * TILT_STEP_BIG;
  else if (Math.abs(d) <= SNAP_LEVEL) d = 0;
  return clampTilt(Math.max(-MAX_TILT, Math.min(MAX_TILT, d)));
}

/** The angle, in degrees clockwise from "right", of a point seen from a centre (screen px). */
export function angleAt(cx, cy, px, py) {
  return (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
}

/**
 * The tilt after dragging the rotate handle: the box turns by however far
 * the pointer has swung round its centre since the drag began.
 */
export function rotateDrag(startTilt, startAngle, nowAngle, opts) {
  let delta = nowAngle - startAngle;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return snapTilt((Number(startTilt) || 0) + delta, opts);
}

/**
 * The change one key press makes, or null for any other key.
 * Arrows move the box; with Alt (Option on a Mac) they resize it instead —
 * Right / Down grow it, Left / Up shrink it. [ and ] tilt it half a degree
 * anticlockwise / clockwise. Shift takes bigger steps (1% and 5 degrees).
 * Returns the fields that change: { x, y, w, h } or { r }.
 */
export function nudgeBox(box, key, { shift = false, alt = false, aspect = WALL_ASPECT } = {}) {
  if (key === '[' || key === '{' || key === ']' || key === '}') {
    const step = shift || key === '{' || key === '}' ? TILT_STEP_BIG : TILT_STEP;
    const dir = key === '[' || key === '{' ? -1 : 1;
    return { r: clampTilt((Number(box.r) || 0) + dir * step) };
  }
  const step = shift ? NUDGE_BIG : NUDGE;
  const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[key];
  if (!d) return null;
  if (alt) {
    // grow or shrink along the box's own width / height, even when tilted
    const th = ((Number(box.r) || 0) * Math.PI) / 180;
    const u = d[0] * aspect;
    const sx = u * Math.cos(th) - d[1] * Math.sin(th);
    const sy = u * Math.sin(th) + d[1] * Math.cos(th);
    return dragBox(box, 'se', sx / aspect, sy, MIN_BOX, aspect);
  }
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
