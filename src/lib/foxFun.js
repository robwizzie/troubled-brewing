import { computeStatus, dayName, nextOpening, shopNow } from './hours.js';

/* The fox's games and moods — all pure functions, so every rule here is
   tested (test/fox-fun.test.js) and FoxGuide.jsx only draws the result.

     · drinkCandidates / pickSurprise — "Surprise me"
     · DAILY + dailyFact               — one fox fact or riddle per day
     · foxMood                         — sleepy / morning / October
     · registerTap                     — petting, and the 10th-tap badge
     · QUIZ + classifyDrink + matchDrink — the pick-a-drink quiz

   Nothing here invents a fact: drinks come from the live menu (available
   items only), hours from the same rows as the rest of the site, and every
   daily fact carries its source. */

/* ---------------------------------------------------------------------------
   Drinks on the menu right now
   ------------------------------------------------------------------------ */

const DRINK_CATEGORIES = ['espresso', 'specialty', 'seasonal'];
// on the drinks menu but not a drink you'd be recommended
const NOT_A_PICK = /pup cup|water cup/i;

/** Available, priced drinks — what the fox may suggest. */
export function drinkCandidates(menu = []) {
  return (menu || []).filter((i) => i && i.name && i.available !== false
    && DRINK_CATEGORIES.includes(i.category)
    && Number(i.price) > 0
    && !NOT_A_PICK.test(i.name));
}

/** Anything available and priced — the fallback if there are no drinks. */
const anyOrderable = (menu = []) => (menu || []).filter((i) => i && i.name && i.available !== false && Number(i.price) > 0);

/** A random available drink (or, failing that, any available item), never
    the same as `not` when there's a choice. `rand` is injectable for tests. */
export function pickSurprise(menu, { not = null, rand = Math.random } = {}) {
  let pool = drinkCandidates(menu);
  if (!pool.length) pool = anyOrderable(menu);
  if (!pool.length) return null;
  const choices = pool.length > 1 && not ? pool.filter((i) => i.name !== not) : pool;
  return choices[Math.floor(rand() * choices.length) % choices.length];
}

export const fmtPrice = (p) => (Number(p) > 0 ? `$${Number(p).toFixed(2)}` : '');

/** "We're closed now, but you can order it when we open at …" — or null while open. */
export function closedOrderNote(hours, overrides, now = new Date()) {
  if (!hours?.length) return null;
  if (computeStatus(hours, overrides, now).open) return null;
  const next = nextOpening(hours, overrides, now);
  if (!next) return 'We’re closed right now.';
  const when = next.inDays === 0 ? `at ${next.time} today` : next.inDays === 1 ? `tomorrow at ${next.time}` : `${dayName(next.dow)} at ${next.time}`;
  return `We’re closed right now. Order it when we open ${when}.`;
}

/* ---------------------------------------------------------------------------
   Today's fox fact (or riddle)
   One per calendar day ON THE SHOP'S CLOCK, the same for everybody: the date
   is hashed to pick an entry, so it doesn't just step through the list.
   Every entry is checkable. Riddles whose answer is a menu item name it in
   `item` and are only in the running while that item is available.
   ------------------------------------------------------------------------ */

