import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/* The real-chalkboard photo: the hero shows it only while it's switched on,
   has a url and is fresh; every other case is the drawn live-menu board. The
   admin control publishes the documented content_blocks shape. */

vi.mock('../src/lib/analytics.js', () => ({ track: vi.fn() }));
vi.mock('../src/lib/dataService.js', async (importOriginal) => ({
  ...(await importOriginal()),
  getContentBlock: vi.fn(async () => ({})),
}));
const upsert = vi.fn(async () => ({ error: null }));
let stored = null; // content_blocks.chalkboard_photo
let storedHistory = null; // content_blocks.chalkboard_history
vi.mock('../src/lib/supabase.js', () => ({
  isSupabaseConfigured: false,
  supabase: {
    from: () => ({
      select: () => ({
        eq: (_, key) => ({
          maybeSingle: async () => {
            const d = key === 'chalkboard_history' ? storedHistory : stored;
            return { data: d ? { data: d } : null, error: null };
          },
        }),
      }),
      upsert: (...args) => upsert(...args),
    }),
  },
}));
vi.mock('../src/admin/lib/uploadImage.js', () => ({
  uploadImage: vi.fn(async () => ({ url: 'https://cdn.test/media/chalkboard/1-board.webp', path: 'chalkboard/1-board.webp', before: 4_000_000, after: 300_000 })),
  deleteMedia: vi.fn(async () => {}),
  listMedia: vi.fn(async () => []),
  formatBytes: (b) => `${b} B`,
}));

const { getContentBlock } = await import('../src/lib/dataService.js');
const { uploadImage, deleteMedia, listMedia } = await import('../src/admin/lib/uploadImage.js');
const {
  isChalkboardLive, updatedLabel, daysAgo, addToHistory, publicBoards, historyBoards, entryFor, boardDate,
} = await import('../src/lib/chalkboard.js');
const PastryCaseHero = (await import('../src/components/sections/PastryCaseHero.jsx')).default;
const ChalkboardManager = (await import('../src/admin/managers/ChalkboardManager.jsx')).default;
const { ToastProvider } = await import('../src/admin/components/ui.jsx');
const { UnsavedProvider } = await import('../src/admin/lib/publishing.jsx');
const { chalkStatus } = await import('../src/admin/lib/chalkStatus.js');

const DAY = 86400000;
const iso = (msAgo = 0) => new Date(Date.now() - msAgo).toISOString();
const PHOTO = 'https://cdn.test/media/chalkboard/today.webp';

afterEach(() => { cleanup(); vi.clearAllMocks(); stored = null; storedHistory = null; });
const upsertsFor = (key) => upsert.mock.calls.filter(([row]) => row.key === key);

function renderHero(data) {
  return render(<MemoryRouter><PastryCaseHero data={data} /></MemoryRouter>);
}
const photoImg = () => screen.queryByRole('img', { name: /chalkboard/i });
const drawnBoard = () => screen.findByText('Sips');

describe('freshness rules', () => {
  const now = new Date('2026-10-20T15:00:00Z'); // Tue, 11am in NJ
  it('counts calendar days on the shop clock, upload day included', () => {
    const block = (at, extra) => ({ enabled: true, url: PHOTO, updated_at: at, ...extra });
    expect(isChalkboardLive(block('2026-10-20T11:00:00Z'), { now })).toBe(true);
    expect(isChalkboardLive(block('2026-10-18T23:00:00Z'), { now })).toBe(true); // Sun 7pm NJ → 2 days
    expect(isChalkboardLive(block('2026-10-17T15:00:00Z'), { now })).toBe(false); // Sat → 3 days: stale
    expect(isChalkboardLive(block('2026-10-17T15:00:00Z', { max_age_days: 5 }), { now })).toBe(true);
    expect(isChalkboardLive(block('2026-10-19T15:00:00Z', { max_age_days: 1 }), { now })).toBe(false);
    // section override beats the block
    expect(isChalkboardLive(block('2026-10-17T15:00:00Z'), { now, maxAgeDays: 7 })).toBe(true);
  });
  it('is off when disabled, url-less, undated or missing', () => {
    expect(isChalkboardLive({ enabled: false, url: PHOTO, updated_at: now.toISOString() }, { now })).toBe(false);
    expect(isChalkboardLive({ enabled: true, url: '', updated_at: now.toISOString() }, { now })).toBe(false);
    expect(isChalkboardLive({ enabled: true, url: PHOTO, updated_at: 'nope' }, { now })).toBe(false);
    expect(isChalkboardLive(null, { now })).toBe(false);
    expect(isChalkboardLive({}, { now })).toBe(false);
  });
  it('labels the age the way a person would', () => {
    expect(updatedLabel('2026-10-20T12:00:00Z', now)).toBe('Updated today');
    expect(updatedLabel('2026-10-19T12:00:00Z', now)).toBe('Updated yesterday');
    expect(updatedLabel('2026-10-18T12:00:00Z', now)).toBe('Updated Sun');
    // 1am UTC Tue is still Monday evening in NJ
    expect(daysAgo('2026-10-20T01:00:00Z', now)).toBe(1);
  });
});

