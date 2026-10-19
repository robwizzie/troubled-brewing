import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor, within, fireEvent } from '@testing-library/react';
import GalleryWallRoom from '../src/components/sections/GalleryWallRoom.jsx';
import {
  WALL_ART, WALL_FOCUS, viewFor, mergeWallArt, spatialOrder, stepIndex, pieceAt,
  readPieceParam, withPieceParam, toFocusBox, fromFocusPoint, visibleBox, REST_VIEW,
} from '../src/lib/galleryWall.js';

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

const WALK = spatialOrder(WALL_ART);
const panel = () => screen.getByRole('complementary');

beforeEach(() => {
  pieces = [];
  window.localStorage.clear();
  window.history.replaceState(null, '', '/gallery-wall');
});
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

describe('walking the wall', () => {
  const centre = (a) => ({ x: a.x + a.w / 2, y: a.y + a.h / 2 });

  it('visits every piece exactly once', () => {
    expect(WALK).toHaveLength(WALL_ART.length);
    expect(new Set(WALK.map((a) => a.id)).size).toBe(WALL_ART.length);
  });

  it('starts top-left, finishes bottom-right, and goes column by column', () => {
    expect(WALK.map((a) => a.id)).toEqual([
      'ducks', 'oval-landscape', 'botanical', 'bicycle-fox',
      'snow-chain', 'fox-head', 'pumpkin', 'cold-out',
      'balloon-fox', 'the-company', 'silhouette',
      'butterflies', 'hare', 'town-hall',
      'lady-in-red', 'grey-room', 'daisies', 'early-bird', 'the-cup',
    ]);
  });

  it('only ever steps to a neighbour — never across half the wall', () => {
    for (let i = 1; i < WALK.length; i += 1) {
      const a = centre(WALK[i - 1]);
      const b = centre(WALK[i]);
      expect(Math.abs(b.x - a.x)).toBeLessThan(50);
      expect(Math.abs(b.y - a.y)).toBeLessThan(WALL_FOCUS.h / 2);
    }
  });

  it('is the same walk whatever order the pieces arrive in', () => {
    const ids = WALK.map((a) => a.id);
    expect(spatialOrder([...WALL_ART].reverse()).map((a) => a.id)).toEqual(ids);
    expect(spatialOrder(mergeWallArt([])).map((a) => a.id)).toEqual(ids);
    expect(spatialOrder(null)).toEqual([]);
  });

  it('wraps round from the last piece to the first, and back', () => {
    expect(stepIndex(0, 1, 19)).toBe(1);
    expect(stepIndex(18, 1, 19)).toBe(0);
    expect(stepIndex(0, -1, 19)).toBe(18);
    expect(stepIndex(5, -1, 19)).toBe(4);
  });

  it('stops at either end when asked not to wrap', () => {
    expect(stepIndex(18, 1, 19, false)).toBe(18);
    expect(stepIndex(0, -1, 19, false)).toBe(0);
    expect(stepIndex(7, 1, 19, false)).toBe(8);
  });

  it('steps onto the wall from nowhere, and does nothing on an empty wall', () => {
    expect(stepIndex(-1, 1, 19)).toBe(0);
    expect(stepIndex(-1, -1, 19)).toBe(18);
    expect(stepIndex(0, 1, 0)).toBe(-1);
  });

  it('finds the piece under a point, preferring the smaller of two overlapping frames', () => {
    const hare = WALL_ART.find((a) => a.id === 'hare');
    expect(pieceAt(WALL_ART, hare.x + hare.w / 2, hare.y + hare.h / 2).id).toBe('hare');
    // bare wall in the top-left corner: the nearest frame wins
    expect(pieceAt(WALL_ART, 1, 3).id).toBe('ducks');
    expect(pieceAt([], 50, 50)).toBeNull();
  });

  it('maps between the mini-map and the photograph both ways', () => {
    const p = fromFocusPoint(50, 50);
    const back = toFocusBox({ x: p.x, y: p.y, w: 0, h: 0 });
    expect(back.x).toBeCloseTo(50, 6);
    expect(back.y).toBeCloseTo(50, 6);
    // at rest the room shows exactly the whole slice the mini-map draws
    const rest = toFocusBox(visibleBox(REST_VIEW));
    expect(rest.x).toBeCloseTo(0, 6);
    expect(rest.y).toBeCloseTo(0, 6);
    expect(rest.w).toBeCloseTo(100, 6);
    expect(rest.h).toBeCloseTo(100, 6);
  });
});

