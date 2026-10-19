import { useEffect, useState } from 'react';
import { getContentBlock } from './dataService.js';
import { getMenu } from './menuService.js';
import { useDataVersion } from './dataVersion.js';
import SPOTON_MENU from '../data/spoton-menu.json';

/* =============================================================================
   "Goes great with" — a drink paired with a real bakery / food item.

   The pairings are the STAFF'S opinion, never ours: they live in ONE
   content_blocks row the owner writes from the admin ("Pair a drink with a
   treat"), created by the first Publish (useBlockDraft upserts it):

     content_blocks.pairings = {
       enabled: true,
       pairs: [ { drink: 'Iced Chai Latte', with: 'Muffin',
                  note?: 'The spice wakes up the blueberry', by?: 'Cat' } ],
     }

   There is NO seed default, so until the owner has published at least one
   pairing the public site shows nothing at all.

   Every pairing is checked against the live menu each time it's read: if
   either side has left the menu (or been switched off in SpotOn) that pairing
   is quietly hidden — never a link to something the shop can't sell. Names
   match case-insensitively, so "iced chai latte" still finds the drink after
   a SpotOn capitalisation change.
   ============================================================================= */

export const PAIRINGS_KEY = 'pairings';
export const EMPTY_PAIRINGS = { pairs: [], enabled: false };
export const NOTE_MAX = 80;
export const BY_MAX = 24;

const norm = (s) => String(s ?? '').trim().toLowerCase();
const clean = (s, max) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

/* ---- What counts as a drink, what counts as a treat ----------------------- */
const DRINK_CATEGORIES = new Set(['espresso', 'specialty', 'seasonal']);
/* Grab n Go is mostly bottled drinks and snacks; Retail is beans and mugs */
const NOT_TREATS = new Set(['grab n go', 'retail']);
const SPOTON_CAT = new Map(
  (SPOTON_MENU?.items || []).filter((i) => i?.spoton_category).map((i) => [norm(i.name), i.spoton_category])
);
/** The item's SpotOn section (the live DB may not carry it — the bundled
    snapshot knows it by name). */
export const spotonCategoryOf = (item) => item?.spoton_category || SPOTON_CAT.get(norm(item?.name)) || '';

export const isDrink = (item) => Boolean(item) && DRINK_CATEGORIES.has(item.category);
export const isTreat = (item) =>
  Boolean(item) && (item.category === 'pastry' || item.category === 'food') && !NOT_TREATS.has(norm(spotonCategoryOf(item)));

/* ---- Reading (public site) ------------------------------------------------ */

/**
 * The pairings to show, resolved against the menu (pure — easy to test).
 *
 * @param {object}   block  the pairings content block (or nothing)
 * @param {object[]} menu   the AVAILABLE menu (getMenu())
 * @returns {{drink:object, with:object, note:string, by:string}[]}
 *          menu rows for both sides; [] when switched off, empty, or nothing
 *          on it is still on the menu
 */
