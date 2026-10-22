import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { useState } from 'react';
import { render, screen, cleanup, fireEvent, within, waitFor } from '@testing-library/react';

/* The Gallery Wall editor: boxes as % of the photo, moved and resized by
   pointer, corner handles and arrow keys; the wall itself living in the
   Gallery Wall room section's data (so it publishes and discards with the
   page), copied in whole on the first edit so nothing on the live wall
   changes; and the public room hanging whatever that data says. */

/* jsdom has no PointerEvent, so fireEvent.pointer* would drop clientX/Y */
if (!window.PointerEvent) {
  window.PointerEvent = class PointerEvent extends MouseEvent {
    constructor(type, init = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType || 'mouse';
    }
  };
}

let pieces = [];
vi.mock('../src/lib/dataService.js', () => ({
  getGalleryPieces: () => Promise.resolve(pieces),
}));
const writes = vi.hoisted(() => []);
vi.mock('../src/lib/supabase.js', () => {
  const b = new Proxy({}, { get: (_t, k) => (k === 'then' ? undefined : () => { writes.push(k); return b; }) });
  return { isSupabaseConfigured: true, supabase: { from: () => b } };
});

const {
  WALL_ART, clampBox, normalizeWallPiece, boxCorners, rotatedBounds, pointInBox, clampTilt, viewFor, ownWallPieces, seedWallPieces, resolveWall, spatialOrder, mergeWallArt, stageRatioFor, WALL_FOCUS,
} = await import('../src/lib/galleryWall.js');
const { dragBox, nudgeBox, pxToPercent, pointInPhoto, moveItem, newPieceId, newBoxAt, snapTilt, rotateDrag, NUDGE, NUDGE_BIG } = await import('../src/admin/lib/hotspotMath.js');
const { ToastProvider } = await import('../src/admin/components/ui.jsx');
const WallEditor = (await import('../src/admin/editor/WallEditor.jsx')).default;
const GalleryWallRoom = (await import('../src/components/sections/GalleryWallRoom.jsx')).default;

beforeEach(() => { pieces = []; writes.length = 0; });
afterEach(cleanup);

