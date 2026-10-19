/* What the fox says, and when.

   The speaking fox is the dapper top-hatted fox from the logo
   (images/brand/fox-sipping.png) — not the gold fox-head sculpture on the
   gallery wall, so nothing here gives him spectacles.

   Special days get a bubble that pops up by itself (once per day per
   visitor). Every other day the fox only talks when someone taps him, and
   then only says true, useful things: the shop's real hours (FoxGuide.jsx
   adds that line live) and the facts in QUIPS below. Nothing here invents a
   promotion or a special.

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
  if (m === 12 && (d === 24 || d === 25)) return { id: 'xmas', text: 'Merry everything, from all of us at Trouble Brewing.' };
  if (m === 1 && d === 1) return { id: 'newyear', text: 'Happy New Year! Same wall, new year.' };
  if (m === 2 && d === 14) return { id: 'valentine', text: 'Bring your favorite person. Two coffees, one table by the wall.' };
  return null;
}

/** Everyday lines, for when someone taps the fox. Every one is checkable
    against content already in this repo — if the source changes, change the
    line (or drop it):
      · order ahead  — the home "Skip the line" CTA ("Order ahead on SpotOn
                       and we'll have it ready") and the Order Now button
                       (src/lib/seed.js SECTIONS.home / .menu)
      · address      — SITE.address and the about-page story, 514 Station Ave
      · opening day  — about page + TIMELINE_EVENTS: Friday the 13th of
                       October, 2017
      · La Colombe / Metolius — about page "What's in the cup"; the menu's
                       Cappuccino description names La Colombe espresso
      · breakfast    — "Breakfast is served all day" (home intro_duo); "Bagel/
                       Breakfast Sandwich" and "No Bread Breakfast Sandwich"
                       are live items in src/data/spoton-menu.json
      · chicken salad — the menu's Cranberry Walnut Chicken Salad description
                       ("our most popular sandwich")
      · gluten-free  — the "Gluten Free Sweeties" category: Oatmeal Creme Pie
                       (GF) and Dark Chocolate Brownie (GF) are available
      · Pup Cup      — the "Pup Cup!" item (Coffee & Espresso Drinks)
      · parking      — the Location page's Parking block
      · events       — the Events & Community page (/events)
    All menu items named here have available !== false in the snapshot. */
export const QUIPS = [
  'Skip the line: order ahead on SpotOn with the Order button and it’ll be ready when you get here.',
  'You’ll find us at 514 Station Ave in Haddon Heights.',
  'We opened on Friday the 13th of October, 2017. Trouble from day one.',
  'Our espresso is La Colombe, and our teas are Metolius.',
  'Breakfast is served all day. Try a breakfast sandwich on a bagel, or the no-bread one.',
  'The Cranberry Walnut Chicken Salad is our most popular sandwich.',
  'Gluten-free? Look for the Gluten Free Sweeties, like the Oatmeal Creme Pie and the Dark Chocolate Brownie.',
  'Bringing your dog? There’s a Pup Cup on the menu just for them.',
  'Parking: there’s street parking out front and a lot behind the shop. Enter from White Horse Pike or Atlantic Ave.',
  'Check the Events page to see what’s coming up at the shop.',
];

/** The date the fox should think it is (honours ?foxday=MM-DD). */
export function foxToday() {
  const now = new Date();
  const q = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('foxday') : null;
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(q || '');
  if (!m) return now;
  return new Date(now.getFullYear(), Number(m[1]) - 1, Number(m[2]), 12);
}
