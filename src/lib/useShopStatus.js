import { useEffect, useState } from 'react';
import { getHours, getHoursOverrides, getGoogleProfile } from './dataService.js';
import { computeStatus, googleWeekly } from './hours.js';

/* The shop's live open/closed status, from the same sources and rules as
   <HoursToday> (Google hours when cached, the admin table otherwise, holiday
   overrides on top), re-checked every minute so a page left open flips on
   time. `null` until the hours load.

   `?lights=on|off` forces it, so the after-hours look can be previewed at
   lunchtime (and the open look at midnight). */
export function useShopStatus() {
  const [src, setSrc] = useState(null);
  const [, tick] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([getHours(), getHoursOverrides(), getGoogleProfile()]).then(([h, o, g]) => {
      if (!alive) return;
      const google = googleWeekly(g);
      setSrc({ hours: google.length ? google : h, overrides: o });
    });
    const id = setInterval(() => tick((t) => t + 1), 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!src) return null;
  const status = computeStatus(src.hours, src.overrides);
  const force = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('lights') : null;
  if (force === 'on' || force === 'off') return { ...status, open: force === 'on' };
  return status;
}
