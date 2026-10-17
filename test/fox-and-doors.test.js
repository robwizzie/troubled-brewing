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
    expect(QUIPS.length).toBeGreaterThan(2);
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
