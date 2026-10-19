import { SITE } from './seed.js';
import { streetNumber } from './localBusinesses.js';

/* The Station Ave strip's model: which storefronts go where along the walk,
   and what each little building looks like. Kept out of the component so it
   can be tested on its own (and so fast refresh stays happy).

   Station Ave has even numbers on one side and odd on the other, so the walk
   is two rows that share columns: our own side (even — 514 is ours) along
   the top, the far side of the road underneath it. Each column is one slice
   of the block, so a shop across the road sits under the door it faces. */

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

/* Our two next-door neighbours, drawn loosely after the real buildings
   (Street View, 2026): Anthony's is a tan stucco two-storey with a brown tiled
   awning and orange patio umbrellas; Lula's is a low, beige-sided front with a
   plain white "Lula's" sign and no awning. Everyone else gets a hashed look. */
const KNOWN = [
  {
    test: /^anthony/i,
    building: {
      look: { wall: '#d8bd8c', trim: '#5b3b27', sign: '#3d2a1c', ink: '#f3e2b8', roof: '#6b3a24', tex: 'plaster' },
      roof: 'flat', tall: 2, awning: 'tile', umbrellas: true, sign: 'Anthony’s',
    },
  },
  {
    test: /^lula/i,
    building: {
      look: { wall: '#ddd0b4', trim: '#2c2722', sign: '#fffdf7', ink: '#2c2722', roof: '#8a7d66', tex: 'clapboard' },
      roof: 'flat', tall: 0, awning: 'none', sign: 'Lula’s',
    },
  },
];

function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

const parity = (n) => (n == null ? null : n % 2 === 0 ? 'even' : 'odd');
const blockOf = (n) => Math.floor(n / 100) * 100;

/* Build the walk. Returns a flat list of stops in walking order (column by
   column, our side before the far side), each with:
     col  – 1-based column (shared by both sides of the road)
     side – 'main' (our side, top row) or 'across' (the far side)
   Kinds: 'sign' (start), 'cross' (a cross street at each new hundred block,
   or the "Around town" break), 'lamp', 'alley', 'tree', 'shop', 'us',
   'filler' (an unnamed building on the far side, so it reads as a street),
   'end'. Rows that aren't on Station Ave go under "Around town" at the end.
   `walk.cols` is the column count and `walk.across` whether the far side has
   anyone on it (if not, the far-side row isn't drawn at all). */
export function buildWalk(ordered, { showUs = true, ourNumber = streetNumber(SITE.address) } = {}) {
  const ourSide = parity(ourNumber) || 'even';
  const onAve = [];
  const elsewhere = [];
  for (const b of ordered) {
    const n = streetNumber(b.address);
    const shop = { kind: 'shop', id: String(b.id), b, n };
    if (n != null && /station/i.test(b.address || '')) onAve.push(shop);
    else elsewhere.push(shop);
  }
  if (showUs && ourNumber != null) onAve.push({ kind: 'us', id: 'us', n: ourNumber });
  onAve.sort((a, b) => a.n - b.n);
  const hasAcross = onAve.some((s) => parity(s.n) !== ourSide);

  /* columns: { main, across } door pairs, or a decoration */
  const cols = [];
  const blocks = [...new Set(onAve.map((s) => blockOf(s.n)))];
  cols.push({ decor: { kind: 'sign', id: 'sign-start', block: blocks[0] ?? null } });
  blocks.forEach((block, bi) => {
    if (bi > 0) cols.push({ decor: { kind: 'cross', id: `cross-${block}`, block } });
    const inBlock = onAve.filter((s) => blockOf(s.n) === block);
    const row = inBlock.filter((s) => parity(s.n) === ourSide).map((s) => ({ main: s, n: s.n }));
    // each far-side shop goes under the nearest door on our side it can face,
    // never out of order with the far-side shop before it
    let lastAcross = -1;
    for (const a of inBlock.filter((s) => parity(s.n) !== ourSide)) {
      let best = -1;
      row.forEach((c, i) => {
        if (i <= lastAcross || !c.main || c.across) return;
        if (best < 0 || Math.abs(c.n - a.n) < Math.abs(row[best].n - a.n)) best = i;
      });
      if (best < 0) {
        let at = row.findIndex((c, i) => i > lastAcross && c.n > a.n);
        if (at < 0) at = row.length;
        row.splice(at, 0, { across: a, n: a.n });
        best = at;
      } else row[best].across = a;
      lastAcross = best;
    }
    let sinceLamp = 0;
    row.forEach((c, i) => {
      const prev = row[i - 1];
      if (c.main?.kind === 'us' && prev?.main) {
        // the real passage between 512 and our door
        cols.push({ decor: { kind: 'alley', id: 'alley-us', name: 'John Johnson Way' } });
        sinceLamp = 0;
      } else if (sinceLamp >= 3 && prev?.main?.kind !== 'us') {
        cols.push({ decor: { kind: 'lamp', id: `lamp-${c.n}` }, both: true });
        sinceLamp = 0;
      }
      cols.push(c);
      sinceLamp += 1;
      // the big street tree just past our door
      if (c.main?.kind === 'us') {
        cols.push({ decor: { kind: 'tree', id: 'tree-us' } });
        sinceLamp = 0;
      }
    });
  });
  if (elsewhere.length) {
    cols.push({ decor: { kind: 'cross', id: 'cross-around', block: null } });
    elsewhere.forEach((s) => cols.push({ main: s }));
  }
  cols.push({ decor: { kind: 'end', id: 'end' } });

  const stops = [];
  cols.forEach((c, i) => {
    const col = i + 1;
    if (c.decor) {
      stops.push({ ...c.decor, col, side: 'main' });
      if (hasAcross && c.both) stops.push({ ...c.decor, id: `${c.decor.id}-across`, col, side: 'across' });
      return;
    }
    if (c.main) stops.push({ ...c.main, col, side: 'main' });
    else if (hasAcross) stops.push({ kind: 'filler', id: `filler-m-${col}`, col, side: 'main', seed: col });
    if (c.across) stops.push({ ...c.across, col, side: 'across' });
    else if (hasAcross) stops.push({ kind: 'filler', id: `filler-a-${col}`, col, side: 'across', seed: col });
  });

  /* give each storefront its building, never the same wall colour, roofline
     or height as the one next door on the same side */
  // (our own door counts as a brick three-storey; and a shop either side of it
  // also avoids the shop on the far side, so the pair doesn't match)
  const recent = { main: [], across: [] };
  for (const s of stops) {
    const mem = recent[s.side];
    if (s.kind === 'us') mem.unshift({ look: 0, roof: 0, tall: 2 });
    if (s.kind !== 'shop') continue;
    const known = KNOWN.find((k) => k.test.test(s.b.name));
    if (known) {
      s.building = { ...known.building };
      mem.unshift({ look: -1, roof: ROOFS.indexOf(known.building.roof), tall: known.building.tall });
      continue;
    }
    const near = mem.slice(0, 2);
    const pick = (salt, n, key) => {
      let v = hash(`${s.b.name}|${salt}`) % n;
      for (let tries = 0; tries < n && near.some((r) => r[key] === v); tries += 1) v = (v + 1) % n;
      return v;
    };
    const idx = { look: pick('look', FACADES.length, 'look'), roof: pick('roof', ROOFS.length, 'roof'), tall: pick('tall', 3, 'tall') };
    s.building = { look: FACADES[idx.look], roof: ROOFS[idx.roof], tall: idx.tall, awning: 'stripe' };
    mem.unshift(idx);
  }
  stops.cols = cols.length;
  stops.across = hasAcross;
  return stops;
}