describe('Pastry Case hero: real chalkboard photo', () => {
  it('shows the photo (in place of the drawn board) when enabled and fresh, and opens it full-size', async () => {
    getContentBlock.mockResolvedValue({ enabled: true, url: PHOTO, caption: 'Pumpkin cold foam is back', updated_at: iso(60_000) });
    renderHero();
    const img = await waitFor(() => { const i = photoImg(); expect(i).toBeTruthy(); return i; });
    expect(img.getAttribute('src')).toBe(PHOTO);
    expect(screen.getByText('Pumpkin cold foam is back')).toBeTruthy();
    expect(screen.getByText('Updated today')).toBeTruthy();
    expect(screen.queryByText('Sips')).toBeNull();
    expect(getContentBlock).toHaveBeenCalledWith('chalkboard_photo');

    const trigger = screen.getByRole('button', { name: /open the photo of our chalkboard/i });
    trigger.focus(); // a real click focuses the button; fireEvent doesn't
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog');
    expect(dialog.querySelector('img').getAttribute('src')).toBe(PHOTO);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close photo' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('button', { name: 'Close photo' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each([
    ['stale (older than 3 days)', () => ({ enabled: true, url: PHOTO, updated_at: iso(4 * DAY) })],
    ['switched off', () => ({ enabled: false, url: PHOTO, updated_at: iso() })],
    ['without a url', () => ({ enabled: true, url: '', updated_at: iso() })],
    ['missing (no row)', () => ({})],
  ])('falls back to the drawn live-menu board when the photo is %s', async (_, block) => {
    getContentBlock.mockResolvedValue(block());
    renderHero();
    expect(await drawnBoard()).toBeTruthy();
    await waitFor(() => expect(getContentBlock).toHaveBeenCalled());
    expect(photoImg()).toBeNull();
  });

  it('falls back when the fetch fails', async () => {
    getContentBlock.mockRejectedValue(new Error('offline'));
    renderHero();
    expect(await drawnBoard()).toBeTruthy();
    expect(photoImg()).toBeNull();
  });

  it('honors a shorter per-section max age', async () => {
    getContentBlock.mockResolvedValue({ enabled: true, url: PHOTO, updated_at: iso(2 * DAY) });
    renderHero({ pch_chalk_max_days: 1 });
    expect(await drawnBoard()).toBeTruthy();
    expect(photoImg()).toBeNull();
  });

  it('holds the board\'s place while loading instead of flashing the drawn board', async () => {
    let resolve;
    getContentBlock.mockImplementation((key) => (key === 'chalkboard_photo' ? new Promise((r) => { resolve = r; }) : Promise.resolve({})));
    const { container } = renderHero();
    expect(container.querySelector('.pch__board--pending')).toBeTruthy();
    await new Promise((r) => setTimeout(r, 30)); // the menu loads meanwhile
    expect(screen.queryByText('Sips')).toBeNull();
    resolve({ enabled: true, url: PHOTO, updated_at: iso() });
    await waitFor(() => expect(photoImg()).toBeTruthy());
    expect(container.querySelector('.pch__board--pending')).toBeNull();
  });

  it('lays a landscape board out wide, reserving its shape from the recorded size', async () => {
    getContentBlock.mockResolvedValue({ enabled: true, url: PHOTO, updated_at: iso(), width: 1600, height: 1000 });
    const { container } = renderHero();
    const img = await waitFor(() => { const i = photoImg(); expect(i).toBeTruthy(); return i; });
    expect(img.getAttribute('width')).toBe('1600');
    expect(img.getAttribute('height')).toBe('1000');
    expect(container.querySelector('.pch').className).toMatch(/pch--wide-board/);
    expect(img.closest('.pch__board--photo').className).toMatch(/is-ready/);
  });

  it('measures an older row (no recorded size) once the photo loads', async () => {
    getContentBlock.mockResolvedValue({ enabled: true, url: PHOTO, updated_at: iso() });
    const { container } = renderHero();
    const img = await waitFor(() => { const i = photoImg(); expect(i).toBeTruthy(); return i; });
    // not shown until its shape is known, so it never pops from one size to another
    expect(img.closest('.pch__board--photo').className).not.toMatch(/is-ready/);
    Object.defineProperty(img, 'naturalWidth', { configurable: true, value: 900 });
    Object.defineProperty(img, 'naturalHeight', { configurable: true, value: 1200 });
    fireEvent.load(img);
    expect(img.closest('.pch__board--photo').className).toMatch(/is-ready/);
    expect(img.className).toMatch(/is-loaded/);
    expect(container.querySelector('.pch').className).not.toMatch(/pch--wide-board/); // portrait stays narrow
  });

  it('falls back when the image itself fails to load', async () => {
    getContentBlock.mockResolvedValue({ enabled: true, url: PHOTO, updated_at: iso() });
    renderHero();
    const img = await waitFor(() => { const i = photoImg(); expect(i).toBeTruthy(); return i; });
    fireEvent.error(img);
    expect(await drawnBoard()).toBeTruthy();
    expect(photoImg()).toBeNull();
  });
});