export function resolvePairings(block, menu) {
  if (!block || block.enabled !== true || !Array.isArray(block.pairs) || !block.pairs.length) return [];
  const byName = new Map();
  for (const m of menu || []) {
    if (m && m.name && m.available !== false && !byName.has(norm(m.name))) byName.set(norm(m.name), m);
  }
  const out = [];
  const seen = new Set();
  for (const p of block.pairs) {
    const drink = byName.get(norm(p?.drink));
    const treat = byName.get(norm(p?.with));
    if (!drink || !treat || drink === treat) continue; // gone from the menu → hidden, quietly
    const key = `${norm(drink.name)}|${norm(treat.name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ drink, with: treat, note: clean(p.note, NOTE_MAX), by: clean(p.by, BY_MAX) });
  }
  return out;
}

/** Every pairing for a drink, by name (case-insensitive), in the owner's order. */
export function pairingsFor(name, pairings) {
  const n = norm(name);
  if (!n) return [];
  return (pairings || []).filter((p) => norm(p.drink?.name) === n);
}

/**
 * The pairing for one drink, or null — the helper the fox (quiz result,
 * Surprise pick) uses:
 *
 *   const pairings = usePairings();
 *   const p = pairingFor(item.name, pairings);
 *   p && <p>Goes great with <a href={orderUrlFor(p.with)}>{p.with.name}</a></p>
 */
export function pairingFor(name, pairings) {
  return pairingsFor(name, pairings)[0] || null;
}

/** "Goes great with Muffin" — the one-line wording, kept in one place. */
export const pairingLine = (p) => (p?.with?.name ? `Goes great with ${p.with.name}` : '');

/** The published block (or {} when there isn't one), re-read after an admin publish. */
export function usePairingsBlock() {
  const [block, setBlock] = useState(null);
  const version = useDataVersion('content_blocks');
  useEffect(() => {
    let alive = true;
    getContentBlock(PAIRINGS_KEY).then((b) => alive && setBlock(b || {}), () => alive && setBlock({}));
    return () => { alive = false; };
  }, [version]);
  return block;
}

/** The live, resolved pairings ([] while loading or when there are none). */
export function usePairings() {
  const block = usePairingsBlock();
  const [menu, setMenu] = useState(null);
  const menuVersion = useDataVersion('menu_items');
  useEffect(() => {
    let alive = true;
    getMenu().then((m) => alive && setMenu(m), () => alive && setMenu([]));
    return () => { alive = false; };
  }, [menuVersion]);
  return block && menu ? resolvePairings(block, menu) : [];
}

/* ---- Editing (admin) — pure, so the screen is just wiring ----------------- */

const samePair = (a, b) => norm(a.drink) === norm(b.drink) && norm(a.with) === norm(b.with);

/** Add a pairing to the end. Returns the same array when it's incomplete or
    already there (so the caller can tell nothing happened). */
export function addPair(pairs, pair) {
  const list = Array.isArray(pairs) ? pairs : [];
  const next = { drink: clean(pair?.drink, 120), with: clean(pair?.with, 120) };
  if (!next.drink || !next.with || norm(next.drink) === norm(next.with)) return list;
  if (list.some((p) => samePair(p, next))) return list;
  const note = clean(pair?.note, NOTE_MAX);
  const by = clean(pair?.by, BY_MAX);
  if (note) next.note = note;
  if (by) next.by = by;
  return [...list, next];
}

export function removePair(pairs, index) {
  return (pairs || []).filter((_, i) => i !== index);
}

/** Move one pairing up (-1) or down (+1); out-of-range moves change nothing. */
export function movePair(pairs, index, dir) {
  const list = [...(pairs || [])];
  const to = index + dir;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return pairs || [];
  [list[index], list[to]] = [list[to], list[index]];
  return list;
}

/** Saved pairs whose drink or treat is no longer on the (available) menu. */
export function missingFromMenu(pairs, menu) {
  const names = new Set((menu || []).filter((m) => m && m.available !== false).map((m) => norm(m.name)));
  return (pairs || []).filter((p) => !names.has(norm(p.drink)) || !names.has(norm(p.with)));
}

/* "Need ideas?" — combos to TRY, built only from the menu's categories. They
   are never written anywhere by themselves: tapping one fills the pickers,
   and the owner still has to add it and press Publish. */
const IDEA_SECTIONS = {
  'Coffee & Espresso Drinks': ['Bakery', 'Breakfast'],
  'Iced Coffee & Espresso Drinks': ['Bakery', 'Gluten Free Sweeties'],
  'Tea & Other': ['Bakery', 'Gluten Free Sweeties'],
  'Iced Teas & Other': ['Lunch', 'Bakery'],
  'Frozen Drinks': ['Bakery', 'Gluten Free Sweeties'],
};

/**
 * Up to `count` drink + treat combos from the menu, skipping ones already
 * paired. `turn` rotates through them for a "Show me others" button.
 */
export function pairingIdeas(menu, existing = [], { count = 4, turn = 0 } = {}) {
  const avail = (menu || []).filter((m) => m && m.name && m.available !== false);
  const drinks = avail.filter(isDrink);
  const treats = avail.filter(isTreat);
  if (!drinks.length || !treats.length) return [];
  const bySection = new Map();
  for (const t of treats) {
    const s = spotonCategoryOf(t) || t.category;
    if (!bySection.has(s)) bySection.set(s, []);
    bySection.get(s).push(t);
  }
  const taken = new Set((existing || []).map((p) => `${norm(p.drink)}|${norm(p.with)}`));
  const pairedDrinks = new Set((existing || []).map((p) => norm(p.drink)));
  const all = [];
  drinks.forEach((d, i) => {
    if (pairedDrinks.has(norm(d.name))) return;
    const sections = IDEA_SECTIONS[spotonCategoryOf(d)] || ['Bakery', 'Breakfast'];
    const pool = sections.flatMap((s) => bySection.get(s) || []);
    const from = pool.length ? pool : treats;
    const t = from[(i * 7) % from.length];
    if (!taken.has(`${norm(d.name)}|${norm(t.name)}`)) all.push({ drink: d.name, with: t.name });
  });
  if (!all.length) return [];
  const start = ((turn * count) % all.length + all.length) % all.length;
  const out = [];
  for (let k = 0; k < Math.min(count, all.length); k += 1) out.push(all[(start + k) % all.length]);
  return out;
}
