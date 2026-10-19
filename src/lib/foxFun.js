import { computeStatus, dayName, nextOpening, shopNow } from './hours.js';

/* The fox's games and moods — all pure functions, so every rule here is
   tested (test/fox-fun.test.js) and FoxGuide.jsx only draws the result.

     · drinkCandidates / pickSurprise   — "Surprise me"
     · reelStrip + reelPosition         — its slot-machine reel
     · DAILY + dailyFact                — one fox fact or riddle per day
     · foxMood                          — sleepy / morning / October
     · registerTap                      — petting, and the 10th-tap badge
     · QUIZ + classifyDrink + quizPlan + matchDrink + refineOptions
                                        — the pick-a-drink quiz

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
   The "Surprise me" reel
   A slot-machine strip of real drinks that spins down and lands on the pick.
   The strip and the easing are pure so they're tested; FoxPlay only paints
   them (transform + opacity, one requestAnimationFrame loop).
   ------------------------------------------------------------------------ */

export const REEL_MS = 1300;      // the whole spin, settle included
export const REEL_ROWS = 14;      // names that fly past before the pick

/** The names on the reel: `count` random real drinks (never the same twice
    in a row), ending on `final`. */
export function reelStrip(menu, final, { count = REEL_ROWS, rand = Math.random } = {}) {
  let pool = drinkCandidates(menu);
  if (!pool.length) pool = anyOrderable(menu);
  if (!final || !pool.length) return final ? [final] : [];
  const strip = [];
  for (let i = 0; i < count; i += 1) {
    const prev = strip[i - 1];
    const next = i === count - 1 ? final : null; // the last flyer must differ from the pick too
    const options = pool.length > 2 ? pool.filter((d) => d.name !== prev?.name && d.name !== next?.name) : pool;
    strip.push(options[Math.floor(rand() * options.length) % options.length]);
  }
  return [...strip, final];
}

// a gentle ease-out: the last two or three names visibly tick past before it stops
const easeOut = (t) => 1 - (1 - t) ** 2.2;
const easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const REEL_OVERSHOOT = 0.16; // rows past the pick before it settles back
const SETTLE_AT = 0.8;              // share of the spin spent decelerating

/** How far the reel has travelled, in rows, at progress t (0…1) for a strip
    of `rows` rows: it decelerates past the pick by a hair, then settles back
    onto it — ending exactly on the last row, at rest. */
export function reelPosition(t, rows) {
  const end = rows - 1;
  const c = Math.min(1, Math.max(0, t));
  if (c < SETTLE_AT) return (end + REEL_OVERSHOOT) * easeOut(c / SETTLE_AT);
  return end + REEL_OVERSHOOT * (1 - easeInOutSine((c - SETTLE_AT) / (1 - SETTLE_AT)));
}

/* ---------------------------------------------------------------------------
   The pick-a-drink quiz
   Up to five questions, asked in this order. Each one is only asked when the
   drinks still in the running actually differ on it, and only offers the
   answers some of those drinks have — so every path ends on a real drink
   that ticks every box the visitor ticked. Every question can be skipped
   ("No preference", stored as ANY).
   ------------------------------------------------------------------------ */

export const ANY = 'any';

export const QUIZ = [
  {
    id: 'temp', q: 'Hot, iced or frozen?',
    options: [{ value: 'hot', label: 'Hot' }, { value: 'iced', label: 'Iced' }, { value: 'frozen', label: 'Frozen' }],
  },
  {
    id: 'base', q: 'What are you in the mood for?',
    options: [
      { value: 'coffee', label: 'Coffee & espresso' },
      { value: 'tea', label: 'Tea, chai & matcha' },
      { value: 'chocolate', label: 'Chocolate' },
      { value: 'fruity', label: 'Fruity & refreshing' },
      { value: 'nocaf', label: 'Caffeine-free' },
    ],
  },
  {
    id: 'caffeine', q: 'Caffeine?',
    options: [{ value: 'yes', label: 'Yes, please' }, { value: 'no', label: 'None for me' }],
  },
  {
    id: 'flavour', q: 'Which sounds best?',
    options: [
      { value: 'sweet', label: 'Sweet' },
      { value: 'creamy', label: 'Creamy' },
      { value: 'bold', label: 'Bold' },
      { value: 'spiced', label: 'Spiced' },
      { value: 'fruity', label: 'Fruity' },
    ],
  },
  {
    id: 'milk', q: 'Milk in it?',
    options: [{ value: 'yes', label: 'With milk' }, { value: 'no', label: 'No milk' }],
  },
];

