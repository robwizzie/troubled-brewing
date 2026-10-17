/* What the gold fox says, and when.

   Special days get a bubble that pops up by itself (once per day per
   visitor). Every other day the fox only talks when someone taps him, and
   then only says true things: what's on the wall, the shop's real hours,
   the shop's real story. Nothing here invents a promotion or a special.

   ?foxday=MM-DD previews a date (e.g. ?foxday=10-13). */

const OPENED = 2017; // Friday the 13th of October, 2017

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** The special-day line for a date, or null on an ordinary day. */
export function specialDay(date = new Date()) {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const fri13 = d === 13 && date.getDay() === 5;
  if (m === 10 && d === 13) {
    const years = date.getFullYear() - OPENED;
    return { id: 'birthday', text: `It’s our ${ordinal(years)} birthday! We opened on Friday the 13th, ${OPENED}.` };
  }
  if (fri13) return { id: 'fri13', text: 'Friday the 13th. We opened on one of those. Lucky us.' };
  if (m === 10 && d === 31) return { id: 'halloween', text: 'Happy Halloween! Have you spotted the pumpkin house on the wall?' };
  if (m === 12 && (d === 24 || d === 25)) return { id: 'xmas', text: 'Merry everything, from all of us on the wall.' };
  if (m === 1 && d === 1) return { id: 'newyear', text: 'Happy New Year! Same wall, new year.' };
  if (m === 2 && d === 14) return { id: 'valentine', text: 'Bring your favorite person. Two coffees, one table by the wall.' };
  return null;
}

/** Everyday lines, for when someone taps the fox. All true. */
export const QUIPS = [
  'Yes, I wear glasses. No, I won’t say what for.',
  'Psst. The brass hare has been watching the espresso machine all day.',
  'Find the two rubber ducks on the wall. I’ll wait.',
  'There’s a fox riding a bicycle over there. Not me. I don’t ride.',
  'Everything on our wall came from somewhere. Ask about it at the counter.',
];

/** The date the fox should think it is (honours ?foxday=MM-DD). */
export function foxToday() {
  const now = new Date();
  const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('foxday') : null;
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(q || '');
  if (!m) return now;
  return new Date(now.getFullYear(), Number(m[1]) - 1, Number(m[2]), 12);
}
