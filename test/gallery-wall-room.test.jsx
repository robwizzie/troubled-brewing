import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, within, fireEvent } from '@testing-library/react';
import GalleryWallRoom from '../src/components/sections/GalleryWallRoom.jsx';
import { WALL_ART, WALL_FOCUS, viewFor, mergeWallArt } from '../src/lib/galleryWall.js';

/* The room is a photograph with nineteen boxes measured over it, and the whole
   interaction is one transform. Two things are worth pinning down:

     the math   viewFor() IS the pan and the zoom, and it works in percentages
                of the photograph rather than measured pixels — which is what
                makes it testable at all, since jsdom has no layout.

     the wiring what a visitor actually gets: every piece reachable, the right
                card for the one they picked, and a way back out. */

/* The page reads the owner's catalogue through the data layer; these tests
   drive that directly rather than through Supabase-or-seed. */
let pieces = [];
vi.mock('../src/lib/dataService.js', () => ({
  getGalleryPieces: () => Promise.resolve(pieces),
}));

const spots = () => screen.getAllByRole('button', { name: /^Look closer at/ });
const spot = (title) => screen.getByRole('button', { name: `Look closer at ${title}` });

beforeEach(() => { pieces = []; });
afterEach(cleanup);

describe('the wall, as data', () => {
  it('gives every piece a box that lands inside the photograph', () => {
    WALL_ART.forEach((a) => {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.y).toBeGreaterThanOrEqual(0);
      expect(a.x + a.w).toBeLessThanOrEqual(100);
      // the wall ends where the counter begins; nothing should hang below it
      expect(a.y + a.h).toBeLessThanOrEqual(WALL_FOCUS.y + WALL_FOCUS.h);
    });
  });

  it('keeps every id unique — an id is what an owner pins a piece to', () => {
    const ids = WALL_ART.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('brings a chosen piece to the point in the stage the fit asks for', () => {
    const fit = { cx: 0.27, cy: 0.5, w: 0.46, h: 0.74 };
    const piece = WALL_ART.find((a) => a.id === 'town-hall');
    const v = viewFor(piece, fit);

    // it never exceeds the share of the stage it was given
    expect(v.scale * piece.w).toBeLessThanOrEqual(100 * fit.w + 0.001);
    expect(v.scale * piece.h).toBeLessThanOrEqual(WALL_FOCUS.h * fit.h + 0.001);

    // and its centre lands on the requested spot, horizontally at least —
    // vertically the pan is held inside the photograph
    const cx = piece.x + piece.w / 2;
    expect(v.x + v.scale * cx).toBeCloseTo(100 * fit.cx, 5);
  });

  it('never pans off the top or bottom of the photograph', () => {
    const fit = { cx: 0.27, cy: 0.5, w: 0.46, h: 0.74 };
    WALL_ART.forEach((a) => {
      const v = viewFor(a, fit);
      expect(v.y).toBeLessThanOrEqual(0);                                      // no bare stage above
      expect(v.y + 100 * v.scale).toBeGreaterThanOrEqual(WALL_FOCUS.h - 0.001); // none below
    });
  });

  it('lets a catalogued piece claim a frame and leaves the rest describing themselves', () => {
    const merged = mergeWallArt([
      { id: 'p1', title: 'Ducks at Sea', artist: 'A. Painter', story: 'Bought at auction.', wall_spot: 'ducks' },
      { id: 'p2', title: 'Unpinned', wall_spot: '' },
    ]);
    const ducks = merged.find((a) => a.id === 'ducks');
    expect(ducks.linked).toBe(true);
    expect(ducks.title).toBe('Ducks at Sea');
    expect(ducks.artist).toBe('A. Painter');
    expect(merged.filter((a) => a.linked)).toHaveLength(1);
    // the built-in description survives on an unclaimed frame
    expect(merged.find((a) => a.id === 'hare').blurb).toMatch(/gilded hare/i);
  });

  it('survives a collection that hasn’t loaded, or has nothing in it', () => {
    expect(mergeWallArt(null)).toHaveLength(WALL_ART.length);
    expect(mergeWallArt([]).every((a) => a.linked === false)).toBe(true);
  });
});

describe('the room', () => {
  it('hangs one hotspot per piece, every one of them named', async () => {
    render(<GalleryWallRoom data={{}} />);
    await waitFor(() => expect(spots()).toHaveLength(WALL_ART.length));
    WALL_ART.forEach((a) => expect(spot(a.title)).toBeTruthy());
  });

  it('opens the piece that was chosen, and closes back to the wall', async () => {
    render(<GalleryWallRoom data={{}} />);
    await waitFor(() => expect(spots()).toHaveLength(WALL_ART.length));

    fireEvent.click(spot('The Pumpkin House'));

    const card = await screen.findByRole('complementary');
    expect(within(card).getByRole('heading', { name: 'The Pumpkin House' })).toBeTruthy();
    expect(within(card).getByText(/front door/i)).toBeTruthy();
    // no owner story yet: the card says so rather than inventing one
    expect(within(card).getByText(/isn’t written down yet/i)).toBeTruthy();

    fireEvent.click(within(card).getByRole('button', { name: 'Back to the wall' }));
    expect(screen.queryByRole('complementary')).toBeNull();
  });

  it('walks the wall with the arrows, with no dead end at either end', async () => {
    render(<GalleryWallRoom data={{}} />);
    await waitFor(() => expect(spots()).toHaveLength(WALL_ART.length));

    fireEvent.click(spot(WALL_ART[0].title));
    const card = await screen.findByRole('complementary');

    fireEvent.click(within(card).getByRole('button', { name: 'Next piece' }));
    expect(screen.getByRole('heading', { name: WALL_ART[1].title })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Previous piece' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous piece' }));
    expect(screen.getByRole('heading', { name: WALL_ART[WALL_ART.length - 1].title })).toBeTruthy();
  });

  it('shows the owner’s credits and story on a frame they have claimed', async () => {
    pieces = [{
      id: 'p1', title: 'Regatta', artist: 'Andi', artist_url: 'https://example.com',
      medium: 'Oil on canvas', year_label: '1974', story: 'A wedding present.',
      for_sale: true, wall_spot: 'ducks',
    }];
    render(<GalleryWallRoom data={{}} />);

    await waitFor(() => expect(spot('Regatta')).toBeTruthy());
    fireEvent.click(spot('Regatta'));

    const card = await screen.findByRole('complementary');
    expect(within(card).getByRole('link', { name: 'Andi' }).getAttribute('href')).toBe('https://example.com');
    expect(within(card).getByText(/Oil on canvas · 1974/)).toBeTruthy();
    expect(within(card).getByText('A wedding present.')).toBeTruthy();
    expect(within(card).getByText(/for sale/i)).toBeTruthy();
    expect(within(card).queryByText(/isn’t written down yet/i)).toBeNull();
  });

  it('takes its heading, intro and nudge from the section data', async () => {
    render(<GalleryWallRoom data={{ heading: 'Our wall', intro: 'Nineteen of them.', hint: 'Go on' }} />);
    await waitFor(() => expect(spots()).toHaveLength(WALL_ART.length));
    expect(screen.getByRole('heading', { name: 'Our wall' })).toBeTruthy();
    expect(screen.getByText('Nineteen of them.')).toBeTruthy();
    expect(screen.getByText('Go on')).toBeTruthy();
  });
});