describe("admin: Today's chalkboard", () => {
  let realImage;
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
    realImage = window.Image;
  });
  afterEach(() => {
    window.Image = realImage;
    Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => true });
  });

  const renderAdmin = () =>
    render(
      <MemoryRouter initialEntries={['/admin/chalkboard']}>
        <ToastProvider><UnsavedProvider><ChalkboardManager /></UnsavedProvider></ToastProvider>
      </MemoryRouter>
    );
  const camera = () => screen.findByLabelText(/take a photo of the board/i);
  const putLiveBtn = () => screen.getByRole('button', { name: /put it on the website/i });
  const photo = (name = 'IMG_2041.jpg', type = 'image/jpeg') => new File(['x'], name, { type });
  const alertText = async () => (await screen.findByRole('alert')).textContent;

  it('one giant camera button (phone camera) plus a normal photo pick', async () => {
    renderAdmin();
    const cam = await camera();
    expect(cam.getAttribute('accept')).toBe('image/*');
    expect(cam.getAttribute('capture')).toBe('environment');
    expect(cam.closest('label').className).toMatch(/chalk__camera/);
    const pick = screen.getByLabelText(/choose a photo you already took/i);
    expect(pick.hasAttribute('capture')).toBe(false);
    // nothing to publish until there's a photo
    expect(screen.queryByRole('button', { name: /put it on the website/i })).toBeNull();
    expect(screen.getByRole('status').textContent).toMatch(/not showing — the drawn menu board is up/i);
  });

  it('happy path: photo → homepage preview → "Put it on the website" publishes exactly once', async () => {
    stored = { enabled: true, url: 'https://cdn.test/media/chalkboard/0-old.webp', path: 'chalkboard/0-old.webp', caption: '', updated_at: iso(4 * DAY), max_age_days: 3 };
    renderAdmin();
    const file = photo();
    fireEvent.change(await camera(), { target: { files: [file] } });

    // the preview is the homepage's own framed, tilted board, marked as not live
    const img = await screen.findByAltText(/preview of the chalkboard photo on the homepage/i);
    expect(img.getAttribute('src')).toBe('blob:preview');
    expect(img.closest('.pch__board--photo')).toBeTruthy();
    expect(screen.getByText('Updated today')).toBeTruthy();
    expect(screen.getAllByText(/not on the website yet/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/retake/i)).toBeTruthy();
    // nothing has left the phone
    expect(uploadImage).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();

    // the optional words are folded away, but work
    expect(screen.getByText(/add a few words under the photo/i).closest('details').open).toBe(false);
    fireEvent.change(screen.getByLabelText(/a few words/i), { target: { value: '  Pumpkin cold foam is back  ' } });
    expect(upsert).not.toHaveBeenCalled();

    const before = Date.now();
    fireEvent.click(putLiveBtn());
    fireEvent.click(screen.getByRole('button', { name: /putting it up|put it on the website/i })); // an impatient double tap
    expect(await screen.findByRole('heading', { name: /it’s on the website/i })).toBeTruthy();

    expect(uploadImage).toHaveBeenCalledTimes(1);
    expect(uploadImage).toHaveBeenCalledWith(file, { preset: 'chalkboard', folder: 'chalkboard' });
    expect(upsertsFor('chalkboard_photo')).toHaveLength(1);
    const [row, opts] = upsertsFor('chalkboard_photo')[0];
    expect(opts).toEqual({ onConflict: 'key' });
    expect(row).toMatchObject({ key: 'chalkboard_photo', status: 'published' });
    expect(row.data).toEqual({
      url: 'https://cdn.test/media/chalkboard/1-board.webp',
      path: 'chalkboard/1-board.webp',
      caption: 'Pumpkin cold foam is back',
      updated_at: expect.any(String),
      enabled: true,
      max_age_days: 3,
      keep_until_replaced: false,
    });
    expect(Date.parse(row.data.updated_at)).toBeGreaterThanOrEqual(before);
    // the old photo is KEPT (for Past boards), and both boards are in the history, newest first
    expect(deleteMedia).not.toHaveBeenCalled();
    expect(upsertsFor('chalkboard_history')).toHaveLength(1);
    const hist = upsertsFor('chalkboard_history')[0][0];
    expect(hist.status).toBe('published');
    expect(hist.data.boards.map((b) => b.path)).toEqual(['chalkboard/1-board.webp', 'chalkboard/0-old.webp']);
    expect(hist.data.boards[0]).toMatchObject({ caption: 'Pumpkin cold foam is back', published_at: row.data.updated_at, hidden: false });
    expect(hist.data.boards[1].published_at).toBe(stored.updated_at);

    // success screen: see it, go home, status in plain words
    const see = screen.getByRole('link', { name: /see it on the website/i });
    expect(see.getAttribute('target')).toBe('_blank');
    expect(screen.getByRole('link', { name: /back to admin home/i }).getAttribute('href')).toBe('/admin');
    expect(screen.getByRole('status').textContent).toMatch(/on the website now — taken this (morning|afternoon|evening) at \d{1,2}:\d{2}, comes down \w+/i);
  });

  it('records the photo\'s size so the homepage can lay a landscape board out before it loads', async () => {
    renderAdmin();
    fireEvent.change(await camera(), { target: { files: [photo()] } });
    const img = await screen.findByAltText(/preview of the chalkboard photo on the homepage/i);
    Object.defineProperty(img, 'naturalWidth', { configurable: true, value: 1600 });
    Object.defineProperty(img, 'naturalHeight', { configurable: true, value: 1200 });
    fireEvent.load(img);
    fireEvent.click(putLiveBtn());
    expect(await screen.findByRole('heading', { name: /it’s on the website/i })).toBeTruthy();
    expect(upsertsFor('chalkboard_photo')[0][0].data).toMatchObject({ width: 1600, height: 1200 });
  });

  it('Retake swaps the photo without publishing anything', async () => {
    renderAdmin();
    fireEvent.change(await camera(), { target: { files: [photo('a.jpg')] } });
    const second = photo('b.jpg');
    fireEvent.change(screen.getByLabelText(/retake/i), { target: { files: [second] } });
    expect(uploadImage).not.toHaveBeenCalled();
    fireEvent.click(putLiveBtn());
    await screen.findByRole('heading', { name: /it’s on the website/i });
    expect(uploadImage).toHaveBeenCalledWith(second, expect.anything());
  });

  it('how long it stays up is a plain choice, defaulting to 3 days', async () => {
    renderAdmin();
    fireEvent.change(await camera(), { target: { files: [photo()] } });
    const group = screen.getByRole('group', { name: /how long should it stay up/i });
    expect(screen.getByRole('radio', { name: /3 days \(usual\)/i }).checked).toBe(true);
    expect(group.textContent).toMatch(/until I replace it/i);
    fireEvent.click(screen.getByRole('radio', { name: /today only/i }));
    expect(upsert).not.toHaveBeenCalled();
    fireEvent.click(putLiveBtn());
    await screen.findByRole('heading', { name: /it’s on the website/i });
    expect(upsertsFor('chalkboard_photo')[0][0].data).toMatchObject({ max_age_days: 1, keep_until_replaced: false });
  });

  it('"Until I replace it": says so plainly, publishes keep_until_replaced, status says it stays up', async () => {
    renderAdmin();
    fireEvent.change(await camera(), { target: { files: [photo()] } });
    fireEvent.click(screen.getByRole('radio', { name: /until I replace it/i }));
    expect(screen.getByText(/stays up until you post a new one/i)).toBeTruthy();
    expect(upsert).not.toHaveBeenCalled(); // nothing goes live before the button
    fireEvent.click(putLiveBtn());
    await screen.findByRole('heading', { name: /it’s on the website/i });
    expect(upsertsFor('chalkboard_photo')[0][0].data).toMatchObject({ max_age_days: null, keep_until_replaced: true, enabled: true });
    expect(screen.getByText(/stays up until you post a new one/i)).toBeTruthy();
    expect(screen.getByRole('status').textContent).toMatch(/Showing since [A-Z][a-z]{2} \d{1,2} · stays up until replaced$/);
  });

  it('switching a live photo to "Until I replace it" is staged, then saved without a new upload', async () => {
    stored = { enabled: true, url: PHOTO, path: 'chalkboard/today.webp', caption: '', updated_at: iso(), max_age_days: 3 };
    storedHistory = { boards: [entryFor(stored)] };
    renderAdmin();
    fireEvent.click(await screen.findByRole('radio', { name: /until I replace it/i }));
    expect(upsert).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /put the changes on the website/i }));
    await screen.findByRole('heading', { name: /your changes are on the website/i });
    expect(uploadImage).not.toHaveBeenCalled();
    expect(upsertsFor('chalkboard_photo')[0][0].data).toMatchObject({ url: PHOTO, keep_until_replaced: true, max_age_days: null });
    // same board: the history isn't touched
    expect(upsertsFor('chalkboard_history')).toHaveLength(0);
  });

  it('"Take the photo down" is staged until the one big button', async () => {
    stored = { enabled: true, url: PHOTO, path: 'chalkboard/today.webp', caption: 'Hi', updated_at: iso(), max_age_days: 3 };
    renderAdmin();
    fireEvent.click(await screen.findByRole('button', { name: /take the photo down/i }));
    expect(upsert).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /take it off the website/i }));
    await screen.findByRole('heading', { name: /drawn menu board is back/i });
    expect(upsertsFor('chalkboard_photo')).toHaveLength(1);
    expect(upsertsFor('chalkboard_photo')[0][0]).toMatchObject({ key: 'chalkboard_photo', data: { ...stored, enabled: false } });
    expect(uploadImage).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toMatch(/not showing — the drawn menu board is up/i);
  });

  describe('problems are explained in plain words', () => {
    it('a photo that is too big', async () => {
      renderAdmin();
      const big = photo('huge.jpg');
      Object.defineProperty(big, 'size', { value: 22 * 1024 * 1024 });
      fireEvent.change(await camera(), { target: { files: [big] } });
      expect(await alertText()).toMatch(/too big \(22\.0 MB\)/i);
      expect(screen.queryByRole('button', { name: /put it on the website/i })).toBeNull();
    });

    it('a file that is not a photo', async () => {
      renderAdmin();
      fireEvent.change(await camera(), { target: { files: [new File(['%PDF'], 'menu.pdf', { type: 'application/pdf' })] } });
      expect(await alertText()).toMatch(/isn’t a photo/i);
    });

    it('an iPhone HEIC this browser cannot open', async () => {
      window.Image = class { set src(_) { setTimeout(() => this.onerror?.(), 0); } };
      renderAdmin();
      fireEvent.change(await camera(), { target: { files: [photo('IMG_0001.HEIC', 'image/heic')] } });
      expect(await alertText()).toMatch(/HEIC.*Most Compatible/s);
      expect(uploadImage).not.toHaveBeenCalled();
    });

    it('a HEIC the browser CAN open (Safari) goes through as normal', async () => {
      window.Image = class { set src(_) { setTimeout(() => this.onload?.(), 0); } };
      renderAdmin();
      fireEvent.change(await camera(), { target: { files: [photo('IMG_0001.HEIC', 'image/heic')] } });
      expect(await screen.findByRole('button', { name: /put it on the website/i })).toBeTruthy();
    });

    it('no connection: keeps the photo and says what to do', async () => {
      upsert.mockResolvedValueOnce({ error: { message: 'Failed to fetch' } });
      renderAdmin();
      fireEvent.change(await camera(), { target: { files: [photo()] } });
      fireEvent.click(putLiveBtn());
      expect(await alertText()).toMatch(/no connection.*your photo is still here/i);
      expect(putLiveBtn().disabled).toBe(false);
      expect(screen.getByAltText(/preview of the chalkboard photo/i)).toBeTruthy();
    });

    it('offline before trying: nothing is sent', async () => {
      Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
      renderAdmin();
      fireEvent.change(await camera(), { target: { files: [photo()] } });
      fireEvent.click(putLiveBtn());
      expect(await alertText()).toMatch(/no connection/i);
      expect(uploadImage).not.toHaveBeenCalled();
      expect(upsert).not.toHaveBeenCalled();
    });

    it('signed out: says so and offers a sign-in link', async () => {
      uploadImage.mockRejectedValueOnce(new Error('JWT expired'));
      renderAdmin();
      fireEvent.change(await camera(), { target: { files: [photo()] } });
      fireEvent.click(putLiveBtn());
      expect(await alertText()).toMatch(/signed out/i);
      expect(screen.getByRole('link', { name: /sign in again/i }).getAttribute('target')).toBe('_blank');
      expect(upsert).not.toHaveBeenCalled();
    });
  });
});

