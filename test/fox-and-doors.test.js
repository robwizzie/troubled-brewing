import { describe, it, expect } from 'vitest';
import { specialDay, QUIPS } from '../src/lib/foxDays.js';
import { doorFor, FRAME_DOORS } from '../src/lib/framePortal.js';
import { WALL_ART } from '../src/lib/galleryWall.js';

describe('the fox’s calendar', () => {
  it('knows the birthday and counts the years from 2017', () => {
    expect(specialDay(new Date(2026, 9, 13)).text).toMatch(/9th birthday/);
    expect(specialDay(new Date(2031, 9, 13)).text).toMatch(/14th birthday/);
    expect(specialDay(new Date(2041, 9, 13)).text).toMatch(/24th birthday/);
  });

  it('spots every Friday the 13th, and only Fridays', () => {
    expect(specialDay(new Date(2027, 7, 13)).id).toBe('fri13'); // Fri 13 Aug 2027
    expect(specialDay(new Date(2026, 10, 13)).id).toBe('fri13'); // Fri 13 Nov 2026
    expect(specialDay(new Date(2026, 0, 13))).toBeNull(); // Tue 13 Jan 2026
  });

  it('stays quiet on an ordinary day', () => {
    expect(specialDay(new Date(2026, 4, 6))).toBeNull();
  });
});

describe('what the fox says', () => {
  // every line the fox can say, everyday and special-day alike
  const lines = () => [
    ...QUIPS,
    ...[[10, 13], [10, 31], [12, 25], [1, 1], [2, 14]].map(([m, d]) => specialDay(new Date(2026, m - 1, d)).text),
  ];

  it('has a good handful of everyday lines', () => {
    expect(QUIPS.length).toBeGreaterThan(5);
    QUIPS.forEach((q) => expect(typeof q === 'string' && q.length > 10).toBe(true));
  });

  it('never claims the top-hat fox wears glasses (that is the gold fox-head on the wall)', () => {
    lines().forEach((l) => expect(l).not.toMatch(/glasses|spectacles|specs\b|monocle/i));
  });

  it('names only menu items that are actually available', async () => {
    const { items } = (await import('../src/data/spoton-menu.json')).default;
    const available = new Set(items.filter((i) => i.available !== false).map((i) => i.name));
    ['Pup Cup!', 'Dark Chocolate Brownie (GF)', 'Cranberry Walnut Chicken Salad', 'Bagel/Breakfast Sandwich', 'No Bread Breakfast Sandwich']
      .forEach((n) => expect(available.has(n)).toBe(true));
    expect(QUIPS.some((q) => /Pup Cup/.test(q))).toBe(true);
    expect(items.find((i) => i.name === 'Cappuccino').description).toMatch(/La Colombe/);
  });

  it('gives the real address and opening day', () => {
    expect(QUIPS.join(' ')).toMatch(/514 Station Ave/);
    expect(QUIPS.join(' ')).toMatch(/Friday the 13th of October, 2017/);
  });
});

describe('frames are doors', () => {
  it('every door names a real piece on the wall', () => {
    const ids = new Set(WALL_ART.map((a) => a.id));
    Object.keys(FRAME_DOORS).forEach((id) => expect(ids.has(id)).toBe(true));
  });

  it('a piece without its own door opens onto the Gallery Wall', () => {
    expect(doorFor('daisies').to).toBe('/gallery-wall');
    expect(doorFor('ducks').to).toBe('/menu');
  });
});