export const DAILY = [
  // ---- the shop (same sources as QUIPS in foxDays.js) ----
  // about page + TIMELINE_EVENTS tl-1 (seed.js)
  { id: 'opened', kind: 'fact', text: 'We opened on Friday the 13th of October, 2017. Trouble from day one.' },
  // about page, "What's in the cup"; the Cappuccino's menu description names La Colombe
  { id: 'beans', kind: 'fact', text: 'Our espresso is La Colombe, and our teas are Metolius.' },
  // home page intro ("Breakfast is served all day")
  { id: 'breakfast', kind: 'fact', text: 'Breakfast is served all day. Bagel sandwich at 2 PM? Go for it.' },
  // the Cranberry Walnut Chicken Salad's own menu description
  { id: 'chicken', kind: 'fact', text: 'The Cranberry Walnut Chicken Salad is our most popular sandwich.' },
  // about page: Tom and Cat were mortgage bankers before opening the shop
  { id: 'bankers', kind: 'fact', text: 'Before they opened Trouble, Tom and Cat spent years in mortgage banking.' },
  // TIMELINE_EVENTS tl-3 (from the shop's Instagram)
  { id: 'birthday-lattes', kind: 'fact', text: 'For our ninth birthday in October 2026 we poured two birthday lattes: The Max and The Ruby.' },
  // TIMELINE_EVENTS tl-4 (The Retrospect's Quick Bites review)
  { id: 'retrospect', kind: 'fact', text: 'When The Retrospect reviewed us, the French toast muffin was “a group favorite.”' },
  // WALL_ART 'balloon-fox' (src/lib/galleryWall.js)
  { id: 'balloon', kind: 'riddle', text: 'Two foxes in waistcoats float across our gallery wall in a striped hot-air balloon. What’s the piece called?', answer: 'Foxes in a Balloon.' },
  // WALL_ART 'bicycle-fox'
  { id: 'bicycle', kind: 'riddle', text: 'Which fox on our gallery wall has butterfly wings and rides past a blue-doored shop?', answer: 'Fox on a Bicycle.' },
  // ---- riddles answered by a real, available menu item ----
  { id: 'pup', kind: 'riddle', item: 'Pup Cup!', text: 'I’m on the drinks menu, but I’m not for you. I’m for your four-legged friend. What am I?', answer: 'The Pup Cup!' },
  { id: 'coconut', kind: 'riddle', item: 'Coconut Water Americano', text: 'I’m an Americano that traded plain water for something tropical. What am I?', answer: 'The Coconut Water Americano.' },
  { id: 'tonic', kind: 'riddle', item: 'Espresso Tonic', text: 'Espresso, but make it fizzy. What am I?', answer: 'The Espresso Tonic.' },
  { id: 'fog', kind: 'riddle', item: 'Hot London Fog', text: 'I’m named after the weather in a famous city, and you can have me hot or iced. What am I?', answer: 'The London Fog.' },
  // ---- Haddon Heights ----
  // https://en.wikipedia.org/wiki/Haddon_Heights,_New_Jersey ("incorporated as a borough … on March 2, 1904")
  { id: 'hh-1904', kind: 'fact', text: 'Haddon Heights became a borough on March 2, 1904.' },
  // https://en.wikipedia.org/wiki/Haddon_Heights,_New_Jersey ("named for Elizabeth Haddon, an early settler")
  { id: 'hh-name', kind: 'fact', text: 'Haddon Heights is named for Elizabeth Haddon, an early settler of the area.' },
  // https://www.haddonhts.com/1431/History (Lippincott, 1890, Atlantic City Railroad Company)
  { id: 'hh-station', kind: 'fact', text: 'In 1890 Benjamin A. Lippincott built a passenger station on his land for the Atlantic City Railroad, then filed a street plan to develop a community.' },
  // https://www.haddonhts.com/1431/History ("By 1904 … incorporate as a Borough, with Lippincott being elected as Mayor")
  { id: 'hh-mayor', kind: 'fact', text: 'When Haddon Heights incorporated in 1904, Benjamin Lippincott was elected its mayor.' },
  // https://www.haddonhts.com/1431/History ("rail passenger service ceased in July 1965")
  { id: 'hh-1965', kind: 'fact', text: 'Passenger trains stopped serving Haddon Heights in July 1965.' },
  // https://www.haddonhts.com/1431/History ("settled in 1699 when a one-room, brick house was constructed")
  { id: 'hh-1699', kind: 'fact', text: 'The land that became Haddon Heights was settled in 1699, starting with a one-room brick house.' },
  // https://camdencounty.com/service/parks/haddon-lake-park ("73.47 acres … Haddon Heights, Audubon and Mount Ephraim")
  { id: 'hh-lake', kind: 'fact', text: 'Haddon Lake Park covers 73.47 acres across Haddon Heights, Audubon and Mount Ephraim.' },
  // https://camdencounty.com/service/parks/haddon-lake-park ("Outdoor Amphitheater – The Norcross-McLaughlin Memorial Dell")
  { id: 'hh-dell', kind: 'fact', text: 'Haddon Lake Park has an outdoor amphitheater: the Norcross-McLaughlin Memorial Dell.' },
  // https://en.wikipedia.org/wiki/Haddon_Heights,_New_Jersey (2020 census: 7,495)
  { id: 'hh-pop', kind: 'fact', text: 'At the 2020 census, 7,495 people lived in Haddon Heights.' },
];