describe('chalkboard status line', () => {
  // Mon Oct 19 2026, 7:42 AM in NJ
  const taken = '2026-10-19T11:42:00Z';
  it('says when it was taken and when it comes down, on the shop clock', () => {
    const now = new Date('2026-10-19T14:00:00Z');
    expect(chalkStatus({ enabled: true, url: PHOTO, updated_at: taken, max_age_days: 3 }, now)).toEqual({
      live: true,
      text: 'On the website now — taken this morning at 7:42, comes down Thursday',
    });
    expect(chalkStatus({ enabled: true, url: PHOTO, updated_at: taken, max_age_days: 1 }, now).text).toMatch(/comes down tomorrow$/);
    expect(chalkStatus({ enabled: true, url: PHOTO, updated_at: taken, max_age_days: 3 }, new Date('2026-10-20T14:00:00Z')).text)
      .toBe('On the website now — taken yesterday at 7:42 AM, comes down Thursday');
  });
  it('says plainly when the drawn board is up', () => {
    const now = new Date('2026-10-23T14:00:00Z');
    expect(chalkStatus({ enabled: false, url: PHOTO, updated_at: taken }, now).text).toBe('Not showing — the drawn menu board is up');
    expect(chalkStatus({ enabled: true, url: PHOTO, updated_at: taken, max_age_days: 3 }, now).text).toMatch(/^Not showing — the last photo \(taken on Mon at 7:42 AM\) has come down/);
    expect(chalkStatus({}, now).text).toBe('Not showing — the drawn menu board is up');
  });
});

