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

/** The copy the room lays over the wall for close-ups: the biggest one on a
    wide screen, the 2000px copy on a phone (a phone's whole stage at 5× is
    still under 2000 real pixels across, and the 3000 is twice the download). */
export function wallZoomPhoto(wide) {
  return asset(`images/wall/gallery-wall-${wide ? 3000 : 2000}.webp`);
}

/* One fetch + decode per URL for the life of the page, shared by every
   caller — so the room can ask early (on idle, on the first hover) and ask
   again when a piece opens, and the browser only ever does the work once. */
const preloads = new Map();

/**
 * Fetch and decode an image off-screen. Resolves with the URL once it can be
 * painted without a blank frame; rejects if it can't load. Without a DOM image
 * loader (tests, SSR) it simply never settles, which leaves the room on the
 * copy it already has — never on nothing.
 */
export function preloadImage(url) {
  if (!url) return Promise.reject(new Error('no url'));
  if (preloads.has(url)) return preloads.get(url);
  const p = new Promise((resolve, reject) => {
    if (typeof Image === 'undefined') return;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const done = () => resolve(url);
      if (typeof img.decode === 'function') img.decode().then(done, done);
      else done();
    };
    img.onerror = () => {
      preloads.delete(url);
      reject(new Error(`failed to load ${url}`));
    };
    img.src = url;
  });
  preloads.set(url, p);
  return p;
}
