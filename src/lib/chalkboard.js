import { useEffect, useState } from 'react';
import { getContentBlock } from './dataService.js';
import { useDataVersion } from './dataVersion.js';
import { shopNow, dayName } from './hours.js';

/* The shop's REAL chalkboard, photographed by staff (admin → Today's
   chalkboard) and stored in content_blocks.chalkboard_photo:

     { url, path, caption, updated_at (ISO), enabled, max_age_days }

   The Pastry Case hero shows it in place of its drawn, live-menu board — but
   only while it's fresh. A photo older than `max_age_days` (default 3, counted
   in calendar days on the SHOP's clock, the upload day included) is ignored
   automatically, so last week's specials never show. Every other failure
   (no row, switched off, no url, a broken image) also lands on the drawn
   board, which is always correct because it's built from the live menu. */

export const CHALKBOARD_KEY = 'chalkboard_photo';
export const DEFAULT_MAX_AGE_DAYS = 3;
export const MAX_AGE_CHOICES = [1, 2, 3, 5, 7];

const DAY_MS = 86400000;

/** Whole calendar days (shop clock) between `iso` and `now`; null if unparseable. */
export function daysAgo(iso, now = new Date()) {
  const then = iso ? new Date(iso) : null;
  if (!then || Number.isNaN(then.getTime())) return null;
  const a = Date.parse(`${shopNow(then).isoDate}T00:00:00Z`);
  const b = Date.parse(`${shopNow(now).isoDate}T00:00:00Z`);
  return Math.round((b - a) / DAY_MS);
}

export function maxAgeOf(block, fallback = DEFAULT_MAX_AGE_DAYS) {
  const n = Number(block?.max_age_days);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback;
}

/** True when the photo should be on the site right now. */
export function isChalkboardLive(block, { now = new Date(), maxAgeDays } = {}) {
  if (!block || block.enabled !== true || !block.url) return false;
  const age = daysAgo(block.updated_at, now);
  if (age == null) return false;
  // a timestamp slightly in the future (clock skew) still counts as today
  return Math.max(age, 0) < (maxAgeDays ?? maxAgeOf(block));
}

/** "Updated today" / "Updated yesterday" / "Updated Tue". */
export function updatedLabel(iso, now = new Date()) {
  const age = daysAgo(iso, now);
  if (age == null) return '';
  if (age <= 0) return 'Updated today';
  if (age === 1) return 'Updated yesterday';
  return `Updated ${dayName(shopNow(new Date(iso)).dow, true)}`;
}

/** The live chalkboard block, or null when the drawn board should show. */
export function useChalkboardPhoto({ maxAgeDays } = {}) {
  const [block, setBlock] = useState(null);
  const version = useDataVersion('content_blocks');
  useEffect(() => {
    let alive = true;
    getContentBlock(CHALKBOARD_KEY)
      .then((b) => alive && setBlock(b || null))
      .catch(() => alive && setBlock(null));
    return () => { alive = false; };
  }, [version]);
  return isChalkboardLive(block, { maxAgeDays }) ? block : null;
}