/* What each drink IS, read only from its real name, SpotOn category,
   description and dietary flags. Anything the data doesn't say stays null
   (or out of the list) and is never claimed.

     temp      frozen — SpotOn category says Frozen, or the name says frozen /
                        frappe / blended / smoothie
               iced   — SpotOn category says Iced, or the name says iced / cold
                        brew / lemonade / refresher / tonic / aircano / shaken
               hot    — everything else on the drinks menu
     base      coffee — coffee, espresso, americano, cortado, macchiato,
                        cappuccino, flat white, cold brew, drip, aircano, au
                        lait, mocha, or a plain "latte" (not chai / matcha /
                        turmeric / tea)
               tea    — tea, chai, matcha, London Fog, Earl Grey
               chocolate — chocolate, cocoa, mocha
               fruity — lemonade, refresher, cider, or a named fruit
               nocaf  — caffeine is known to be "no" (below)
     caffeine  no     — the description says non-caffeinated / caffeine-free /
                        decaf, or it's a hot chocolate, steamer, cider or
                        lemonade
               yes    — coffee drinks (above), matcha, chai, London Fog
               null   — plain tea, turmeric, refreshers…: not promised
     flavour   sweet  — chocolate, caramel, vanilla, cookies, frappe, frozen,
                        chai, cider, lemonade, refresher, London Fog, mocha,
                        pumpkin, maple, honey, syrup… (and not plainly bold)
               creamy — latte, cappuccino, flat white, au lait, steamer,
                        frappe, cream, milk, London Fog, hot chocolate, mocha
               bold   — espresso-forward: espresso, americano, cortado,
                        macchiato, cold brew, drip, aircano, flat white,
                        tonic (and nothing sweet in the name)
               spiced — chai, turmeric, pumpkin, cinnamon, ginger, spice…
               fruity — lemonade, refresher, cider, or a named fruit
     milk      yes    — latte, cappuccino, flat white, au lait, cortado,
                        macchiato, steamer, milk, cream, London Fog, hot
                        chocolate, mocha
               no     — plain espresso / americano / drip / cold brew /
                        aircano / tea, tonic, coconut water, lemonade,
                        refresher, cider; or flagged dairy-free / vegan
               null   — anything else */
const FROZEN_CAT = /frozen/i;
const FROZEN_NAME = /\b(frozen|frapp?e|blended|smoothie)\b/i;
const ICED_CAT = /iced|cold/i;
const ICED_NAME = /\b(iced|cold brew|lemonade|refreshers?|tonic|aircano|shaken)\b/i;
const COFFEE = /\b(coffee|espresso|americano|cortado|macc?h?iato|machiatto|cappuccino|flat white|cold brew|drip|aircano|au lait|mocha|ristretto|doppio)\b/i;
const NOT_COFFEE_LATTE = /\b(chai|matcha|turmeric|london fog|tea|golden)\b/i;
const TEA = /\b(tea|chai|matcha|london fog|earl grey)\b/i;
const CHOCOLATE = /\b(chocolate|cocoa|mocha)\b/i;
const FRUIT = /\b(lemonade|refreshers?|cider|apple|berry|berries|lemon|lime|peach|mango|strawberry|raspberry|blueberry|cherry|lychee|orange|citrus|pineapple|passion ?fruit|watermelon|cranberry)\b/i;
const NO_CAF_DESC = /non-?caffeinated|caffeine[- ]free|decaf/i;
const NO_CAF_NAME = /\b(hot chocolate|hot cocoa|steamer|cider|lemonade|decaf)\b/i;
const CAF = /\b(matcha|chai|london fog)\b/i;
const SWEET = /\b(chocolate|cocoa|caramel|vanilla|cookies|creme|frapp?e|frozen|chai|cider|lemonade|refreshers?|london fog|mocha|sweet|syrup|honey|maple|pumpkin|toffee|butterscotch|marshmallow|hazelnut|peppermint|brown sugar|banana split|dirty soda)\b/i;
const CREAMY = /\b(latte|cappuccino|flat white|au lait|steamer|frapp?e|cream|creme|milk|london fog|hot chocolate|mocha)\b/i;
const BOLD = /\b(espresso|americano|cortado|macc?h?iato|machiatto|cold brew|drip|aircano|flat white|tonic|ristretto|doppio)\b/i;
const SPICED = /\b(chai|turmeric|pumpkin|cinnamon|ginger|gingerbread|spiced?|nutmeg|cardamom|clove)\b/i;
const MILK = /\b(latte|cappuccino|flat white|au lait|cortado|macc?h?iato|machiatto|steamer|milk|cream|london fog|hot chocolate|mocha)\b/i;
const NO_MILK = /^(hot |iced )?(espresso|americano|drip coffee|cold brew|aircano|tea)\b|\b(tonic|coconut water|lemonade|refreshers?|cider)\b/i;

