import { WALL_ART } from './galleryWall.js';

/* FRAMES ARE DOORS.

   Every piece on the real wall leads somewhere on the site. Choosing one
   doesn't just follow a link: the frame is spotlit, the camera falls into it
   until the picture fills the screen, the picture dissolves into the
   destination page's paper, and the page is there. The whole site reads as
   one room you walk around in.

   It's an overlay, not a route animation: a fixed copy of the photograph is
   laid exactly over the one on screen, zoomed with one transform (Web
   Animations API), then navigation happens underneath it and the overlay
   fades away. So it works from any component that can point at an <img> of
   the wall — Step Inside, the Tagged Wall's tags — and costs nothing until
   someone clicks. Reduced motion (or no WAAPI): it just navigates. */

/** Where each piece on the wall leads, and what the door says. */
export const FRAME_DOORS = {
  ducks: { to: '/menu', label: 'The menu' },
  'balloon-fox': { to: '/timeline', label: 'Our story so far' },
  butterflies: { to: '/reviews', label: 'Reviews' },
  'fox-head': { to: '/troublemakers', label: 'The Troublemakers' },
  'bicycle-fox': { to: '/neighborhood', label: 'Local love' },
  'town-hall': { to: '/location', label: 'Find us' },
  botanical: { to: '/about', label: 'About us' },
  'cold-out': { to: '/events', label: 'What’s on' },
  'the-cup': { to: '/menu', label: 'The menu' },
  'lady-in-red': { to: '/gallery-wall', label: 'The Gallery Wall' },
};
/** Any piece without its own door opens onto the Gallery Wall page. */
export const doorFor = (id) => FRAME_DOORS[id] || { to: '/gallery-wall', label: 'The Gallery Wall' };

const BY_ID = new Map(WALL_ART.map((a) => [a.id, a]));

/** On-screen rect of a WALL_ART piece, from the (possibly transformed) photo. */
export function frameRect(imgEl, art) {
  const r = imgEl.getBoundingClientRect();
  return {
    left: r.left + (art.x / 100) * r.width,
    top: r.top + (art.y / 100) * r.height,
    width: (art.w / 100) * r.width,
    height: (art.h / 100) * r.height,
  };
}

/** The piece under a viewport point, smallest first (small frames sit inside big ones). */
export function pieceAt(imgEl, clientX, clientY) {
  const r = imgEl.getBoundingClientRect();
  const x = ((clientX - r.left) / r.width) * 100;
  const y = ((clientY - r.top) / r.height) * 100;
  let best = null;
  WALL_ART.forEach((a) => {
    if (x >= a.x && x <= a.x + a.w && y >= a.y && y <= a.y + a.h && (!best || a.w * a.h < best.w * best.h)) best = a;
  });
  return best;
}

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

let busy = false;

/**
 * Walk into a frame.
 * @param {HTMLImageElement} imgEl  the wall photo as it is on screen
 * @param {string} pieceId          a WALL_ART id
 * @param {(to: string) => void} navigate  react-router's navigate
 * @param {string} [to]             override the piece's door
 */
export async function openFrame(imgEl, pieceId, navigate, to) {
  const art = BY_ID.get(pieceId);
  const dest = to || doorFor(pieceId).to;
  if (!imgEl || !art || busy || reduced() || typeof Element.prototype.animate !== 'function') {
    navigate(dest);
    return;
  }
  busy = true;
  const img = imgEl.getBoundingClientRect();
  const f = frameRect(imgEl, art);
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const ground = getComputedStyle(document.body).backgroundColor || '#f7f1e4';

  const el = (cls, style) => {
    const n = document.createElement(cls === 'frame-portal__photo' ? 'img' : 'div');
    n.className = cls;
    Object.assign(n.style, style);
    return n;
  };
  const px = (r) => ({ left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  const root = el('frame-portal', {});
  root.setAttribute('aria-hidden', 'true');
  const zoom = el('frame-portal__zoom', {});
  const photo = el('frame-portal__photo', px(img));
  photo.alt = '';
  photo.src = imgEl.currentSrc || imgEl.src;
  const spot = el('frame-portal__spot', px(f));
  const groundEl = el('frame-portal__ground', { background: ground });
  zoom.append(photo, spot);
  root.append(zoom, groundEl);
  document.body.appendChild(root);

  // fall into the frame: its centre to the screen's centre, big enough to fill it
  const s = Math.max(vw / f.width, vh / f.height) * 1.08;
  const cx = f.left + f.width / 2;
  const cy = f.top + f.height / 2;
  const end = `translate(${vw / 2 - s * cx}px, ${vh / 2 - s * cy}px) scale(${s})`;

  try {
    // the copy fades in under the spotlight, so a cropped original (the
    // Tagged Wall clips its photo) never flashes its hidden edges
    photo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out', fill: 'forwards' });
    await spot.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out', fill: 'forwards' }).finished;
    const fall = zoom.animate([{ transform: 'none' }, { transform: end }], { duration: 820, easing: 'cubic-bezier(0.55, 0, 0.2, 1)', fill: 'forwards' });
    groundEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 600, easing: 'ease-in', fill: 'forwards' });
    await fall.finished;
    await new Promise((r) => setTimeout(r, 120));
    navigate(dest);
    // let the new page paint under the paper, then lift it away
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await root.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-out', fill: 'forwards' }).finished;
  } finally {
    root.remove();
    busy = false;
  }
}