describe('"Until I replace it" and older rows', () => {
  const now = new Date('2026-10-20T15:00:00Z');
  const block = (at, extra) => ({ enabled: true, url: PHOTO, updated_at: at, ...extra });
  it('a keep-until-replaced photo never expires', () => {
    const kept = block('2025-09-01T12:00:00Z', { keep_until_replaced: true, max_age_days: null });
    expect(isChalkboardLive(kept, { now })).toBe(true);
    expect(isChalkboardLive(kept, { now: new Date('2030-01-01T12:00:00Z') })).toBe(true);
    // the staff's explicit choice beats a section's shorter max age
    expect(isChalkboardLive(kept, { now, maxAgeDays: 1 })).toBe(true);
    // …but switched off / url-less / undated still means the drawn board
    expect(isChalkboardLive({ ...kept, enabled: false }, { now })).toBe(false);
    expect(isChalkboardLive({ ...kept, url: '' }, { now })).toBe(false);
    expect(isChalkboardLive({ ...kept, updated_at: null }, { now })).toBe(false);
  });
  it('rows written before the option still expire (number, null or missing max_age_days)', () => {
    const old = '2026-10-16T15:00:00Z'; // 4 days before `now`
    expect(isChalkboardLive(block(old, { max_age_days: 3 }), { now })).toBe(false);
    expect(isChalkboardLive(block(old, { max_age_days: 7 }), { now })).toBe(true);
    expect(isChalkboardLive(block(old, { max_age_days: null }), { now })).toBe(false); // → the 3-day default
    expect(isChalkboardLive(block(old), { now })).toBe(false);
    expect(isChalkboardLive(block(old, { keep_until_replaced: 'yes' }), { now })).toBe(false); // only `true` counts
  });
  it('the status line says it stays up until replaced', () => {
    expect(chalkStatus(block('2026-10-19T11:42:00Z', { keep_until_replaced: true, max_age_days: null }), now)).toEqual({
      live: true,
      text: 'Showing since Oct 19 · stays up until replaced',
    });
  });
  it('a weeks-old kept photo is labelled with its date, not a weekday', () => {
    expect(updatedLabel('2026-10-03T15:00:00Z', now)).toBe('Updated Oct 3');
    expect(updatedLabel('2026-10-15T15:00:00Z', now)).toBe('Updated Thu');
  });
});

