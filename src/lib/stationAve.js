import { SITE } from './seed.js';
import { streetNumber } from './localBusinesses.js';

/* The Station Ave strip's model: which storefronts go where along the walk,
   and what each little building looks like. Kept out of the component so it
   can be tested on its own (and so fast refresh stays happy). */

/* awning colour per category, all from the house palette */
const AWNINGS = {
  restaurant: ['#b0436e', '#fbe4ec'],
  cafe: ['#545f33', '#f7f1e4'],
  retail: ['#a87c1c', '#fff6dc'],
  bakery: ['#e98fb0', '#fffdf7'],
  bar: ['#2c2722', '#e3b53f'],
  service: ['#7e8c54', '#fffdf7'],
  other: ['#3f6f78', '#eef3ef'],
};
export const awningFor = (c) => AWNINGS[c] || AWNINGS.other;

/* facade looks: a brick, some painted plaster, some clapboard — chosen from a
   hash of the name so a business always gets the same building */
const FACADES = [
  { wall: '#a65f47', trim: '#efe3c8', sign: '#2c2722', ink: '#f2d27f', roof: '#3a2620', tex: 'brick' },
  { wall: '#e8d9b8', trim: '#545f33', sign: '#545f33', ink: '#fffdf7', roof: '#545f33', tex: 'plaster' },
  { wall: '#a9b48a', trim: '#f7f1e4', sign: '#2c2722', ink: '#f7e8bf', roof: '#3f4826', tex: 'clapboard' },
  { wall: '#e0b4b6', trim: '#fffdf7', sign: '#6b2f45', ink: '#fbe4ec', roof: '#6b2f45', tex: 'plaster' },
  { wall: '#8f9ba0', trim: '#f7f1e4', sign: '#f7f1e4', ink: '#2c2722', roof: '#3b474d', tex: 'clapboard' },
  { wall: '#d4ad57', trim: '#2c2722', sign: '#2c2722', ink: '#f7e8bf', roof: '#2c2722', tex: 'plaster' },
];
const ROOFS = ['flat', 'parapet', 'gable', 'stepped'];

function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/* Build the walk: Station Ave rows in number order with our door at 514, a
   cross-street at each new hundred block, a lamp post every few doors, then
   anything not on Station Ave (or with no address) under "Around town". */
export function buildWalk(ordered, { showUs = true, ourNumber = streetNumber(SITE.address) } = {}) {
  const onAve = [];
  const elsewhere = [];
  for (const b of ordered) {
    const n = streetNumber(b.address);
    if (n != null && /station/i.test(b.address)) onAve.push({ b, n });
    else elsewhere.push({ b, n });
  }
  const shops = onAve.map(({ b, n }) => ({ kind: 'shop', id: String(b.id), b, n }));
  if (showUs && ourNumber != null) {
    const at = shops.filter((s) => s.n < ourNumber).length;
    shops.splice(at, 0, { kind: 'us', id: 'us', n: ourNumber });
  }

  const stops = [{ kind: 'sign', id: 'sign-start', block: shops[0] ? Math.floor(shops[0].n / 100) * 100 : null }];
  let sinceLamp = 0;
  shops.forEach((s, i) => {
    const prev = shops[i - 1];
    if (prev && Math.floor(prev.n / 100) !== Math.floor(s.n / 100)) {
      stops.push({ kind: 'cross', id: `cross-${s.n}`, block: Math.floor(s.n / 100) * 100 });
      sinceLamp = 0;
    } else if (sinceLamp >= 3) {
      stops.push({ kind: 'lamp', id: `lamp-${i}` });
      sinceLamp = 0;
    }
    stops.push(s);
    sinceLamp += 1;
  });
  if (elsewhere.length) {
    stops.push({ kind: 'cross', id: 'cross-around', block: null });
    elsewhere.forEach(({ b, n }) => stops.push({ kind: 'shop', id: String(b.id), b, n }));
  }
  stops.push({ kind: 'end', id: 'end' });

  /* give each storefront its building, never the same wall colour, roofline
     or height as the one next door */
  // (our own door counts as a parapet roof, middle height; and a shop either
  // side of it also avoids the shop on the far side, so the pair doesn't match)
  const recent = [];
  for (const s of stops) {
    if (s.kind === 'us') recent.unshift({ look: -1, roof: 1, tall: 1 });
    if (s.kind !== 'shop') continue;
    const near = recent.slice(0, 2);
    const pick = (salt, n, key) => {
      let v = hash(`${s.b.name}|${salt}`) % n;
      for (let tries = 0; tries < n && near.some((r) => r[key] === v); tries += 1) v = (v + 1) % n;
      return v;
    };
    const idx = { look: pick('look', FACADES.length, 'look'), roof: pick('roof', ROOFS.length, 'roof'), tall: pick('tall', 3, 'tall') };
    s.building = { look: FACADES[idx.look], roof: ROOFS[idx.roof], tall: idx.tall };
    recent.unshift(idx);
  }
  return stops;
}