describe('hotspot math', () => {
  const box = { x: 40, y: 30, w: 10, h: 8 };

  it('turns a pointer movement into % of the photo on screen', () => {
    expect(pxToPercent(50, 20, { width: 500, height: 1000 })).toEqual({ dx: 10, dy: 2 });
    expect(pointInPhoto(150, 300, { left: 100, top: 100, width: 500, height: 1000 })).toEqual({ x: 10, y: 20 });
    expect(pointInPhoto(-50, 5000, { left: 0, top: 0, width: 100, height: 100 })).toEqual({ x: 0, y: 100 });
  });

  it('moves a whole box and stops it at the photo edges without squashing it', () => {
    expect(dragBox(box, 'move', 5, -2)).toEqual({ x: 45, y: 28, w: 10, h: 8 });
    expect(dragBox(box, 'move', 80, 0)).toEqual({ x: 90, y: 30, w: 10, h: 8 });
    expect(dragBox(box, 'move', -80, -80)).toEqual({ x: 0, y: 0, w: 10, h: 8 });
  });

  it('resizes from a corner or an edge, moving only that side', () => {
    expect(dragBox(box, 'se', 2, 3)).toEqual({ x: 40, y: 30, w: 12, h: 11 });
    expect(dragBox(box, 'nw', 2, 3)).toEqual({ x: 42, y: 33, w: 8, h: 5 });
    expect(dragBox(box, 'e', -1, 50)).toEqual({ x: 40, y: 30, w: 9, h: 8 });
    expect(dragBox(box, 'n', 99, -2)).toEqual({ x: 40, y: 28, w: 10, h: 10 });
  });

  it('never flips a box inside out or lets it shrink to nothing', () => {
    const tiny = dragBox(box, 'w', 50, 0);
    expect(tiny.w).toBeGreaterThanOrEqual(1.5);
    expect(tiny.x + tiny.w).toBeCloseTo(50, 5);
    const flat = dragBox(box, 's', 0, -50);
    expect(flat.h).toBeGreaterThanOrEqual(1.5);
    expect(flat.y).toBe(30);
  });

  it('nudges with the arrow keys: small steps, big ones with Shift, resizing with Alt', () => {
    expect(nudgeBox(box, 'ArrowRight')).toEqual({ ...box, x: 40 + NUDGE });
    expect(nudgeBox(box, 'ArrowUp', { shift: true })).toEqual({ ...box, y: 30 - NUDGE_BIG });
    expect(nudgeBox(box, 'ArrowDown', { alt: true })).toEqual({ ...box, h: 8 + NUDGE });
    expect(nudgeBox(box, 'ArrowLeft', { alt: true, shift: true })).toEqual({ ...box, w: 9 });
    expect(nudgeBox(box, 'Enter')).toBeNull();
  });

  it('keeps every box on the photo and rounds to a tenth of a percent', () => {
    expect(clampBox({ x: -5, y: 98, w: 10.04, h: 4 })).toEqual({ x: 0, y: 96, w: 10, h: 4 });
    expect(newBoxAt(99, 0)).toEqual({ x: 90, y: 0, w: 10, h: 10 });
  });

  it('rotates a box about its own centre, in true (not stretched) angles', () => {
    const c = boxCorners({ x: 40, y: 40, w: 15, h: 10, r: 90 }, 1.5);
    // a 15%-wide (22.5 unit) by 10-unit box stood on end: 10 units wide, 22.5 tall
    const xs = c.map((p) => p.x * 1.5);
    const ys = c.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(10, 6);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(22.5, 6);
    // the centre never moves
    expect(xs.reduce((a, b) => a + b) / 4).toBeCloseTo(47.5 * 1.5, 6);
    expect(ys.reduce((a, b) => a + b) / 4).toBeCloseTo(45, 6);
    const b = rotatedBounds({ x: 40, y: 40, w: 15, h: 10, r: 90 }, 1.5);
    expect(b.w).toBeCloseTo(10 / 1.5, 6);
    expect(rotatedBounds({ x: 1, y: 2, w: 3, h: 4 })).toEqual({ x: 1, y: 2, w: 3, h: 4 });
  });

  it('hit-tests the tilted shape, not the level box around it', () => {
    const tilted = { x: 40, y: 40, w: 20, h: 4, r: 30 };
    const level = { ...tilted, r: 0 };
    // a corner of the level box that the tilted one has swung away from
    expect(pointInBox(level, 40.5, 40.5, 1)).toBe(true);
    expect(pointInBox(tilted, 40.5, 40.5, 1)).toBe(false);
    expect(pointInBox(tilted, 50, 42, 1)).toBe(true);
    // an oval misses its own corners
    expect(pointInBox({ x: 0, y: 0, w: 10, h: 10, shape: 'oval' }, 0.5, 0.5, 1)).toBe(false);
  });

  it('resizes a tilted box along its own axes, keeping the opposite corner fixed', () => {
    const a = 1.5;
    const box = { x: 40, y: 30, w: 10, h: 8, r: 30 };
    const pinned = (b) => boxCorners({ ...b, r: 30 }, a)[0]; // the top-left (nw) corner
    // drag the se handle straight along the box's own width axis by 3 units
    const th = Math.PI / 6;
    const next = dragBox(box, 'se', (3 * Math.cos(th)) / a, 3 * Math.sin(th), 1.5, a);
    expect(next.w).toBeCloseTo(10 + 3 / a, 1);
    expect(next.h).toBeCloseTo(8, 1);
    expect(pinned(next).x).toBeCloseTo(pinned(box).x, 1);
    expect(pinned(next).y).toBeCloseTo(pinned(box).y, 1);
    // and the n edge only changes the height, the s edge stays put
    const tall = dragBox(box, 'n', -Math.sin(th) * 2 / a * -1, -Math.cos(th) * 2, 1.5, a);
    expect(tall.w).toBeCloseTo(10, 1);
    expect(tall.h).toBeCloseTo(10, 1);
    expect(boxCorners({ ...tall, r: 30 }, a)[2].x).toBeCloseTo(boxCorners(box, a)[2].x, 1);
  });

  it('snaps a tilt: level within 1.5 degrees, 5-degree steps with Shift, never past 45', () => {
    expect(snapTilt(1.4)).toBe(0);
    expect(snapTilt(-1.5)).toBe(0);
    expect(snapTilt(1.6)).toBe(1.6);
    expect(snapTilt(12.4, { shift: true })).toBe(10);
    expect(snapTilt(13, { shift: true })).toBe(15);
    expect(snapTilt(80)).toBe(45);
    expect(rotateDrag(10, 0, 20)).toBe(30);
    expect(rotateDrag(0, 170, -170)).toBe(20); // across the ±180 seam
    expect(nudgeBox({ ...box, r: 44.8 }, ']')).toEqual({ r: 45 });
    expect(nudgeBox(box, '{', { shift: true })).toEqual({ r: -5 });
  });

  it('reorders and names new pieces without clashing', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    const same = ['a'];
    expect(moveItem(same, 0, -1)).toBe(same);
    expect(newPieceId([{ id: 'piece-2' }, { id: 'x' }])).toBe('piece-3');
    expect(newPieceId([{ id: 'piece-1' }])).toBe('piece-2');
  });
});