describe('chalkboard history', () => {
  const a = { url: 'https://cdn.test/a.webp', path: 'chalkboard/a.webp', caption: 'Apple cider', published_at: '2026-09-20T12:00:00Z' };
  const b = { url: 'https://cdn.test/b.webp', path: 'chalkboard/b.webp', caption: '', published_at: '2026-10-16T12:00:00Z' };
  const c = { url: 'https://cdn.test/c.webp', path: 'chalkboard/c.webp', caption: 'Pumpkin', published_at: '2026-10-18T12:00:00Z' };

  it('appends on publish, newest first, without duplicates', () => {
    let list = addToHistory([], entryFor({ ...a, updated_at: a.published_at }));
    list = addToHistory(list, entryFor({ ...c, updated_at: c.published_at }));
    list = addToHistory(list, entryFor({ ...b, updated_at: b.published_at }));
    expect(list.map((x) => x.path)).toEqual(['chalkboard/c.webp', 'chalkboard/b.webp', 'chalkboard/a.webp']);
    // re-publishing the same board (a new caption) updates it in place, keeping its first date and hidden flag
    list = list.map((x) => (x.path === 'chalkboard/b.webp' ? { ...x, hidden: true } : x));
    list = addToHistory(list, entryFor({ ...b, caption: 'Now with cold foam', updated_at: '2026-10-19T12:00:00Z' }));
    expect(list).toHaveLength(3);
    expect(list[1]).toMatchObject({ path: 'chalkboard/b.webp', caption: 'Now with cold foam', published_at: b.published_at, hidden: true });
  });

  it('hidden boards are left out publicly; junk rows are ignored', () => {
    const block = { boards: [a, { ...c, hidden: true }, b, { caption: 'no url' }, null] };
    expect(historyBoards(block)).toHaveLength(3);
    expect(publicBoards(block).map((x) => x.path)).toEqual(['chalkboard/b.webp', 'chalkboard/a.webp']);
    expect(publicBoards(undefined)).toEqual([]);
    expect(boardDate(b.published_at)).toBe('Fri, Oct 16');
  });
});

