import { useEffect, useState } from 'react';
import { getContentBlock } from './dataService.js';
import { useDataVersion } from './dataVersion.js';
import { SHOP_TZ, shopNow, dayName } from './hours.js';

/* The shop's REAL chalkboard, photographed by staff (admin → Today's
   chalkboard) and stored in content_blocks.chalkboard_photo:

     { url, path, caption, updated_at (ISO), enabled, max_age_days,
       keep_until_replaced, width?, height? }

   `width`/`height` are the photo's pixel size, recorded at publish so the hero
   can reserve the board's exact shape before the image arrives (and lay a
   landscape board out wide). Older rows don't have them; the hero measures
   those once the image loads.

   The Pastry Case hero shows it in place of its drawn, live-menu board — but
   only while it's fresh. A photo older than `max_age_days` (default 3, counted
   in calendar days on the SHOP's clock, the upload day included) is ignored
   automatically, so last week's specials never show. Staff can instead choose
   "Until I replace it" (`keep_until_replaced: true`, `max_age_days: null`):
   that photo never expires and stays up until the next one is published.
   Only an explicit `keep_until_replaced === true` means "forever" — rows
   written before the option existed (a number, or no max_age_days at all)
   keep expiring exactly as before. Every other failure (no row, switched off,
   no url, a broken image) also lands on the drawn board, which is always
   correct because it's built from the live menu.

   Every published photo is also kept in content_blocks.chalkboard_history:

     { boards: [{ id, url, path, caption, published_at, hidden }] }  newest first

   which the public "Past boards" flip-through reads. `hidden` boards (a blurry
   shot, say) stay saved but never show publicly. */

export const CHALKBOARD_KEY = 'chalkboard_photo';
export const CHALKBOARD_HISTORY_KEY = 'chalkboard_history';
export const DEFAULT_MAX_AGE_DAYS = 3;
export const MAX_AGE_CHOICES = [1, 2, 3, 5, 7];
/** The duration value meaning "stays up until a new photo replaces it". */
export const KEEP = 'keep';
/** The flip-through only appears once there's something to flip through. */
export const MIN_PAST_BOARDS = 2;

const DAY_MS = 86400000;

/** Whole calendar days (shop clock) between `iso` and `now`; null if unparseable. */
export function daysAgo(iso, now = new Date()) {
  const then = iso ? new Date(iso) : null;
  if (!then || Number.isNaN(then.getTime())) return null;
  const a = Date.parse(`${shopNow(then).isoDate}T00:00:00Z`);
  const b = Date.parse(`${shopNow(now).isoDate}T00:00:00Z`);
  return Math.round((b - a) / DAY_MS);
}

/** True when the staff chose "Until I replace it" for this photo. */
export function keepsUntilReplaced(block) {
  return block?.keep_until_replaced === true;
}

export function maxAgeOf(block, fallback = DEFAULT_MAX_AGE_DAYS) {
  const n = Number(block?.max_age_days);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

/** The block's duration as the admin picks it: KEEP or a number of days. */
export function durationOf(block) {
  return keepsUntilReplaced(block) ? KEEP : maxAgeOf(block);
}

/** True when the photo should be on the site right now. A "keep until
    replaced" photo never expires (the staff's explicit choice wins over a
    section's shorter max age). */
export function isChalkboardLive(block, { now = new Date(), maxAgeDays } = {}) {
  if (!block || block.enabled !== true || !block.url) return false;
  const age = daysAgo(block.updated_at, now);
  if (age == null) return false;
  if (keepsUntilReplaced(block)) return true;
  // a timestamp slightly in the future (clock skew) still counts as today
  return Math.max(age, 0) < (maxAgeDays ?? maxAgeOf(block));
}

const shopFmt = (d, opts) => new Intl.DateTimeFormat('en-US', { timeZone: SHOP_TZ, ...opts }).format(d);

/** "Thu, Oct 16" on the shop's clock ('' if unparseable). */
export function boardDate(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return shopFmt(d, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** "Oct 16" on the shop's clock ('' if unparseable). */
export function shortDate(iso) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return shopFmt(d, { month: 'short', day: 'numeric' });
}

/** "Updated today" / "Updated yesterday" / "Updated Tue" / "Updated Oct 3". */
export function updatedLabel(iso, now = new Date()) {
  const age = daysAgo(iso, now);
  if (age == null) return '';
  if (age <= 0) return 'Updated today';
  if (age === 1) return 'Updated yesterday';
  // a kept-up photo can be weeks old: past a week the weekday alone would lie
  if (age >= 7) return `Updated ${shortDate(iso)}`;
  return `Updated ${dayName(shopNow(new Date(iso)).dow, true)}`;
}

/** Alt text for a past board: "Our chalkboard on Thu, Oct 16: Pumpkin cold foam". */
export function boardAlt(b) {
  const when = boardDate(b?.published_at);
  return `Our chalkboard${when ? ` on ${when}` : ''}${b?.caption ? `: ${b.caption}` : ''}`;
}

/* ---- history -------------------------------------------------------------- */

const boardId = (b) => String(b?.id || b?.path || b?.url || '');
const timeOf = (b) => {
  const t = Date.parse(b?.published_at || '');
  return Number.isNaN(t) ? 0 : t;
};

/** Every board in a chalkboard_history block (hidden ones included), cleaned
    up and newest first. Accepts { boards: [...] } or a bare array. */
export function historyBoards(block) {
  const raw = Array.isArray(block) ? block : Array.isArray(block?.boards) ? block.boards : [];
  const seen = new Set();
  const out = [];
  for (const b of raw) {
    if (!b || typeof b !== 'object' || !b.url) continue;
    const id = boardId(b);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      url: String(b.url),
      path: String(b.path || ''),
      caption: String(b.caption || ''),
      published_at: b.published_at || null,
      hidden: b.hidden === true,
    });
  }
  return out.sort((a, b) => timeOf(b) - timeOf(a));
}

