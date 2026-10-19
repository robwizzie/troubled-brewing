import { supabase } from '../../lib/supabase.js';
import { CHALKBOARD_KEY, DEFAULT_MAX_AGE_DAYS, daysAgo, isChalkboardLive, maxAgeOf } from '../../lib/chalkboard.js';
import { SHOP_TZ, dayName, shopNow } from '../../lib/hours.js';

/* The chalkboard's state in one sentence a barista can read at a glance:
     "On the website now — taken this morning at 7:42, comes down Thursday"
     "Not showing — the drawn menu board is up"
   Shared by the admin home card and the chalkboard screen. All dates are on
   the shop's clock, like the homepage's own freshness check. */

export const EMPTY_CHALKBOARD = {
  url: '', path: '', caption: '', updated_at: null, enabled: false, max_age_days: DEFAULT_MAX_AGE_DAYS,
};

export async function loadChalkboard() {
  const { data, error } = await supabase.from('content_blocks').select('data').eq('key', CHALKBOARD_KEY).maybeSingle();
  if (error) throw error;
  return { ...EMPTY_CHALKBOARD, ...(data?.data || {}) };
}

export async function saveChalkboard(data) {
  const { error } = await supabase
    .from('content_blocks')
    .upsert({ key: CHALKBOARD_KEY, data, status: 'published' }, { onConflict: 'key' });
  if (error) throw error;
}

const shopParts = (d, opts) => new Intl.DateTimeFormat('en-US', { timeZone: SHOP_TZ, ...opts }).format(d);

/** "this morning at 7:42", "yesterday at 4:10 PM", "on Mon at 8:05 AM". */
export function takenLabel(iso, now = new Date()) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  const age = Math.max(daysAgo(iso, now) ?? 0, 0);
  const time = shopParts(d, { hour: 'numeric', minute: '2-digit' }); // "7:42 AM"
  if (age === 0) {
    const h = Math.floor(shopNow(d).minutes / 60);
    const part = h < 12 ? 'this morning' : h < 17 ? 'this afternoon' : 'this evening';
    return `${part} at ${time.replace(/\s?[AP]M$/i, '')}`;
  }
  if (age === 1) return `yesterday at ${time}`;
  if (age < 7) return `on ${dayName(shopNow(d).dow, true)} at ${time}`;
  return `on ${shopParts(d, { month: 'short', day: 'numeric' })}`;
}

/** The shop-calendar day the photo stops showing: { date: Date (UTC midnight), daysAway }. */
export function comesDownOn(iso, maxAge, now = new Date()) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const start = Date.parse(`${shopNow(d).isoDate}T00:00:00Z`);
  const date = new Date(start + maxAge * 86400000);
  const age = Math.max(daysAgo(iso, now) ?? 0, 0);
  return { date, daysAway: maxAge - age };
}

/** "tomorrow", "Thursday", "Mon, Oct 26". */
export function dayWords(date, daysAway) {
  if (daysAway <= 0) return 'today';
  if (daysAway === 1) return 'tomorrow';
  if (daysAway < 7) return dayName(date.getUTCDay());
  return date.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
}

/** If a photo went up right now and stayed `maxAge` days: "until Wednesday night". */
export function untilWords(maxAge, now = new Date()) {
  if (maxAge <= 1) return 'today only';
  const last = comesDownOn(now.toISOString(), maxAge - 1, now);
  return `until ${dayWords(last.date, last.daysAway)} night`;
}

/** { live, text } for the status line. */
export function chalkStatus(block, now = new Date()) {
  const live = isChalkboardLive(block, { now });
  if (live) {
    const down = comesDownOn(block.updated_at, maxAgeOf(block), now);
    return {
      live: true,
      text: `On the website now — taken ${takenLabel(block.updated_at, now)}, comes down ${dayWords(down.date, down.daysAway)}`,
    };
  }
  if (block?.enabled && block.url && block.updated_at) {
    return {
      live: false,
      text: `Not showing — the last photo (taken ${takenLabel(block.updated_at, now)}) has come down, so the drawn menu board is up`,
    };
  }
  return { live: false, text: 'Not showing — the drawn menu board is up' };
}
