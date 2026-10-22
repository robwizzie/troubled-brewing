import { WALL_FOCUS } from './galleryWall.js';

/* Coordinate helpers for the homepage concepts that hang the shop's REAL wall
   photograph (RealWallPhoto). WALL_ART boxes are measured over the whole
   photograph; the stage shows only the WALL_FOCUS slice, so these map a box or
   a point into % of that slice. */

/** A WALL_ART % box (of the whole photo) → CSS box in % of the cropped stage. */
export function stageBox({ x, y, w, h, r }) {
  const box = {
    left: `${x}%`,
    top: `${((y - WALL_FOCUS.y) / WALL_FOCUS.h) * 100}%`,
    width: `${w}%`,
    height: `${(h / WALL_FOCUS.h) * 100}%`,
  };
  // a frame that reads as tilted in the photograph: the box turns with it
  if (Number(r)) box.transform = `rotate(${r}deg)`;
  return box;
}

/** The point (fx, fy) — 0–1 across a WALL_ART box — as numbers in stage %. */
export function stageXY({ x, y, w, h }, fx = 0.5, fy = 0.5) {
  return { x: x + w * fx, y: ((y + h * fy - WALL_FOCUS.y) / WALL_FOCUS.h) * 100 };
}

/** Same point as CSS left/top. */
export function stagePoint(rect, fx, fy) {
  const p = stageXY(rect, fx, fy);
  return { left: `${p.x}%`, top: `${p.y}%` };
}