/** The boards the public may see: not hidden, newest first. */
export function publicBoards(block) {
  return historyBoards(block).filter((b) => !b.hidden);
}

/** A history entry for a published chalkboard_photo block. */
export function entryFor(photo, publishedAt = photo?.updated_at) {
  return {
    id: String(photo.path || photo.url),
    url: photo.url,
    path: photo.path || '',
    caption: photo.caption || '',
    published_at: publishedAt || null,
    hidden: false,
  };
}

/** `boards` with `entry` added (or, if it's already there, updated in place —
    its first-published date and hidden flag are kept), newest first. */
export function addToHistory(boards, entry) {
  const list = historyBoards(boards);
  const id = boardId(entry);
  const i = list.findIndex((b) => b.id === id);
  if (i >= 0) {
    const was = list[i];
    list[i] = { ...was, ...entry, id, hidden: was.hidden, published_at: was.published_at || entry.published_at || null };
    return historyBoards(list);
  }
  return historyBoards([{ ...entry, id }, ...list]);
}

/** The public past boards (hidden ones left out), newest first: null while
    loading, [] when there are none or the read failed. */
export function useChalkboardHistory() {
  const [boards, setBoards] = useState(null);
  const version = useDataVersion('content_blocks');
  useEffect(() => {
    let alive = true;
    getContentBlock(CHALKBOARD_HISTORY_KEY)
      .then((b) => alive && setBoards(publicBoards(b)))
      .catch(() => alive && setBoards([]));
    return () => { alive = false; };
  }, [version]);
  return boards;
}

/* ---- photo shape ---------------------------------------------------------- */

/** A board this much wider than tall gets the wide hero layout. */
export const WIDE_RATIO = 1.2;

/** { width, height } from a block (or an <img>'s natural size), or null. */
export function photoSize(src) {
  // an <img> also has width/height, but those are its rendered size
  const el = src != null && typeof src === 'object' && 'naturalWidth' in src;
  const w = Math.round(Number(el ? src.naturalWidth : src?.width));
  const h = Math.round(Number(el ? src.naturalHeight : src?.height));
  return w > 0 && h > 0 ? { width: w, height: h } : null;
}

/** True for a landscape (horizontal) board photo. */
export function isWide(size) {
  return Boolean(size) && size.width / size.height >= WIDE_RATIO;
}

/** The chalkboard block plus whether the read has finished:
    { ready: false, photo: null } while loading, then { ready: true, photo }
    where photo is the live block or null (the drawn board should show). */
export function useChalkboard({ maxAgeDays } = {}) {
  const [state, setState] = useState({ ready: false, block: null });
  const version = useDataVersion('content_blocks');
  useEffect(() => {
    let alive = true;
    getContentBlock(CHALKBOARD_KEY)
      .then((b) => alive && setState({ ready: true, block: b || null }))
      .catch(() => alive && setState({ ready: true, block: null }));
    return () => { alive = false; };
  }, [version]);
  return { ready: state.ready, photo: isChalkboardLive(state.block, { maxAgeDays }) ? state.block : null };
}

/** The live chalkboard block, or null when the drawn board should show. */
export function useChalkboardPhoto(opts) {
  return useChalkboard(opts).photo;
}