/** A stable 32-bit hash of a string (FNV-1a). */
function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Today's entry (and the shop date it belongs to). Riddles about a menu
    item only count while that item is available. */
export function dailyFact(now = new Date(), menu = null) {
  const { isoDate } = shopNow(now);
  const live = menu ? new Set(menu.filter((i) => i && i.available !== false).map((i) => i.name)) : null;
  const pool = DAILY.filter((d) => !d.item || !live || live.has(d.item));
  return { ...pool[hash(isoDate) % pool.length], date: isoDate };
}

/* ---------------------------------------------------------------------------
   His mood, by the shop's clock
   ------------------------------------------------------------------------ */

/** { sleepy, morning, october, next } — sleepy whenever the shop is closed
    (with the real next opening), morning = open and before 11 AM, october =
    the month (any day of it, from foxDays' calendar date). */
export function foxMood({ hours = [], overrides = [], now = new Date(), today = now } = {}) {
  const october = today.getMonth() === 9;
  if (!hours?.length) return { sleepy: false, morning: false, october, next: null };
  const s = computeStatus(hours, overrides, now);
  const next = s.open ? null : nextOpening(hours, overrides, now);
  return { sleepy: !s.open, morning: s.open && shopNow(now).minutes < 11 * 60, october, next };
}

/** "Back at 7:30 AM!" / "Back tomorrow at 8:00 AM!" for the sleepy fox. */
export function backLine(next) {
  if (!next) return 'Zzz… we’re closed right now.';
  if (next.inDays === 0) return `Zzz… back at ${next.time}!`;
  if (next.inDays === 1) return `Zzz… back tomorrow at ${next.time}!`;
  return `Zzz… back ${dayName(next.dow)} at ${next.time}!`;
}

/* ---------------------------------------------------------------------------
   Petting
   A tap within QUICK_MS of the last one is a pet, not a click: it never
   toggles the card (so the first tap opens it and petting leaves it be).
   PET_COUNT taps inside PET_WINDOW_MS wag his tail. Every 10th tap ever
   earns the Trouble-maker badge — the award card the first time, a little
   confetti after that.
   ------------------------------------------------------------------------ */

export const QUICK_MS = 450;
export const PET_COUNT = 3;
export const PET_WINDOW_MS = 1500;
export const BADGE_EVERY = 10;

/** state: { recent: number[], total: number, badge: boolean } */
export function registerTap(state, t) {
  const prev = state?.recent || [];
  const last = prev[prev.length - 1];
  const recent = [...prev.filter((x) => t - x <= PET_WINDOW_MS), t];
  const total = (state?.total || 0) + 1;
  const milestone = total % BADGE_EVERY === 0;
  const award = milestone && !state?.badge;
  return {
    state: { recent, total, badge: Boolean(state?.badge || milestone) },
    quick: last != null && t - last < QUICK_MS,
    wag: recent.length >= PET_COUNT,
    award,            // first time: show the award card
    confetti: milestone,
  };
}

/* ---------------------------------------------------------------------------
   The pick-a-drink quiz
   ------------------------------------------------------------------------ */

export const QUIZ = [
  { id: 'temp', q: 'Hot or iced?', options: [{ value: 'hot', label: 'Hot' }, { value: 'iced', label: 'Iced' }] },
  { id: 'taste', q: 'Sweet or strong?', options: [{ value: 'sweet', label: 'Sweet' }, { value: 'strong', label: 'Strong' }] },
  { id: 'caffeine', q: 'Caffeine or not?', options: [{ value: 'yes', label: 'Caffeine, please' }, { value: 'no', label: 'No caffeine' }] },
];