describe('the wall as data', () => {
  it('starts from the wall exactly as it hangs today, pinned credits included', () => {
    pieces = [{ id: 'row-1', wall_spot: 'pumpkin', title: 'The Pumpkin House', artist: 'Sam Example', story: 'Painted for the shop.' }];
    const seeded = seedWallPieces(pieces);
    expect(seeded.map((p) => p.id)).toEqual(spatialOrder(WALL_ART).map((a) => a.id));
    const pumpkin = seeded.find((p) => p.id === 'pumpkin');
    expect(pumpkin).toMatchObject({ artist: 'Sam Example', story: 'Painted for the shop.', shape: 'oval' });
    // copying it in changes nothing the visitor sees
    const before = spatialOrder(mergeWallArt(pieces));
    const after = resolveWall({ pieces: seeded }, pieces);
    expect(after.map((a) => [a.id, a.title, a.x, a.y, a.w, a.h, a.artist || '', a.story || ''])).toEqual(
      before.map((a) => [a.id, a.title, a.x, a.y, a.w, a.h, a.artist || '', a.story || '']),
    );
  });

  it('uses the owner’s list, in their order, once there is one', () => {
    const own = [
      normalizeWallPiece({ id: 'b', title: 'Second', x: 10, y: 10, w: 5, h: 5 }),
      normalizeWallPiece({ id: 'a', title: 'First', artist: 'Ana', artist_url: 'https://example.com', x: 50, y: 50, w: 5, h: 5 }),
    ];
    const art = resolveWall({ pieces: own }, []);
    expect(art.map((a) => a.title)).toEqual(['Second', 'First']);
    expect(art[1]).toMatchObject({ artist: 'Ana', artistUrl: 'https://example.com' });
  });

  it('ignores an empty or broken list and repeats of the same id', () => {
    expect(ownWallPieces({})).toBeNull();
    expect(ownWallPieces({ pieces: [] })).toBeNull();
    const list = ownWallPieces({ pieces: [{ id: 'a', x: 'oops', w: 500 }, { id: 'a' }] });
    expect(list).toHaveLength(1);
    expect(list[0].x + list[0].w).toBeLessThanOrEqual(100);
  });

  it('keeps old data without a tilt working: level boxes, nothing else changed', () => {
    const [p] = ownWallPieces({ pieces: [{ id: 'old', title: 'Old', x: 10, y: 10, w: 5, h: 5 }] });
    expect(p.r).toBe(0);
    expect(clampTilt('nonsense')).toBe(0);
    expect(clampTilt(-0.04)).toBe(0);
    expect(normalizeWallPiece({ id: 'a', r: 99 }).r).toBe(45);
    const level = resolveWall({ pieces: [p] }, [])[0];
    expect(level.r).toBe(0);
  });

  it('fits the zoom to a tilted piece by the box around it', () => {
    const fit = { cx: 0.5, cy: 0.5, w: 0.8, h: 0.8 };
    const flat = { x: 40, y: 30, w: 20, h: 4 };
    expect(viewFor({ ...flat, r: 30 }, fit).scale).toBeLessThan(viewFor(flat, fit).scale);
  });

  it('frames the same slice of a replacement photo of a different shape', () => {
    expect(stageRatioFor(934 / 1400)).toBeCloseTo((WALL_FOCUS.w * 934) / (WALL_FOCUS.h * 1400), 6);
    expect(stageRatioFor(1.5)).toBeCloseTo((WALL_FOCUS.w * 1.5) / WALL_FOCUS.h, 6);
  });

  it('the public room tilts a tilted piece: its hotspot, and its spotlight when opened', async () => {
    const own = [normalizeWallPiece({ id: 'tilted', title: 'The Tilted One', x: 30, y: 30, w: 10, h: 8, r: 7.5 })];
    const { container } = render(<GalleryWallRoom data={{ pieces: own }} />);
    const spot = await screen.findByRole('button', { name: 'Look closer at The Tilted One' });
    expect(spot.style.transform).toBe('rotate(7.5deg)');
    expect(spot.getAttribute('data-tb-piece')).toBe('tilted');
    fireEvent.click(spot);
    expect(container.querySelector('.gwr__spotlight').style.transform).toBe('rotate(7.5deg)');
  });

  it('the built-in wall tilts the frames that read as tilted, and leaves the rest level', () => {
    const tilted = WALL_ART.filter((a) => a.r).map((a) => a.id).sort();
    expect(tilted).toEqual(['ducks', 'oval-landscape']);
    WALL_ART.forEach((a) => expect(Math.abs(a.r || 0)).toBeLessThanOrEqual(15));
  });

  it('the public room hangs the owner’s pieces with their names', async () => {
    const own = [normalizeWallPiece({ id: 'lady-in-red', title: 'The Lady in Scarlet', artist: 'Jo Example', x: 87, y: 20.5, w: 4.6, h: 6.8 })];
    render(<GalleryWallRoom data={{ pieces: own }} />);
    const spots = await screen.findAllByRole('button', { name: /^Look closer at/ });
    expect(spots).toHaveLength(1);
    fireEvent.click(spots[0]);
    expect(within(screen.getByRole('complementary')).getByRole('heading', { name: 'The Lady in Scarlet' })).toBeTruthy();
    expect(screen.getAllByText('Jo Example').length).toBeGreaterThan(0);
  });
});