/** What a drink is: { temp, base[], caffeine, flavour[], milk }. */
export function classifyDrink(item) {
  const name = String(item?.name || '');
  const desc = String(item?.description || '');
  const text = `${name} ${desc}`;
  const cat = String(item?.spoton_category || '');
  const flags = (item?.dietary_flags || []).map((f) => String(f).toLowerCase());

  const temp = FROZEN_CAT.test(cat) || FROZEN_NAME.test(name) ? 'frozen'
    : ICED_CAT.test(cat) || ICED_NAME.test(name) ? 'iced' : 'hot';

  const coffee = COFFEE.test(name) || (/\blatte\b/i.test(name) && !NOT_COFFEE_LATTE.test(name));
  let caffeine = null;
  if (NO_CAF_DESC.test(text) || NO_CAF_NAME.test(name)) caffeine = 'no';
  else if (coffee || CAF.test(name)) caffeine = 'yes';

  const base = [];
  if (coffee && caffeine !== 'no') base.push('coffee');
  if (TEA.test(name)) base.push('tea');
  if (CHOCOLATE.test(text)) base.push('chocolate');
  if (FRUIT.test(name)) base.push('fruity');
  if (caffeine === 'no') base.push('nocaf');

  const sweet = SWEET.test(text);
  const bold = BOLD.test(name) && !SWEET.test(name);
  const flavour = [];
  if (sweet && !bold) flavour.push('sweet');
  if (CREAMY.test(text)) flavour.push('creamy');
  if (bold) flavour.push('bold');
  if (SPICED.test(text)) flavour.push('spiced');
  if (FRUIT.test(text)) flavour.push('fruity');

  let milk = null;
  if (flags.includes('dairy-free') || flags.includes('vegan')) milk = 'no';
  else if (MILK.test(text)) milk = 'yes';
  else if (NO_MILK.test(name)) milk = 'no';

  return { temp, base, caffeine, flavour, milk };
}

/** Does a drink's profile tick this answer? true / false / null (unknown). */
function ticks(c, id, value) {
  if (value == null || value === ANY) return true;
  if (id === 'base' || id === 'flavour') return c[id].includes(value);
  if (c[id] == null) return null;
  return c[id] === value;
}

const scoredPool = (menu) => drinkCandidates(menu).map((item) => ({ item, c: classifyDrink(item) }));

/** The questions to ask, in order, given the answers so far — each with only
    the options some remaining drink has. A question is asked only when at
    least two answers are possible and one of them would narrow things down.
    Which questions come up depends only on the answers BEFORE them. */