describe('admin: past boards', () => {
  const renderAdmin = () =>
    render(
      <MemoryRouter initialEntries={['/admin/chalkboard']}>
        <ToastProvider><UnsavedProvider><ChalkboardManager /></UnsavedProvider></ToastProvider>
      </MemoryRouter>
    );
  const current = { enabled: true, url: 'https://cdn.test/now.webp', path: 'chalkboard/1760000000000-now.webp', caption: 'Today', updated_at: iso(), max_age_days: 3 };
  const older = { id: 'chalkboard/1759000000000-old.webp', url: 'https://cdn.test/old.webp', path: 'chalkboard/1759000000000-old.webp', caption: 'Blurry one', published_at: '2026-10-01T12:00:00Z', hidden: false };

  it('lists past boards; hiding one is staged until the button, and keeps the file', async () => {
    stored = current;
    storedHistory = { boards: [entryFor(current), older] };
    renderAdmin();
    const hide = await screen.findByRole('button', { name: /hide the board from thu, oct 1 from the website/i });
    expect(screen.getByText('On the homepage now')).toBeTruthy();
    fireEvent.click(hide);
    expect(screen.getByText(/hidden once you publish/i)).toBeTruthy();
    expect(upsert).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /update past boards on the website/i }));
    expect(await screen.findByText(/past boards are up to date/i)).toBeTruthy();
    expect(upsertsFor('chalkboard_photo')).toHaveLength(0); // the homepage photo is untouched
    const boards = upsertsFor('chalkboard_history')[0][0].data.boards;
    expect(boards.map((x) => [x.path, x.hidden])).toEqual([[current.path, false], [older.path, true]]);
    expect(deleteMedia).not.toHaveBeenCalled();
    expect(screen.getByText('Hidden from the website')).toBeTruthy();
  });

  it('un-hiding back to how it was is not a change', async () => {
    stored = current;
    storedHistory = { boards: [entryFor(current), older] };
    renderAdmin();
    fireEvent.click(await screen.findByRole('button', { name: /hide the board from thu, oct 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /show the board from thu, oct 1/i }));
    expect(screen.queryByRole('button', { name: /update past boards/i })).toBeNull();
  });

  it('"Find older board photos" stages photos still in storage, dated from their file names', async () => {
    stored = current;
    storedHistory = { boards: [entryFor(current)] };
    listMedia.mockResolvedValueOnce([
      { name: '1760000000000-now.webp', path: current.path, url: current.url },
      { name: '1759000000000-old.webp', path: older.path, url: older.url },
    ]);
    renderAdmin();
    fireEvent.click(await screen.findByRole('button', { name: /find older board photos/i }));
    expect(await screen.findByText(/found — added when you publish/i)).toBeTruthy();
    expect(listMedia).toHaveBeenCalledWith('chalkboard');
    expect(upsert).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /update past boards on the website/i }));
    await screen.findByText(/past boards are up to date/i);
    const boards = upsertsFor('chalkboard_history')[0][0].data.boards;
    expect(boards.map((x) => x.path)).toEqual([current.path, older.path]);
    expect(boards[1].published_at).toBe(new Date(1759000000000).toISOString());
  });
});