describe('deep links', () => {
  const ids = WALL_ART.map((a) => a.id);

  it('reads ?piece= only when it names a piece on the wall', () => {
    expect(readPieceParam('?piece=pumpkin', ids)).toBe('pumpkin');
    expect(readPieceParam('?x=1&piece=the-cup', ids)).toBe('the-cup');
    expect(readPieceParam('?piece=not-a-frame', ids)).toBeNull();
    expect(readPieceParam('', ids)).toBeNull();
    expect(readPieceParam(undefined, ids)).toBeNull();
  });

  it('writes ?piece= keeping the rest of the address, and removes it cleanly', () => {
    expect(withPieceParam('https://x.test/gallery-wall', 'pumpkin')).toBe('/gallery-wall?piece=pumpkin');
    expect(withPieceParam('https://x.test/gallery-wall?ref=qr#top', 'hare')).toBe('/gallery-wall?ref=qr&piece=hare#top');
    expect(withPieceParam('https://x.test/gallery-wall?piece=hare&ref=qr', null)).toBe('/gallery-wall?ref=qr');
    expect(withPieceParam('https://x.test/gallery-wall?piece=hare', null)).toBe('/gallery-wall');
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

    const card = screen.getByRole('complementary', { name: 'About The Pumpkin House' });
    const title = within(card).getByRole('heading', { name: 'The Pumpkin House' });
    expect(within(card).getByText(/front door/i)).toBeTruthy();
    // no owner story yet: the card says so rather than inventing one
    expect(within(card).getByText(/isn’t written down yet/i)).toBeTruthy();
    // focus goes to the story, not off into the other hotspots
    expect(document.activeElement).toBe(title);

    fireEvent.click(within(card).getByRole('button', { name: 'Back to the whole wall' }));
    expect(screen.queryByRole('complementary', { name: /About The Pumpkin House/ })).toBeNull();
    expect(panel().getAttribute('aria-label')).toBe('About the gallery wall');
    // and focus returns to the frame that opened it
    expect(document.activeElement).toBe(spot('The Pumpkin House'));
  });

  it('keeps the panel in the page at rest, with a way to start the walk', async () => {
    render(<GalleryWallRoom data={{}} />);
    await waitFor(() => expect(spots()).toHaveLength(WALL_ART.length));
    fireEvent.click(within(panel()).getByRole('button', { name: `Start with ${WALK[0].title}` }));
    expect(within(panel()).getByRole('heading', { name: WALK[0].title })).toBeTruthy();
    expect(within(panel()).getByText(`1 of ${WALK.length}`)).toBeTruthy();
  });

  it('walks the wall in spatial order with Prev / Next, wrapping at either end', async () => {
    render(<GalleryWallRoom data={{}} />);
    await waitFor(() => expect(spots()).toHaveLength(WALL_ART.length));

    fireEvent.click(spot(WALK[0].title));
    expect(within(panel()).getByText(`1 of ${WALK.length}`)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Next piece' }));
    expect(screen.getByRole('heading', { name: WALK[1].title })).toBeTruthy();
    expect(within(panel()).getByText(`2 of ${WALK.length}`)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Previous piece' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous piece' }));
    expect(screen.getByRole('heading', { name: WALK[WALK.length - 1].title })).toBeTruthy();
    expect(within(panel()).getByText(`${WALK.length} of ${WALK.length}`)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Next piece' }));
    expect(screen.getByRole('heading', { name: WALK[0].title })).toBeTruthy();
  });

  it('answers the arrow keys and Escape while a piece is up', async () => {
    render(<GalleryWallRoom data={{}} />);
    await waitFor(() => expect(spots()).toHaveLength(WALL_ART.length));

    fireEvent.click(spot(WALK[3].title));
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(screen.getByRole('heading', { name: WALK[4].title })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(screen.getByRole('heading', { name: WALK[2].title })).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(panel().getAttribute('aria-label')).toBe('About the gallery wall');
  });

  it('steps with a sideways swipe across the photograph, and ignores a vertical drag', async () => {
    const { container } = render(<GalleryWallRoom data={{}} />);
    await waitFor(() => expect(spots()).toHaveLength(WALL_ART.length));
    const stage = container.querySelector('.gwr__stage');

    fireEvent.click(spot(WALK[5].title));
    fireEvent.touchStart(stage, { touches: [{ clientX: 300, clientY: 200 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 180, clientY: 210 }] });
    expect(screen.getByRole('heading', { name: WALK[6].title })).toBeTruthy();

    fireEvent.touchStart(stage, { touches: [{ clientX: 100, clientY: 200 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 230, clientY: 190 }] });
    expect(screen.getByRole('heading', { name: WALK[5].title })).toBeTruthy();

    fireEvent.touchStart(stage, { touches: [{ clientX: 100, clientY: 100 }] });
    fireEvent.touchEnd(stage, { changedTouches: [{ clientX: 150, clientY: 300 }] });
    expect(screen.getByRole('heading', { name: WALK[5].title })).toBeTruthy();
  });

  it('opens a piece from the index, highlights it there, and scrolls the room into view', async () => {
    const scrollTo = vi.fn();
    const origScrollTo = window.scrollTo;
    window.scrollTo = scrollTo;
    try {
      const { container } = render(<GalleryWallRoom data={{}} />);
      await waitFor(() => expect(spots()).toHaveLength(WALL_ART.length));
      // the room is above the fold, as it is when you're down at the list
      const room = container.querySelector('.gwr__room');
      room.getBoundingClientRect = () => ({ top: -900, bottom: -300, height: 600, left: 0, right: 0, width: 0 });

      const list = screen.getByRole('list');
      const items = within(list).getAllByRole('button');
      // the index is in the same walking order as Prev / Next
      expect(items.map((b) => b.textContent)).toEqual(WALK.map((a) => a.title));

      fireEvent.click(within(list).getByRole('button', { name: 'Cold Out' }));
      expect(screen.getByRole('complementary', { name: 'About Cold Out' })).toBeTruthy();
      const link = within(list).getByRole('button', { name: 'Cold Out' });
      expect(link.getAttribute('aria-current')).toBe('true');
      expect(link.className).toMatch(/is-open/);
      expect(items.filter((b) => b.getAttribute('aria-current'))).toHaveLength(1);
      expect(scrollTo).toHaveBeenCalled();
      const idx = WALK.findIndex((a) => a.id === 'cold-out');
      expect(within(panel()).getByText(`${idx + 1} of ${WALK.length}`)).toBeTruthy();

      // stepping on moves the highlight with it
      fireEvent.click(screen.getByRole('button', { name: 'Next piece' }));
      expect(within(list).getByRole('button', { name: WALK[idx + 1].title }).getAttribute('aria-current')).toBe('true');
      expect(link.getAttribute('aria-current')).toBeNull();
    } finally {
      window.scrollTo = origScrollTo;
    }
  });

  it('jumps to the piece tapped on the mini-map', async () => {
    const { container } = render(<GalleryWallRoom data={{}} />);
    await waitFor(() => expect(spots()).toHaveLength(WALL_ART.length));
    fireEvent.click(spot('The Rubber Ducks'));

    const map = container.querySelector('.gwr-map');
    map.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 });
    const cup = toFocusBox(WALL_ART.find((a) => a.id === 'the-cup'));
    fireEvent.click(map, { clientX: cup.x + cup.w / 2, clientY: cup.y + cup.h / 2 });
    expect(screen.getByRole('complementary', { name: 'About The Cup' })).toBeTruthy();
  });

  it('opens on the piece a ?piece= link names, and keeps the address bar in step', async () => {
    window.history.replaceState(null, '', '/gallery-wall?piece=town-hall&ref=qr');
    render(<GalleryWallRoom data={{}} />);
    expect(screen.getByRole('complementary', { name: 'About The Town Hall Drawing' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Next piece' }));
    const next = WALK[WALK.findIndex((a) => a.id === 'town-hall') + 1];
    expect(window.location.search).toBe(`?piece=${next.id}&ref=qr`);

    fireEvent.click(screen.getByRole('button', { name: 'Back to the whole wall' }));
    expect(window.location.search).toBe('?ref=qr');
  });

  it('ignores a ?piece= that isn’t on the wall', () => {
    window.history.replaceState(null, '', '/gallery-wall?piece=nope');
    render(<GalleryWallRoom data={{}} />);
    expect(panel().getAttribute('aria-label')).toBe('About the gallery wall');
    expect(window.location.search).toBe('');
  });

  it('shows the "tap a frame" hint until the first piece is opened, then not again', async () => {
    const first = render(<GalleryWallRoom data={{}} />);
    await waitFor(() => expect(spots()).toHaveLength(WALL_ART.length));
    expect(screen.getByText('Tap a frame to look closer')).toBeTruthy();
    fireEvent.click(spot('Daisies'));
    fireEvent.click(screen.getByRole('button', { name: 'Back to the whole wall' }));
    expect(screen.queryByText('Tap a frame to look closer')).toBeNull();
    first.unmount();

    render(<GalleryWallRoom data={{}} />);
    await waitFor(() => expect(spots()).toHaveLength(WALL_ART.length));
    expect(screen.queryByText('Tap a frame to look closer')).toBeNull();
  });

  it('takes the hotspots out of the tab order while zoomed', async () => {
    render(<GalleryWallRoom data={{}} />);
    await waitFor(() => expect(spots()).toHaveLength(WALL_ART.length));
    expect(spots().every((b) => b.tabIndex === 0)).toBe(true);
    fireEvent.click(spot('Daisies'));
    expect(spots().every((b) => b.tabIndex === -1)).toBe(true);
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

    const card = screen.getByRole('complementary', { name: 'About Regatta' });
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