export function quizPlan(menu, answers = {}) {
  let pool = scoredPool(menu);
  const plan = [];
  for (const q of QUIZ) {
    const options = q.options
      .map((o) => ({ ...o, n: pool.filter(({ c }) => ticks(c, q.id, o.value) === true).length }))
      .filter((o) => o.n > 0);
    if (options.length >= 2 && options.some((o) => o.n < pool.length)) {
      plan.push({ id: q.id, q: q.q, options: options.map(({ value, label }) => ({ value, label })) });
      const a = answers[q.id];
      if (a != null && a !== ANY && options.some((o) => o.value === a)) {
        pool = pool.filter(({ c }) => ticks(c, q.id, a) === true);
      }
    }
  }
  return plan;
}

/* Scoring — transparent and in one place. For each question answered (not
   skipped):
     temp      +4 match · iced↔frozen −2 (both cold) · otherwise −8
     base      +3 if the drink is that kind · −3 if not
     caffeine  +4 match · 0 unknown (never promised) · −8 wrong
     flavour   +2 if it has that flavour · −1 if not
     milk      +1 match · 0 unknown · −2 wrong
   Refinements from the result card, on top:
     less-sweet  drops a "sweet" answer; sweet drinks −3, others +1
     sweeter     sweet drinks +3
     stronger    bold drinks +3, others −1
     creamier    creamy drinks +3, others −1
     more        same answers, but the drinks already shown step aside
   Highest score wins; ties are broken at random (`rand`, injectable), so
   two visitors with the same answers can meet different, equally good
   drinks. */
export const WEIGHTS = { temp: 4, base: 3, caffeine: 4, flavour: 2, milk: 1 };

export const REFINES = [
  { id: 'more', label: 'More like this' },
  { id: 'less-sweet', label: 'Less sweet' },
  { id: 'sweeter', label: 'Sweeter' },
  { id: 'stronger', label: 'Stronger' },
  { id: 'creamier', label: 'Creamier' },
];

const effective = (answers, refine) => (refine.includes('less-sweet') && answers.flavour === 'sweet'
  ? { ...answers, flavour: ANY } : answers);

export function scoreDrink(c, answers = {}, refine = []) {
  const a = effective(answers, refine);
  let s = 0;
  const set = (k) => a[k] != null && a[k] !== ANY;
  if (set('temp')) {
    if (c.temp === a.temp) s += WEIGHTS.temp;
    else if (c.temp !== 'hot' && a.temp !== 'hot') s -= 2;
    else s -= WEIGHTS.temp * 2;
  }
  if (set('base')) s += c.base.includes(a.base) ? WEIGHTS.base : -WEIGHTS.base;
  if (set('caffeine')) {
    if (c.caffeine === a.caffeine) s += WEIGHTS.caffeine;
    else if (c.caffeine != null) s -= WEIGHTS.caffeine * 2;
  }
  if (set('flavour')) s += c.flavour.includes(a.flavour) ? WEIGHTS.flavour : -1;
  if (set('milk')) {
    if (c.milk === a.milk) s += WEIGHTS.milk;
    else if (c.milk != null) s -= WEIGHTS.milk * 2;
  }
  const sweet = c.flavour.includes('sweet');
  if (refine.includes('less-sweet')) s += sweet ? -3 : 1;
  if (refine.includes('sweeter') && sweet) s += 3;
  if (refine.includes('stronger')) s += c.flavour.includes('bold') ? 3 : -1;
  if (refine.includes('creamier')) s += c.flavour.includes('creamy') ? 3 : -1;
  return s;
}

const SAY = {
  temp: { hot: 'hot', iced: 'iced', frozen: 'frozen' },
  base: { chocolate: 'chocolatey', fruity: 'fruity', nocaf: 'caffeine-free' },
  caffeine: { yes: 'caffeinated', no: 'caffeine-free' },
  flavour: { sweet: 'sweet', creamy: 'creamy', bold: 'bold', spiced: 'spiced', fruity: 'fruity' },
};

const joinAnd = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** The one friendly line, built ONLY from boxes the visitor ticked that this
    drink definitely ticks too. */