/* The matching rules, in one place. Each reads only the item's real name,
   SpotOn category and description:
     temp     iced  — SpotOn category says Iced/Frozen, or the name says
                      iced / frozen / frappe / cold brew / lemonade /
                      refresher / tonic / aircano / shaken; otherwise hot
     taste    sweet — chocolate, caramel, vanilla, cookies, frappe, frozen,
                      chai, cider, lemonade, refresher, London Fog, mocha,
                      sweet…
              strong — espresso-forward: espresso, americano, cortado,
                      macchiato, cold brew, drip, aircano, flat white, tonic
              neither (a latte, matcha, plain tea) → null: no taste claim
     caffeine no   — the description says non-caffeinated / decaf, or it's a
                      hot chocolate, steamer, cider or lemonade
              yes  — coffee, espresso, matcha, chai, London Fog (Earl Grey)
              anything else (plain tea, turmeric, refreshers) → null: we
                      don't know, so it never counts as a match */
const ICED_CAT = /iced|frozen/i;
const ICED_NAME = /\b(iced|frozen|frapp?e|cold brew|lemonade|refreshers?|tonic|aircano|shaken)\b/i;
const SWEET = /\b(chocolate|caramel|vanilla|cookies|frapp?e|frozen|chai|cider|lemonade|refreshers?|london fog|mocha|sweet|syrup)\b/i;
const STRONG = /\b(espresso|americano|cortado|macc?hiato|cold brew|drip|aircano|flat white|tonic)\b/i;
const NO_CAF_DESC = /non-?caffeinated|caffeine[- ]free|decaf/i;
const NO_CAF_NAME = /\b(hot chocolate|steamer|cider|lemonade|frapp?e)\b/i;
const CAF = /\b(coffee|espresso|americano|cortado|macc?hiato|latte|cappuccino|flat white|cold brew|drip|aircano|cafe au lait|matcha|chai|london fog)\b/i;

export function classifyDrink(item) {
  const name = String(item?.name || '');
  const text = `${name} ${item?.description || ''}`;
  const iced = ICED_CAT.test(item?.spoton_category || '') || ICED_NAME.test(name);
  const strong = STRONG.test(name) && !SWEET.test(name);
  const sweet = SWEET.test(text) && !strong;
  let caffeine = null;
  if (NO_CAF_DESC.test(text) || NO_CAF_NAME.test(name)) caffeine = 'no';
  else if (/turmeric/i.test(name)) caffeine = null; // depends on the recipe — not claimed
  else if (CAF.test(name)) caffeine = 'yes';
  return { temp: iced ? 'iced' : 'hot', taste: sweet ? 'sweet' : strong ? 'strong' : null, caffeine };
}

const SAY = {
  temp: { hot: 'hot', iced: 'iced' },
  taste: { sweet: 'sweet', strong: 'strong' },
  caffeine: { yes: 'caffeinated', no: 'caffeine-free' },
};

/** Best available drink for the answers { temp, taste, caffeine }.
    Score = how many of the three it definitely matches; ties broken by
    `rand` (injectable). Returns { item, exact, misses: [phrases] } or null. */
export function matchDrink(menu, answers, { rand = Math.random } = {}) {
  const pool = drinkCandidates(menu);
  if (!pool.length) return null;
  const scored = pool.map((item) => {
    const c = classifyDrink(item);
    const misses = [];
    let score = 0;
    for (const k of ['temp', 'taste', 'caffeine']) {
      if (c[k] === answers[k]) score += 1;
      else if (c[k] == null) misses.push(k === 'caffeine' ? 'we can’t promise on the caffeine' : `it isn’t especially ${SAY[k][answers[k]]}`);
      else misses.push(`it’s ${SAY[k][c[k]]}, not ${SAY[k][answers[k]]}`);
    }
    return { item, score, misses };
  });
  const best = Math.max(...scored.map((s) => s.score));
  const top = scored.filter((s) => s.score === best);
  const pick = top[Math.floor(rand() * top.length) % top.length];
  return { item: pick.item, exact: best === 3, misses: pick.misses };
}