describe('public: past boards flip-through', () => {
  const B = (n, day, extra) => ({ url: `https://cdn.test/${n}.webp`, path: `chalkboard/${n}.webp`, caption: `Board ${n}`, published_at: `2026-10-${day}T14:00:00Z`, ...extra });
  const withHistory = (boards, photo = { enabled: true, url: PHOTO, updated_at: iso() }) =>
    getContentBlock.mockImplementation(async (key) => (key === 'chalkboard_history' ? { boards } : photo));
  const renderHero = () => render(<MemoryRouter><PastryCaseHero /></MemoryRouter>);

  it('is only offered with two or more (public) past boards', async () => {
    withHistory([B(1, 10), B(2, 12, { hidden: true })]);
    renderHero();
    await waitFor(() => expect(getContentBlock).toHaveBeenCalledWith('chalkboard_history'));
    await screen.findByRole('img', { name: /chalkboard/i });
    expect(screen.queryByRole('button', { name: /see past boards/i })).toBeNull();
    cleanup();

    withHistory([B(1, 10), B(2, 12)]);
    renderHero();
    expect(await screen.findByRole('button', { name: /see past boards/i })).toBeTruthy();
    cleanup();

    // under the drawn board too
    withHistory([B(1, 10), B(2, 12)], {});
    renderHero();
    expect(await screen.findByRole('button', { name: /see past boards/i })).toBeTruthy();
    expect(await screen.findByText('Sips')).toBeTruthy();
  });

  it('flips with the keyboard, newest first, with date and caption; Esc closes and hands focus back', async () => {
    withHistory([B(1, 10), B(3, 16), B(2, 12)]);
    renderHero();
    const open = await screen.findByRole('button', { name: /see past boards/i });
    open.focus();
    fireEvent.click(open);
    const dialog = screen.getByRole('dialog', { name: /past boards/i });
    const img = () => dialog.querySelector('img');
    expect(screen.getByText('1 of 3')).toBeTruthy();
    expect(img().getAttribute('src')).toBe('https://cdn.test/3.webp');
    expect(img().getAttribute('loading')).toBe('lazy');
    expect(dialog.querySelectorAll('img')).toHaveLength(1); // only the top board loads
    expect(screen.getByText('Fri, Oct 16')).toBeTruthy();
    expect(screen.getByText('Board 3')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Newer board' }).disabled).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: /close past boards/i }));

    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(screen.getByText('2 of 3')).toBeTruthy();
    expect(img().getAttribute('src')).toBe('https://cdn.test/2.webp');
    expect(screen.getByText('Mon, Oct 12')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'End' });
    expect(screen.getByText('3 of 3')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Older board' }).disabled).toBe(true);
    fireEvent.keyDown(document, { key: 'ArrowRight' }); // already the oldest
    expect(screen.getByText('3 of 3')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'ArrowLeft' });
    expect(screen.getByText('2 of 3')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Home' });
    expect(screen.getByText('1 of 3')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Older board' }));
    expect(screen.getByText('2 of 3')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(open);
  });

  it('swipes: left for older, right for newer; a vertical drag does nothing', async () => {
    // jsdom has no PointerEvent; a MouseEvent carries the clientX/Y we need
    const hadPointer = 'PointerEvent' in window;
    if (!hadPointer) window.PointerEvent = class PointerEvent extends MouseEvent {};
    withHistory([B(1, 10), B(2, 12)]);
    renderHero();
    fireEvent.click(await screen.findByRole('button', { name: /see past boards/i }));
    const stack = document.querySelector('.pastb__stack');
    const swipe = (x0, x1, y0 = 100, y1 = 100) => {
      fireEvent.pointerDown(stack, { clientX: x0, clientY: y0 });
      fireEvent.pointerUp(stack, { clientX: x1, clientY: y1 });
    };
    swipe(300, 120);
    expect(screen.getByText('2 of 2')).toBeTruthy();
    swipe(200, 210, 100, 400);
    expect(screen.getByText('2 of 2')).toBeTruthy();
    swipe(100, 300);
    expect(screen.getByText('1 of 2')).toBeTruthy();
    if (!hadPointer) delete window.PointerEvent;
  });

  it('/chalkboard lists the boards by month, or says the archive is still filling up', async () => {
    const ChalkboardPage = (await import('../src/pages/ChalkboardPage.jsx')).default;
    withHistory([B(1, 10), B(2, 12), { ...B(9, 10), published_at: '2025-11-02T14:00:00Z' }]);
    render(<MemoryRouter><ChalkboardPage /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'October 2026' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'November 2025' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /our chalkboard on sat, oct 10/i }));
    expect(screen.getByText('2 of 3')).toBeTruthy();
    cleanup();

    withHistory([B(1, 10)]);
    render(<MemoryRouter><ChalkboardPage /></MemoryRouter>);
    expect(await screen.findByText(/archive fills up/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /flip through/i })).toBeNull();
  });
});