export function matchLine(item, answers = {}, refine = []) {
  const c = classifyDrink(item);
  const a = effective(answers, refine);
  const words = [];
  const add = (w) => { if (w && !words.includes(w)) words.push(w); };
  for (const k of ['temp', 'base', 'caffeine', 'flavour']) {
    if (a[k] != null && a[k] !== ANY && ticks(c, k, a[k]) === true) add(SAY[k][a[k]]);
  }
  if (refine.includes('less-sweet') && !c.flavour.includes('sweet')) add('not too sweet');
  if (refine.includes('stronger') && c.flavour.includes('bold')) add('bold');
  if (refine.includes('creamier') && c.flavour.includes('creamy')) add('creamy');
  if (refine.includes('sweeter') && c.flavour.includes('sweet')) add('sweet');
  let noun = ['coffee', 'tea'].includes(a.base) && c.base.includes(a.base) ? a.base : '';
  // "Iced tea" would read as a different drink — say "tea-based" instead
  if (noun === 'tea' && words.length <= 1) { add('tea-based'); noun = ''; }
  let lead = [joinAnd(words), noun].filter(Boolean).join(' ');
  if (a.milk && a.milk !== ANY && c.milk === a.milk) lead = lead ? `${lead}, ${a.milk === 'yes' ? 'with milk' : 'no milk'}` : (a.milk === 'yes' ? 'with milk' : 'no milk');
  if (!lead) return `Then I’d go with our ${item.name}.`;
  return `${cap(lead)} — that’s our ${item.name}.`;
}

/** Best available drink for the answers, plus two runner-ups.
    Returns { item, runners: [item, item], exact, line, misses } or null.
    `exact` = it ticks every box answered; `misses` names (honestly) any it
    doesn't, or can't promise. `not` = names to step aside ("More like this"). */
export function matchDrink(menu, answers = {}, { refine = [], not = [], rand = Math.random } = {}) {
  let pool = scoredPool(menu);
  if (!pool.length) return null;
  const aside = new Set(not);
  if (pool.some(({ item }) => !aside.has(item.name))) pool = pool.filter(({ item }) => !aside.has(item.name));
  const ranked = pool
    .map((p) => ({ ...p, score: scoreDrink(p.c, answers, refine), tie: rand() }))
    .sort((x, y) => y.score - x.score || x.tie - y.tie);
  const seen = new Set();
  const distinct = ranked.filter(({ item }) => !seen.has(item.name) && seen.add(item.name));
  const [top, ...rest] = distinct;
  const a = effective(answers, refine);
  const misses = [];
  for (const q of QUIZ) {
    const want = a[q.id];
    if (want == null || want === ANY) continue;
    const t = ticks(top.c, q.id, want);
    const label = q.options.find((o) => o.value === want)?.label.toLowerCase() || want;
    if (t === null) misses.push(q.id === 'caffeine' ? 'I can’t promise on the caffeine' : 'I can’t promise on the milk');
    else if (!t) misses.push(`it isn’t ${label}`);
  }
  return {
    item: top.item,
    runners: rest.slice(0, 2).map((r) => r.item),
    exact: misses.length === 0,
    line: matchLine(top.item, answers, refine),
    misses,
  };
}

/** Refinements worth offering on a result: only those that would really
    change it — "Less sweet" on a sweet drink when a not-sweet one fits,
    "Stronger" on one that isn't bold when a bold one fits, and so on. */
const HAS = {
  'less-sweet': (c) => !c.flavour.includes('sweet'),
  sweeter: (c) => c.flavour.includes('sweet'),
  stronger: (c) => c.flavour.includes('bold'),
  creamier: (c) => c.flavour.includes('creamy'),
};
export function refineOptions(menu, answers, { refine = [], not = [], current } = {}) {
  if (!current) return [];
  const cur = classifyDrink(current);
  return REFINES.filter((r) => {
    if (r.id === 'more') return drinkCandidates(menu).some((d) => d.name !== current.name && !not.includes(d.name));
    if (refine.includes(r.id) || HAS[r.id](cur)) return false;
    if ((r.id === 'sweeter' && refine.includes('less-sweet')) || (r.id === 'less-sweet' && refine.includes('sweeter'))) return false;
    const next = matchDrink(menu, answers, { refine: [...refine, r.id], not, rand: () => 0.5 });
    return Boolean(next) && next.item.name !== current.name && HAS[r.id](classifyDrink(next.item));
  });
}
