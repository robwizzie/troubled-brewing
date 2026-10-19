import { asset } from './config.js';

/* The shop's photograph of the gallery wall, at every size we ship.

   The original is the photographer's 4000×6000 frame (Alex McDonnell, June
   2024); the site used to carry only a 934px-wide copy of it, which went soft
   the moment anything zoomed in. These are the same frame — identical crop,
   so every hotspot measured in galleryWall.js still lands on its piece — at
   four widths, and the browser picks the one the screen actually needs.

   `gallery-wall.jpg` (934×1400) stays as the plain fallback and for the few
   places that need a single URL (a CSS background, an og:image). */

export const WALL_PHOTO = asset('images/wall/gallery-wall.jpg');

export const WALL_PHOTO_WIDTHS = [934, 1400, 2000, 3000];

export const WALL_PHOTO_SRCSET = WALL_PHOTO_WIDTHS
  .map((w) => `${asset(`images/wall/gallery-wall-${w}.webp`)} ${w}w`)
  .join(', ');

/** The biggest copy — for close-up crops that must stay sharp. */
export const WALL_PHOTO_LARGE = asset('images/wall/gallery-wall-3000.webp');

/** img props for the default wall photo; an owner override is a single URL. */
export function wallPhotoProps(override, sizes = '100vw') {
  if (override) return { src: override };
  return { src: WALL_PHOTO, srcSet: WALL_PHOTO_SRCSET, sizes };
}
