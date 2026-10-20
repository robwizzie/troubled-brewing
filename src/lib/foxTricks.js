import { dayName, nextOpening, shopNow } from './hours.js';

/* The fox's hidden tricks — small rewards for people who poke around. Never
   announced on the site (the admin Help has a "Fox secrets" note so the
   owners know), never in the way. All rules are pure and tested
   (test/fox-tricks.test.jsx); src/lib/useFoxTricks.js wires them up and
   src/components/FoxTricks.jsx draws them.

     · registerTipTap   — tap him 5 times quickly: he tips his top hat
     · trickDay         — the shop's birthday, Oct 13 (it opened on Friday
                          the 13th of October 2017): a party hat on top of
                          the top hat, and "We turn N today!"
     · nightLook        — after 11 PM and before 5 AM while the shop is
                          closed: a crescent moon and stars in his card, and
                          "Shh… the beans are sleeping."

   ?foxday=MM-DD previews a date (shared with foxDays / the outfits), e.g.
   ?foxday=10-13 for the birthday. */

export const OPENED = { year: 2017, month: 10, day: 13 }; // Friday the 13th, Oct 2017

/* ---- the hat tip ---------------------------------------------------------- */
export const TIP_TAPS = 5;
export const TIP_GAP_MS = 500; // a slower tap starts the count again
export const TIP_MS = 1700; // the whole lift, tip and settle

export const TIP_LINES = ['Why, thank you.', 'At your service.', 'Charmed, I’m sure.', 'A pleasure, as always.'];

/** state: { n, last } → { state, tip }. Five taps, each within TIP_GAP_MS of
    the one before, tip the hat once; the count then starts over. */
export function registerTipTap(state, t) {
  const last = state?.last;
  const n = last != null && t - last <= TIP_GAP_MS ? (state?.n || 0) + 1 : 1;
  if (n >= TIP_TAPS) return { state: { n: 0, last: t }, tip: true };
  return { state: { n, last: t }, tip: false };
}

/* ---- special days --------------------------------------------------------- */

function ordinalWord(n) {
  const words = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  return words[n] || String(n);
}

/** { anniversary: years | null, greeting } for a calendar date (foxToday(),
    so ?foxday=10-13 previews it). */
export function trickDay(date = new Date()) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const anniversary = m === OPENED.month && d === OPENED.day && date.getFullYear() > OPENED.year
    ? date.getFullYear() - OPENED.year : null;
  const greeting = anniversary ? `We turn ${anniversary} today! Thanks for ${ordinalWord(anniversary)} years of Trouble.` : null;
  return { anniversary, greeting };
}

/* ---- late at night -------------------------------------------------------- */
export const MOON_FROM = 23 * 60; // 11 PM
export const MOON_UNTIL = 5 * 60; // 5 AM

/** "We open at 7:30 AM." / "We open Monday at 8:00 AM." */
function openLine(next) {
  if (!next) return '';
  return next.inDays <= 1 ? ` We open at ${next.time}.` : ` We open ${dayName(next.dow)} at ${next.time}.`;
}

/** { moon, greeting } — the moon and the hushed greeting only show while the
    shop is closed, from 11 PM until 5 AM on the shop's clock. */
export function nightLook({ hours = [], overrides = [], now = new Date(), sleepy = false } = {}) {
  const { minutes } = shopNow(now);
  const late = minutes >= MOON_FROM || minutes < MOON_UNTIL;
  if (!late || !sleepy) return { moon: false, greeting: null };
  const next = hours?.length ? nextOpening(hours, overrides, now) : null;
  return { moon: true, greeting: `Shh… the beans are sleeping.${openLine(next)}` };
}

/* ---- analytics: each trick counts once per visit -------------------------- */
const TRACKED_KEY = 'tb-fox-tricks';
const trackedHere = new Set();

/** True the first time `name` is seen this visit (sessionStorage, with an
    in-memory fallback for private mode). */
export function firstThisVisit(name) {
  if (trackedHere.has(name)) return false;
  trackedHere.add(name);
  try {
    const seen = JSON.parse(window.sessionStorage.getItem(TRACKED_KEY) || '[]');
    if (Array.isArray(seen) && seen.includes(name)) return false;
    window.sessionStorage.setItem(TRACKED_KEY, JSON.stringify([...(Array.isArray(seen) ? seen : []), name]));
  } catch { /* private mode: the in-memory set is enough */ }
  return true;
}

/** Test hook: forget what was tracked. */
export function resetTrickTracking() {
  trackedHere.clear();
  try { window.sessionStorage.removeItem(TRACKED_KEY); } catch { /* fine */ }
}