describe('the wall editor', () => {
  /* stands in for the page editor: holds the section's data and hands the
     new data straight back, the way EditorApp does */
  function setup(data = {}) {
    const calls = [];
    function Harness() {
      const [d, setD] = useState(data);
      return (
        <WallEditor
          section={{ id: 7, type: 'gallery_wall_room', data: d }}
          onChangeData={(id, next) => { calls.push(next); setD(next); }}
          onClose={() => {}}
        />
      );
    }
    const utils = render(<ToastProvider><Harness /></ToastProvider>);
    return { ...utils, calls };
  }
  const boxFor = (container, id) => container.querySelector(`.wed-box[data-id="${id}"]`);
  /* jsdom has no layout: give the photo a size (1000 x 1500 px, the photo's
     own 2:3) so pointer positions mean something */
  const PW = 1000;
  const PH = 1500;
  const sizePhoto = (container) => {
    container.querySelector('.wed__photo').getBoundingClientRect = () => ({ left: 0, top: 0, width: PW, height: PH, right: PW, bottom: PH });
  };
  const at = (a) => ({ clientX: ((a.x + a.w / 2) / 100) * PW, clientY: ((a.y + a.h / 2) / 100) * PH });
  const art = (id) => WALL_ART.find((a) => a.id === id);
  const press = (container, id, extra = {}) => {
    sizePhoto(container);
    const el = boxFor(container, id);
    fireEvent.pointerDown(el, { button: 0, pointerId: 1, ...at(art(id)), ...extra });
    fireEvent.pointerUp(el, { pointerId: 1, ...at(art(id)) });
  };

  it('draws a box for every piece on the wall and lists them in walking order', async () => {
    const { container } = setup();
    await waitFor(() => expect(container.querySelectorAll('.wed-box')).toHaveLength(WALL_ART.length));
    const list = screen.getByRole('list', { name: /pieces, in the order/i });
    expect(within(list).getAllByRole('listitem')).toHaveLength(WALL_ART.length);
  });

  it('selects a piece and shows the live gold label and its details', async () => {
    const { container } = setup();
    await waitFor(() => expect(boxFor(container, 'lady-in-red')).toBeTruthy());
    press(container, 'lady-in-red');
    const box = boxFor(container, 'lady-in-red');
    expect(box.className).toMatch(/is-selected/);
    expect(box.querySelector('.wed-plate').textContent).toBe('The Lady in Red');
    expect(box.querySelectorAll('.wed-handle')).toHaveLength(8);
    expect(screen.getByLabelText(/name on the label/i).value).toBe('The Lady in Red');
  });

  it('copies the whole wall in on the first edit, so nothing else changes', async () => {
    const { container, calls } = setup();
    await waitFor(() => expect(boxFor(container, 'pumpkin')).toBeTruthy());
    fireEvent.keyDown(boxFor(container, 'pumpkin'), { key: 'ArrowRight' });
    const next = calls.at(-1);
    expect(next.pieces).toHaveLength(WALL_ART.length);
    const base = WALL_ART.find((a) => a.id === 'pumpkin');
    const moved = next.pieces.find((p) => p.id === 'pumpkin');
    expect(moved.x).toBeCloseTo(base.x + NUDGE, 5);
    expect(moved.y).toBe(base.y);
    const other = next.pieces.find((p) => p.id === 'ducks');
    expect(other).toMatchObject({ x: WALL_ART[0].x, y: WALL_ART[0].y, title: 'The Rubber Ducks' });
  });

  it('moves with Shift + arrows and resizes with Alt + arrows', async () => {
    const { container, calls } = setup();
    await waitFor(() => expect(boxFor(container, 'pumpkin')).toBeTruthy());
    const base = WALL_ART.find((a) => a.id === 'pumpkin');
    fireEvent.keyDown(boxFor(container, 'pumpkin'), { key: 'ArrowDown', shiftKey: true });
    expect(calls.at(-1).pieces.find((p) => p.id === 'pumpkin').y).toBeCloseTo(base.y + NUDGE_BIG, 5);
    fireEvent.keyDown(boxFor(container, 'pumpkin'), { key: 'ArrowRight', altKey: true });
    const p = calls.at(-1).pieces.find((x) => x.id === 'pumpkin');
    expect(p.w).toBeCloseTo(base.w + NUDGE, 5);
  });

  it('drags a box by pointer (mouse or touch) in % of the photo', async () => {
    const { container, calls } = setup();
    await waitFor(() => expect(boxFor(container, 'bicycle-fox')).toBeTruthy());
    sizePhoto(container);
    const el = boxFor(container, 'bicycle-fox');
    const p0 = at(art('bicycle-fox'));
    fireEvent.pointerDown(el, { button: 0, pointerId: 2, pointerType: 'touch', ...p0 });
    fireEvent.pointerMove(el, { pointerId: 2, clientX: p0.clientX + 50, clientY: p0.clientY + 30 });
    fireEvent.pointerUp(el, { pointerId: 2 });
    const d = calls.at(-1).pieces.find((p) => p.id === 'bicycle-fox');
    expect(d.x).toBeCloseTo(art('bicycle-fox').x + 5, 5);
    expect(d.y).toBeCloseTo(art('bicycle-fox').y + 2, 5);
  });

  it('resizes from a corner handle', async () => {
    const { container, calls } = setup();
    await waitFor(() => expect(boxFor(container, 'bicycle-fox')).toBeTruthy());
    press(container, 'bicycle-fox');
    const handle = boxFor(container, 'bicycle-fox').querySelector('.wed-handle--se');
    fireEvent.pointerDown(handle, { button: 0, clientX: 500, clientY: 500, pointerId: 4 });
    fireEvent.pointerMove(handle, { clientX: 480, clientY: 455, pointerId: 4 });
    const d = calls.at(-1).pieces.find((p) => p.id === 'bicycle-fox');
    const b = art('bicycle-fox');
    expect(d.x).toBe(b.x);
    expect(d.w).toBeCloseTo(b.w - 2, 5);
    expect(d.h).toBeCloseTo(b.h - 3, 5);
  });

  it('picks the smallest frame under the pointer, and a second tap steps to the next one', async () => {
    const { container } = setup();
    await waitFor(() => expect(boxFor(container, 'hare')).toBeTruthy());
    sizePhoto(container);
    // a point inside both the brass hare and the daisies frame beside it
    const hare = art('hare');
    const daisies = art('daisies');
    const x = (Math.max(hare.x, daisies.x) + Math.min(hare.x + hare.w, daisies.x + daisies.w)) / 2;
    const y = (Math.max(hare.y, daisies.y) + Math.min(hare.y + hare.h, daisies.y + daisies.h)) / 2;
    const pt = { clientX: (x / 100) * PW, clientY: (y / 100) * PH };
    const photo = container.querySelector('.wed__photo');
    const tap = () => { fireEvent.pointerDown(photo, { button: 0, pointerId: 5, ...pt }); fireEvent.pointerUp(photo, { pointerId: 5, ...pt }); };
    tap();
    const smaller = hare.w * hare.h < daisies.w * daisies.h ? 'hare' : 'daisies';
    const bigger = smaller === 'hare' ? 'daisies' : 'hare';
    expect(boxFor(container, smaller).className).toMatch(/is-selected/);
    tap();
    expect(boxFor(container, bigger).className).toMatch(/is-selected/);
    tap();
    expect(boxFor(container, smaller).className).toMatch(/is-selected/);
  });

  it('opens on a piece it was asked to (a click on the page, or ?piece=)', async () => {
    const section = { id: 7, type: 'gallery_wall_room', data: {} };
    render(<ToastProvider><WallEditor section={section} onChangeData={() => {}} onClose={() => {}} initialPiece="pumpkin" /></ToastProvider>);
    expect((await screen.findByLabelText(/name on the label/i)).value).toBe('The Pumpkin House');
  });

  it('tilts with the round handle, snapping level near 0 and to 5 degree steps with Shift', async () => {
    const { container, calls } = setup();
    await waitFor(() => expect(boxFor(container, 'bicycle-fox')).toBeTruthy());
    press(container, 'bicycle-fox');
    const knob = boxFor(container, 'bicycle-fox').querySelector('.wed-rotate');
    expect(knob).toBeTruthy();
    const c = at(art('bicycle-fox'));
    // start straight above the centre, swing round 30 degrees clockwise
    const r = 200;
    const pos = (deg) => ({ clientX: c.clientX + r * Math.sin((deg * Math.PI) / 180), clientY: c.clientY - r * Math.cos((deg * Math.PI) / 180) });
    fireEvent.pointerDown(knob, { button: 0, pointerId: 6, ...pos(0) });
    fireEvent.pointerMove(knob, { pointerId: 6, ...pos(30) });
    expect(calls.at(-1).pieces.find((p) => p.id === 'bicycle-fox').r).toBeCloseTo(30, 5);
    fireEvent.pointerMove(knob, { pointerId: 6, ...pos(1.2) });
    expect(calls.at(-1).pieces.find((p) => p.id === 'bicycle-fox').r).toBe(0);
    fireEvent.pointerMove(knob, { pointerId: 6, shiftKey: true, ...pos(-12) });
    expect(calls.at(-1).pieces.find((p) => p.id === 'bicycle-fox').r).toBe(-10);
    fireEvent.pointerUp(knob, { pointerId: 6 });
    expect(boxFor(container, 'bicycle-fox').style.transform).toBe('rotate(-10deg)');
  });

  it('tilts with [ and ] (Shift for 5 degrees), the Tilt box, and Straighten', async () => {
    const { container, calls } = setup();
    await waitFor(() => expect(boxFor(container, 'pumpkin')).toBeTruthy());
    const r = () => calls.at(-1).pieces.find((p) => p.id === 'pumpkin').r;
    fireEvent.keyDown(boxFor(container, 'pumpkin'), { key: ']' });
    expect(r()).toBe(0.5);
    fireEvent.keyDown(boxFor(container, 'pumpkin'), { key: '[' });
    fireEvent.keyDown(boxFor(container, 'pumpkin'), { key: '[' });
    expect(r()).toBe(-0.5);
    fireEvent.keyDown(boxFor(container, 'pumpkin'), { key: '}', shiftKey: true });
    expect(r()).toBe(4.5);
    fireEvent.change(screen.getByLabelText(/tilt/i), { target: { value: '60' } });
    expect(r()).toBe(45);
    fireEvent.click(screen.getByRole('button', { name: /straighten/i }));
    expect(r()).toBe(0);
    expect(screen.getByRole('button', { name: /straighten/i }).disabled).toBe(true);
  });

  it('edits the name, artist, link and story into the section data, never straight to the database', async () => {
    const { container, calls } = setup();
    await waitFor(() => expect(boxFor(container, 'lady-in-red')).toBeTruthy());
    fireEvent.click(within(screen.getByRole('list', { name: /pieces, in the order/i })).getByRole('button', { name: /^the lady in red/i }));
    fireEvent.change(screen.getByLabelText(/name on the label/i), { target: { value: 'The Lady in Scarlet' } });
    fireEvent.change(screen.getByLabelText(/who made it/i), { target: { value: 'Jo Example' } });
    fireEvent.change(screen.getByLabelText(/link for the artist/i), { target: { value: 'https://example.com/jo' } });
    fireEvent.change(screen.getByLabelText(/^the story/i), { target: { value: 'Found at a flea market.' } });
    const lady = calls.at(-1).pieces.find((p) => p.id === 'lady-in-red');
    expect(lady).toMatchObject({ title: 'The Lady in Scarlet', artist: 'Jo Example', artist_url: 'https://example.com/jo', story: 'Found at a flea market.' });
    expect(writes).toEqual([]); // explicit publishing: nothing written until Publish
  });

  it('reorders the walk and adds and removes pieces', async () => {
    const { container, calls } = setup();
    await waitFor(() => expect(container.querySelectorAll('.wed-box')).toHaveLength(WALL_ART.length));
    const first = spatialOrder(WALL_ART)[0];
    fireEvent.click(screen.getByRole('button', { name: `Move ${first.title} later` }));
    expect(calls.at(-1).pieces[1].id).toBe(first.id);

    fireEvent.click(screen.getByRole('button', { name: /add a piece/i }));
    expect(calls.at(-1).pieces).toHaveLength(WALL_ART.length + 1);
    expect(screen.getByLabelText(/name on the label/i).value).toBe('New piece');

    fireEvent.click(screen.getByRole('button', { name: /remove from the wall/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^remove$/i }));
    expect(calls.at(-1).pieces).toHaveLength(WALL_ART.length);
  });
});
