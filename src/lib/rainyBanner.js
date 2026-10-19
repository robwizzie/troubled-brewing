import { outfitFromUrl, weatherFor, weatherPreviewFromUrl } from './foxOutfit.js';
import { shopNow } from './hours.js';

/* The rainy-day banner (src/components/RainyBanner.jsx): a slim, dismissible
   "order ahead" nudge shown while it's raining, drizzling, storming or snowing
   at 514 Station Ave AND the shop is open. The weather is the fox's own live
   call (useShopWeather), never a second one.

   Preview: ?weather=rain|snow (or the fox's ?foxOutfit=rain|snow) forces it,
   open or closed, so the owner can see it on a dry day. */

/* ---- The copy: edit the words here ---------------------------------------- */
export const RAINY_COPY = {
  rain: {
    message: 'Rainy on Station Ave. Order ahead and dash in.',
    cta: 'Order ahead',
    label: 'Rainy day note',
  },
  snow: {
    message: 'Snowy out there. Order ahead and we’ll have it warm and waiting.',
    cta: 'Order ahead',
    label: 'Snowy day note',
  },
};

export const DISMISS_KEY = 'tb.rainy.dismissed';

/** 'rain' | 'snow' forced by ?weather= or ?foxOutfit=, else null. */
export function previewKind(search = typeof window !== 'undefined' ? window.location.search : '') {
  const w = weatherPreviewFromUrl(search);
  if (w) return w;
  const look = outfitFromUrl(search);
  return look === 'rain' || look === 'snow' ? look : null;
}

/** 'rain' | 'snow' | null for live weather ({ code }); heat doesn't count. */
export function kindFor(weather) {
  if (!weather) return null;
  const k = weatherFor(weather.code, null);
  return k === 'rain' || k === 'snow' ? k : null;
}

/** The shop's date (America/New_York), 'YYYY-MM-DD'. */
export const shopDay = (now = new Date()) => shopNow(now).isoDate;

/** Dismissed today, on the shop's calendar? Unreadable storage → no. */
export function isDismissed(now = new Date()) {
  try { return window.localStorage.getItem(DISMISS_KEY) === shopDay(now); } catch { return false; }
}

/** Hide it for the rest of the shop's day. Unwritable storage → this visit only. */
export function dismiss(now = new Date()) {
  try { window.localStorage.setItem(DISMISS_KEY, shopDay(now)); } catch { /* private mode: fine */ }
}

/**
 * Which banner to show, or null.
 *   preview      — previewKind(): forces it, ignoring open status
 *   weather      — live { code } or null
 *   open         — the shop's status.open, or null while hours load
 *   dismissed    — dismissed today
 *   admin        — on an /admin route
 *   announcement — the owner's site-wide announcement is showing
 */
export function bannerKind({ preview = null, weather = null, open = null, dismissed = false, admin = false, announcement = false } = {}) {
  if (admin || announcement || dismissed) return null;
  if (preview) return preview;
  return open === true ? kindFor(weather) : null;
}
